import { useEffect, useState } from 'react'
import { ClipboardList, Plus, Copy } from 'lucide-react'
import { getTemplates, upsertTemplate, deleteTemplate, upsertWorkpaper } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import { DOMAINS } from '../constants'
import PageHeader from '../components/PageHeader'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/FormField'

// [SAMPLE] — pre-built test programmes per domain
const BASE_TEMPLATES = [
  { domain:'LA', template_name:'User access review — quarterly', objectives:'Verify user access is reviewed and certified quarterly by appropriate managers. Confirm no inappropriate access retained.', test_steps:JSON.stringify([{step:1,action:'Obtain user access listing IPE — validate completeness against HR headcount'},{step:2,action:'Select sample per AS 2315 (quarterly high-risk: 2 items)'},{step:3,action:'For each sample: verify reviewer is appropriate manager, review was completed timely, no terminated users certified as active'},{step:4,action:'Test for terminated users: cross-reference HR termination list to access listing'}]), attributes:JSON.stringify(['Access certified by appropriate manager','Review completed within SLA','No terminated users with active access','No SoD conflicts in certified access']) },
  { domain:'LA', template_name:'User provisioning — per event', objectives:'Verify new user access is requested, approved, and provisioned per the access request policy.', test_steps:JSON.stringify([{step:1,action:'Obtain access request tickets for the period'},{step:2,action:'Select sample per AS 2315'},{step:3,action:'Verify: request approved before access granted, approver has authority, access matches job role, SoD not violated'}]), attributes:JSON.stringify(['Pre-approval obtained','Approver has authority','Access matches job role','No SoD conflict']) },
  { domain:'CM', template_name:'Change authorization — per event', objectives:'Verify all changes to in-scope systems are authorized, tested, and approved before deployment to production.', test_steps:JSON.stringify([{step:1,action:'Obtain change log from ITSM tool for the period'},{step:2,action:'Select sample of normal and emergency changes'},{step:3,action:'Verify: approval timestamp before deployment, UAT sign-off exists, developer did not deploy own code'}]), attributes:JSON.stringify(['Approval before deployment','UAT sign-off present','Developer ≠ deployer (SoD)','Emergency change retrospectively approved']) },
  { domain:'CO', template_name:'Batch job monitoring — daily', objectives:'Verify batch jobs are monitored and failures are identified and resolved timely.', test_steps:JSON.stringify([{step:1,action:'Obtain batch job execution logs for the period'},{step:2,action:'Select sample of days including any failure days'},{step:3,action:'Verify: all failures have incident tickets, resolution within SLA, no unresolved failures affecting financial data'}]), attributes:JSON.stringify(['All failures have incident tickets','Resolution within SLA','Financial data completeness confirmed']) },
  { domain:'JE', template_name:'JE testing — fraud risk procedure', objectives:'Comply with AS 2110.61 JE fraud risk procedures. Test completeness of population, segment by risk, test high-risk entries.', test_steps:JSON.stringify([{step:1,action:'Obtain JE population from GL — validate as IPE against trial balance'},{step:2,action:'Segment: after-hours, period-end, round-dollar, new preparer'},{step:3,action:'Test all high-risk segment items or 40+, whichever is less'},{step:4,action:'For each: verify supporting documentation, preparer ≠ approver, business purpose documented'}]), attributes:JSON.stringify(['Support obtained','Preparer ≠ approver','Business purpose documented','No fraud indicators']) },
]

const BLANK = { domain:'LA', template_name:'', objectives:'', test_steps:'', attributes:'' }

export default function Templates() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding]   = useState(false)
  const [confirmSeed, setConfirmSeed] = useState(false)

  const load = () => getTemplates(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }

  const save = async () => {
    if (!form.template_name.trim()) { toast({type:'warning',title:'Template name required', description:'Enter a name before saving'}); return }
    setSaving(true)
    await upsertTemplate({...form, programme_id:programmeId})
    toast({type:'success',title:'Template saved'}); setModal(false); load()
    setSaving(false)
  }

  const seedBase = async () => {
    if (rows.length > 0 && !confirmSeed) { setConfirmSeed(true); return }
    setConfirmSeed(false)
    setSeeding(true)
    await Promise.all(BASE_TEMPLATES.map(t=>upsertTemplate({...t, programme_id:programmeId})))
    toast({type:'success',title:'Base templates seeded — marked SAMPLE, review before use'}); load()
    setSeeding(false)
  }

  const applyToWorkpaper = async (t) => {
    try {
      const attrs = (() => { try { return JSON.parse(t.attributes||'[]') } catch { return [] } })()
      const result = await upsertWorkpaper({
        programme_id:programmeId,
        domain:t.domain,
        control_title:t.template_name,
        conclusion:'',
        status:'Not Started',
        preparer:'',
        reviewer:'',
        ipe_validated:false,
        population_cnt:null,
        population_src:'',
      })
      if (result) toast({type:'success',title:'Workpaper created from template', description:`${t.domain} — ${t.template_name}`})
      else toast({type:'error',title:'Failed to create workpaper'})
    } catch(e) {
      toast({type:'error',title:'Error',description:e.message})
    }
  }

  const cols = [
    {key:'domain',label:'Domain',render:r=><span className={`badge badge-${r.domain==='LA'?'blue':r.domain==='CM'?'green':r.domain==='CO'?'amber':r.domain==='PD'?'purple':'red'}`}>{r.domain}</span>},
    {key:'template_name',label:'Template name'},
    {key:'objectives',label:'Objectives',render:r=><span className="text-xs text-gray-400 line-clamp-1">{r.objectives}</span>},
    {key:'apply',label:'',render:r=><button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();applyToWorkpaper(r)}}><Copy size={12}/>Use</button>},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><ClipboardList size={12}/>Templates</>} title="Audit programme templates"
        subtitle="Pre-built test programmes per domain. Click 'Use' to create a workpaper from a template."
        actions={isAuditor&&<div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={seedBase} disabled={seeding}>Seed base templates</button>
          <button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New template</button>
        </div>} />
      <div className="alert-info mb-4"><span className="text-sm">Base templates are marked SAMPLE — review and customise for your engagement before use. Test steps and attributes are editable per engagement.</span></div>
      {confirmSeed && (
        <div className="alert-warn mb-4 flex items-center justify-between">
          <span className="text-sm"><strong>Templates already exist.</strong> Seed base templates again?</span>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn btn-outline btn-sm" onClick={()=>setConfirmSeed(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={seedBase}>Yes, seed</button>
          </div>
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteTemplate(id).then(load):null} emptyMsg="No templates. Seed base templates or create your own."/>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Audit programme template" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain"><Select value={form.domain} onChange={set('domain')} options={DOMAINS.map(d=>({value:d.id,label:d.id+' — '+d.label}))}/></Field>
          <Field label="Template name"><Input value={form.template_name} onChange={set('template_name')} placeholder="User access review — quarterly" maxLength={100}/></Field>
        </div>
        <Field label="Objectives"><Textarea value={form.objectives} onChange={set('objectives')} maxLength={500}/></Field>
        <Field label="Test steps (one per line)"><Textarea value={form.test_steps} onChange={set('test_steps')} className="min-h-[100px]" maxLength={2000}/></Field>
        <Field label="Test attributes (one per line)"><Textarea value={form.attributes} onChange={set('attributes')} maxLength={500}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
