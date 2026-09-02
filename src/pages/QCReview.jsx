import { useEffect, useState } from 'react'
import { ShieldCheck, Plus, Bot, Loader } from 'lucide-react'
import { getQCReviews, upsertQCReview, deleteQCReview, getFindings, getDeficiencies, callAI } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/FormField'

// QC 1000 review areas per PCAOB standard
const QC_AREAS = [
  'Risk assessment and audit planning',
  'Significant risks and responses',
  'Internal control over financial reporting',
  'IT General Controls testing',
  'Journal entry fraud risk procedures',
  'IPE validation procedures',
  'Sampling and evidence evaluation',
  'Engagement quality reviewer independence',
  'Supervision and review',
  'Workpaper documentation',
  'Reporting and communication',
]

const BLANK = { reviewer_name:'', reviewer_title:'Engagement Quality Reviewer', review_date:'', areas_reviewed:[], findings:'', conclusion:'', status:'Pending' }

const QC_PROMPT = `[ROLE] PCAOB QC 1000 engagement quality reviewer.
[OUTPUT] JSON only: {"findings":"string — key quality observations","conclusion":"Concur|Do not concur|Concur with modifications","prompt_version":"qc-v1"}
[INSTRUCTIONS] Based on the audit statistics provided, draft quality review findings and conclusion per QC 1000. Flag: untested controls, open MWs, unsigned assertions, IPE gaps. DRAFT — reviewer must sign.`

export default function QCReview() {
  const { programmeId, programme, isLead } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]       = useState([])
  const [findings, setFindings] = useState([])
  const [defs, setDefs]       = useState([])
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const load = () => getQCReviews(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{
    if(!programmeId) return
    load()
    getFindings(programmeId).then(d=>setFindings(d||[]))
    getDeficiencies(programmeId).then(d=>setDefs(d||[]))
  },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r, areas_reviewed:r.areas_reviewed||[]}); setModal(true) }

  const toggleArea = (area) => setForm(f=>({...f, areas_reviewed: f.areas_reviewed.includes(area)?f.areas_reviewed.filter(a=>a!==area):[...f.areas_reviewed, area]}))

  const save = async () => {
    if (!form.reviewer_name) { toast({type:'warning',title:'Reviewer name required'}); return }
    setSaving(true)
    const data = { ...form, programme_id:programmeId }
    if (form.status==='Complete' && !form.signed_at) data.signed_at = new Date().toISOString()
    await upsertQCReview(data)
    toast({type:'success',title:'QC review saved'}); setModal(false); load()
    setSaving(false)
  }

  const runAI = async () => {
    setAiLoading(true)
    try {
      const mw = defs.filter(d=>d.classification==='MW'&&d.status==='Open').length
      const sd = defs.filter(d=>d.classification==='SD'&&d.status==='Open').length
      const msg = `Engagement: ${programme?.name} FY${programme?.fiscal_year}
Findings: ${findings.length} total, ${findings.filter(f=>f.classification==='Major NC').length} Major NC
Deficiencies: ${mw} open MW, ${sd} open SD
Areas reviewed: ${form.areas_reviewed.join(', ')||'Not specified'}`
      const res = await callAI({ systemPrompt:QC_PROMPT, userMessage:msg })
      const clean = res.text.replace(/```json|```/g,'').replace(/^[^{]*/,'').trim()
      const parsed = JSON.parse(clean)
      setForm(f=>({...f, findings:parsed.findings||'', conclusion:parsed.conclusion||''}))
      toast({type:'success',title:'QC draft generated — DRAFT, reviewer must sign'})
    } catch(e) { toast({type:'error',title:'AI error',description:e.message}) }
    setAiLoading(false)
  }

  const conclusionColor = c => c==='Concur'?'badge-green':c==='Do not concur'?'badge-red':c==='Concur with modifications'?'badge-amber':'badge-gray'

  const cols = [
    {key:'reviewer_name',label:'Reviewer'},{key:'reviewer_title',label:'Title'},
    {key:'review_date',label:'Date'},
    {key:'conclusion',label:'Conclusion',render:r=>r.conclusion?<span className={`badge ${conclusionColor(r.conclusion)}`}>{r.conclusion}</span>:'—'},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Complete'?'badge-green':r.status==='In Progress'?'badge-blue':'badge-gray'}`}>{r.status}</span>},
    {key:'signed_at',label:'Signed',render:r=>r.signed_at?<span className="text-xs text-green-600">✓ {new Date(r.signed_at).toLocaleDateString()}</span>:'—'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><ShieldCheck size={12}/>QC Review</>} title="QC 1000 engagement quality review"
        subtitle="PCAOB QC 1000 — engagement quality reviewer must concur before report issuance."
        actions={isLead&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New QC review</button>} />

      <div className="alert-info mb-4"><span className="text-sm">Per QC 1000 (effective 15 Dec 2026): EQR must be completed before the engagement report is signed. EQR must be independent of the engagement team.</span></div>

      <div className="card p-0 overflow-hidden mb-6">
        <RecordTable cols={cols} rows={rows} onEdit={isLead?open:null} onDelete={isLead?id=>deleteQCReview(id).then(load):null} emptyMsg="No QC reviews. Create one before issuing the audit report."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="QC 1000 engagement quality review" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="EQR name"><Input value={form.reviewer_name} onChange={set('reviewer_name')} placeholder="Partner / Senior Manager" maxLength={80}/></Field>
          <Field label="Title"><Input value={form.reviewer_title} onChange={set('reviewer_title')} maxLength={80}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Review date"><Input type="date" value={form.review_date||''} onChange={set('review_date')}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Pending','In Progress','Complete']}/></Field>
        </div>

        <Field label="Areas reviewed (QC 1000 scope)">
          <div className="grid grid-cols-1 gap-1 mt-1 max-h-40 overflow-y-auto">
            {QC_AREAS.map(a=>(
              <label key={a} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:hover:bg-dark-surface-3">
                <input type="checkbox" checked={form.areas_reviewed.includes(a)} onChange={()=>toggleArea(a)}/>
                {a}
              </label>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">QC findings</label>
          <button className="btn btn-outline btn-sm" onClick={runAI} disabled={aiLoading}>
            {aiLoading?<><Loader size={12} className="animate-spin"/>Drafting…</>:<><Bot size={12}/>AI draft</>}
          </button>
        </div>
        <Textarea value={form.findings||''} onChange={set('findings')} placeholder="Document quality observations, exceptions noted, areas requiring follow-up…" maxLength={2000} className="min-h-[100px] mb-4"/>

        <Field label="Conclusion">
          <Select value={form.conclusion||''} onChange={set('conclusion')} options={[{value:'',label:'Select…'},{value:'Concur',label:'Concur — no matters preventing issuance'},{value:'Concur with modifications',label:'Concur with modifications'},{value:'Do not concur',label:'Do not concur — report should not be issued'}]}/>
        </Field>

        {form.conclusion==='Do not concur'&&<div className="alert-danger mb-3"><span className="text-sm font-medium">Do not concur — engagement report must not be issued until matters are resolved per QC 1000.</span></div>}

        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save{form.status==='Complete'?' & sign':''}</button></div>
      </Modal>
    </div>
  )
}
