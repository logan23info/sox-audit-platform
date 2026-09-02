import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Bot, Loader, CheckCircle } from 'lucide-react'
import { getFindings, upsertFinding, deleteFinding, getRCM, callAI, upsertDeficiency } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { DOMAINS, AI_CLASSIFICATIONS, AI_SEVERITIES, DEFICIENCY_TRUTH_TABLE } from '../../constants'
import PageHeader from '../../components/PageHeader'
import EvidenceUpload from '../../components/EvidenceUpload'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { control_id:'', domain:'LA', title:'', condition:'', criteria:'', cause:'', consequence:'', evidence_excerpt:'', root_cause:'', classification:'', severity:'', is_draft:true }

const SOX_SYSTEM_PROMPT = `[ROLE] SOX ITGC Lead Auditor embedded in audit platform.
[SOURCE OF TRUTH] Use ONLY the evidence text provided — no prior knowledge substitution.
[DETERMINISM] Temperature 0.1. Return INSUFFICIENT_EVIDENCE if evidence is ambiguous or incomplete.
[OUTPUT] JSON only, no markdown, no preamble.
[4Cs FORMAT] audit_finding must follow: "CONDITION: [what was found]. CRITERIA: [what should exist per control objective]. CAUSE: [root cause of gap]. CONSEQUENCE: [financial reporting risk if unaddressed]."
[SCHEMA] {"assessment":{"control_id":"","domain":"","classification":"Conforming|Minor NC|Major NC|Observation|OFI|INSUFFICIENT_EVIDENCE","severity":"Low|Medium|High|Critical|N/A","confidence":0.0,"evidence_excerpt":""},"audit_finding":"4Cs format — Condition/Criteria/Cause/Consequence","root_cause":"required for any NC","corrective_actions":[{"step":1,"action":"","target_role":"","sla_days":0,"verification_required":true}],"prompt_version":"sox-v2","model":"","retrieved_context_ids":[],"timestamp":""}
[CONSTRAINTS] root_cause required for any NC. DRAFT — human sign-off required. Never state output is final.`

const classify2deficiency = (classification) => {
  if (classification==='Major NC') return 'MW'
  if (classification==='Minor NC') return 'SD'
  if (classification==='Observation') return 'CD'
  return null
}

