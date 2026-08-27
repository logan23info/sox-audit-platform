import { useEffect, useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { getRemediations, upsertRemediation, deleteRemediation, getDeficiencies } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { REMEDIATION_STATUSES, CLASSIFICATION_LABELS } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { deficiency_id:'', action:'', root_cause_addr:'', owner_role:'', target_date:'', completed_date:'', status:'Not Started', retest_required:true, retest_date:'', retest_result:'', notes:'' }

export default function Remediation() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [defs, setDefs]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getRemediations(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId){ load(); getDeficiencies(programmeId).then(d=>setDefs(d||[])) } },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }
  const save = async () => {
    if (!form.action) { toast({type:'warning',title:'Action required'}); return }
    setSaving(true)
    await upsertRemediation({...form, programme_id:programmeId})
    toast({type:'success',title:'Saved'}); setModal(false); load()
    setSaving(false)
  }

  const statusColor = s => s==='Closed'?'badge-green':s==='Implemented'?'badge-blue':s==='In Progress'?'badge-amber':'badge-gray'
  const cols = [
    {key:'deficiency_id',label:'Deficiency',render:r=>{const d=defs.find(x=>x.id===r.deficiency_id); return d?<span className="mono text-xs">{d.ref}</span>:'—'}},
    {key:'action',label:'Remediation action',render:r=><span className="line-clamp-2 text-xs">{r.action}</span>},
    {key:'owner_role',label:'Owner'},{key:'target_date',label:'Target date'},
    {key:'status',label:'Status',render:r=><span className={`badge ${statusColor(r.status)}`}>{r.status}</span>},
    {key:'retest_result',label:'Re-test',render:r=>r.retest_result?<span className={`badge ${r.retest_result==='Pass'?'badge-green':'badge-red'}`}>{r.retest_result}</span>:'—'},
  ]

  const openCount = rows.filter(r=>r.status!=='Closed').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow="Manage · Remediation" title="Remediation tracker"
        subtitle={`${openCount} open · Re-testing required before MW/SD can be closed`}
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add action</button>} />
      <div className="alert-info mb-4"><span className="text-sm">MW: min 90–180 days operation before re-test. SD: 60–90 days. CD: 1 full cycle. Root cause must be addressed — not just symptoms.</span></div>
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteRemediation(id).then(load):null} emptyMsg="No remediation actions. Add from deficiency log."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Remediation action" size="max-w-2xl">
        <Field label="Linked deficiency"><Select value={form.deficiency_id||''} onChange={set('deficiency_id')} options={[{value:'',label:'Select deficiency…'},...defs.map(d=>({value:d.id,label:d.ref+' — '+(CLASSIFICATION_LABELS[d.classification]||d.classification)}))]}/></Field>
        <Field label="Remediation action"><Textarea value={form.action} onChange={set('action')} placeholder="Implement automated deprovisioning workflow triggered on HR termination event. Remove manual deprovisioning dependency." maxLength={500}/></Field>
        <Field label="Root cause addressed"><Textarea value={form.root_cause_addr} onChange={set('root_cause_addr')} placeholder="Root cause: no HR-IT system integration. Fix: Okta SCIM provisioning connected to Workday HR." maxLength={300}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner role"><Input placeholder="IT Security / Controller" value={form.owner_role} onChange={set('owner_role')} maxLength={60}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={REMEDIATION_STATUSES}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target date"><Input type="date" value={form.target_date||''} onChange={set('target_date')}/></Field>
          <Field label="Completed date"><Input type="date" value={form.completed_date||''} onChange={set('completed_date')}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3"><input type="checkbox" checked={form.retest_required} onChange={set('retest_required')}/> Re-testing required</label>
        {form.retest_required&&(
          <div className="grid grid-cols-2 gap-3">
            <Field label="Re-test date"><Input type="date" value={form.retest_date||''} onChange={set('retest_date')}/></Field>
            <Field label="Re-test result"><Select value={form.retest_result||''} onChange={set('retest_result')} options={[{value:'',label:'Pending'},{value:'Pass',label:'Pass'},{value:'Fail',label:'Fail'}]}/></Field>
          </div>
        )}
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