export default function Findings() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [rcm, setRcm]     = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [aiOutput, setAiOutput] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [evidenceText, setEvidenceText] = useState('')

  const load = () => getFindings(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId){ load(); getRCM(programmeId).then(d=>setRcm(d||[])) } },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setAiOutput(r.ai_output||null); setEvidenceText(r.evidence_excerpt||''); setModal(true) }

  const runAI = async () => {
    if (!evidenceText.trim()||!form.control_id) { toast({type:'warning',title:'Enter evidence text and select a control'}); return }
    setAiLoading(true)
    try {
      const ctrl = rcm.find(r=>r.control_id===form.control_id)
      const userMsg = `Control: ${form.control_id} — ${ctrl?.control_title||form.domain}
Domain: ${form.domain}
Evidence provided by auditor:
${evidenceText}

Assess this evidence against the control objective. Return JSON schema exactly.`
      const res = await callAI({ systemPrompt:SOX_SYSTEM_PROMPT, userMessage:userMsg })
      if (!res.text?.trim()) throw new Error('Empty response from AI')
      const clean = res.text.replace(/```json|```/g,'').replace(/^[^{]*/,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) }
      catch { throw new Error('AI returned non-JSON: ' + clean.slice(0,100)) }
      parsed.model = res.model; parsed.timestamp = res.timestamp
      setAiOutput(parsed)
      setForm(f=>({...f, classification:parsed.assessment?.classification||'', severity:parsed.assessment?.severity||'', condition:parsed.audit_finding||'', root_cause:parsed.root_cause||'', evidence_excerpt:parsed.assessment?.evidence_excerpt||evidenceText }))
      toast({type:'success',title:'AI assessment complete — review as DRAFT'})
    } catch(e) {
      toast({type:'error',title:'AI error',description:e.message})
    }
    setAiLoading(false)
  }

  const save = async () => {
    if (!form.title||!form.domain) { toast({type:'warning',title:'Title and domain required'}); return }
    setSaving(true)
    const f = await upsertFinding({...form, programme_id:programmeId, ai_output:aiOutput, evidence_excerpt:evidenceText})
    // Auto-create deficiency log entry for NC findings
    if (f && !form.is_draft && form.classification && classify2deficiency(form.classification)) {
      const defClass = classify2deficiency(form.classification)
      const tt = DEFICIENCY_TRUTH_TABLE.find(t=>t.classification===defClass)
      await upsertDeficiency({
        programme_id:programmeId, finding_id:f.id,
        ref:`DEF-${Date.now().toString().slice(-4)}`,
        classification:defClass,
        audit_comm_req:tt?.auditComm||false,
        public_disc_req:tt?.publicDisclose||false,
        status:'Open'
      })
    }
    toast({type:'success',title:'Finding saved'}); setModal(false); load()
    setSaving(false)
  }

  const classColor = c => c==='Major NC'||c==='MW'?'badge-red':c==='Minor NC'||c==='SD'?'badge-amber':c==='Conforming'?'badge-green':'badge-gray'
  const cols = [
    {key:'control_id',label:'Control',render:r=><span className="mono">{r.control_id}</span>},
    {key:'domain',label:'Domain',render:r=><span className={`badge badge-${r.domain==='LA'?'blue':r.domain==='CM'?'green':r.domain==='CO'?'amber':r.domain==='PD'?'purple':'red'}`}>{r.domain}</span>},
    {key:'title',label:'Finding title'},
    {key:'classification',label:'Classification',render:r=>r.classification?<span className={`badge ${classColor(r.classification)}`}>{r.classification}</span>:'—'},
    {key:'severity',label:'Severity',render:r=>r.severity?<span className="text-xs text-gray-500">{r.severity}</span>:'—'},
    {key:'is_draft',label:'Status',render:r=><span className={`badge ${r.is_draft?'badge-amber':'badge-green'}`}>{r.is_draft?'DRAFT':'Signed off'}</span>},
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader eyebrow={<><AlertTriangle size={12}/>Execute · Findings</>} title="Finding register"
        subtitle={`${rows.length} findings · AS 2201 · AI assessment — all outputs are DRAFT pending human sign-off`}
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New finding</button>} />

      {rows.filter(r=>r.classification==='Major NC').length>0&&(
        <div className="alert-danger mb-4"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5"/><div><strong>{rows.filter(r=>r.classification==='Major NC').length} Major NC(s)</strong> — evaluate for material weakness per AS 2201.69.</div></div>
      )}

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteFinding(id).then(load):null} emptyMsg="No findings yet."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Finding + AI assessment" size="max-w-3xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain"><Select value={form.domain} onChange={set('domain')} options={DOMAINS.map(d=>({value:d.id,label:d.id+' — '+d.label}))}/></Field>
          <Field label="Control ID"><Select value={form.control_id} onChange={set('control_id')} options={[{value:'',label:'Select…'},...rcm.filter(r=>r.domain===form.domain).map(r=>({value:r.control_id,label:r.control_id+' — '+r.control_title}))]}/></Field>
        </div>
        <Field label="Finding title"><Input value={form.title} onChange={set('title')} placeholder="Terminated users retain access — Q3 access review" maxLength={150}/></Field>

        <div className="divider"/>
        <div className="flex items-center gap-2 mb-2"><Bot size={14} className="text-brand-600"/><span className="text-sm font-semibold">AI assessment</span><span className="badge badge-amber text-xs">DRAFT — requires human sign-off</span></div>
        <Field label="Evidence text (auditor input)" hint="Describe what you found, what evidence you obtained, and any exceptions noted.">
          <Textarea value={evidenceText} onChange={e=>setEvidenceText(e.target.value)} placeholder="During testing of LA-02 quarterly access review, 3 of 25 sampled users had access certified by a reviewer who no longer manages them. One user (departed 45 days prior) had active ERP access…" className="min-h-[100px]" maxLength={2000}/>
        </Field>
        <button className="btn btn-outline btn-sm mb-4" onClick={runAI} disabled={aiLoading||!form.control_id}>
          {aiLoading?<><Loader size={13} className="animate-spin"/>Assessing…</>:<><Bot size={13}/>Run AI assessment</>}
        </button>

        {aiOutput&&(
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-surface-3 border border-gray-200 dark:border-gray-700 mb-4 text-sm space-y-1">
            <div className="flex gap-2 flex-wrap">
              <span className={`badge ${classColor(aiOutput.assessment?.classification)}`}>{aiOutput.assessment?.classification}</span>
              <span className="badge badge-gray">Severity: {aiOutput.assessment?.severity}</span>
              <span className="badge badge-gray">Confidence: {Math.round((aiOutput.assessment?.confidence||0)*100)}%</span>
            </div>
            {aiOutput.audit_finding && (
              <div className="mt-2 space-y-1">
                {aiOutput.audit_finding.split(/(?=CONDITION:|CRITERIA:|CAUSE:|CONSEQUENCE:)/).filter(Boolean).map((part,i)=>{
                  const [label,...rest] = part.split(':')
                  return <p key={i} className="text-xs text-gray-600 dark:text-gray-400"><strong className="text-gray-800 dark:text-gray-200">{label}:</strong>{rest.join(':')}</p>
                })}
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400"><strong>Root cause:</strong> {aiOutput.root_cause}</p>
            {aiOutput.corrective_actions?.slice(0,2).map((a,i)=>(
              <p key={i} className="text-gray-500 text-xs">→ {a.action} ({a.target_role}, {a.sla_days}d)</p>
            ))}
          </div>
        )}

        <div className="divider"/>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Classification (override or AI)"><Select value={form.classification} onChange={set('classification')} options={[{value:'',label:'Select…'},...AI_CLASSIFICATIONS.map(c=>({value:c,label:c}))]}/></Field>
          <Field label="Severity"><Select value={form.severity} onChange={set('severity')} options={[{value:'',label:'Select…'},...AI_SEVERITIES.map(s=>({value:s,label:s}))]}/></Field>
        </div>
        <Field label="Root cause"><Textarea value={form.root_cause} onChange={set('root_cause')} maxLength={500}/></Field>
        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!form.is_draft} onChange={e=>setForm(f=>({...f,is_draft:!e.target.checked}))}/><CheckCircle size={14} className="text-green-500"/> Mark as signed off (removes DRAFT status)</label>
        </div>
        {form.id && <EvidenceUpload programmeId={programmeId} recordId={form.id} label="Supporting evidence files"/>}
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save finding</button></div>
      </Modal>
    </div>
  )
}
