import { useEffect, useState } from 'react'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { getSoDConflicts, upsertSoDConflict, deleteSoDConflict, getSoDMitigations, upsertSoDMitigation } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK_C = { role_a:'', role_b:'', conflict_type:'', risk_level:'High', users_affected:[], status:'Open' }
const BLANK_M = { control_desc:'', owner:'', frequency:'monthly', evidence_req:'', tested:false, effective:null }
const CONFLICT_TYPES = ['AP entry + AP approval','Developer + Prod access','JE preparer + JE approver','Vendor create + Payment approve','GL entry + GL approval','User admin + Any financial role','Custom']

export default function SoDMatrix() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]     = useState([])
  const [mitigations, setMitigations] = useState([])
  const [activeConflict, setActiveConflict] = useState(null)
  const [modal, setModal]   = useState(false)
  const [mitModal, setMitModal] = useState(false)
  const [form, setForm]     = useState(BLANK_C)
  const [mitForm, setMitForm] = useState(BLANK_M)
  const [saving, setSaving] = useState(false)

  const load = () => getSoDConflicts(programmeId).then(d=>setRows(d||[]))
  const loadMit = (id) => { setActiveConflict(id); getSoDMitigations(id).then(d=>setMitigations(d||[])) }
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const setm = k => e => setMitForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK_C) => { setForm({...BLANK_C,...r}); setModal(true) }

  const save = async () => {
    if (!form.role_a||!form.role_b) { toast({type:'warning',title:'Both roles required'}); return }
    setSaving(true)
    await upsertSoDConflict({...form, programme_id:programmeId})
    toast({type:'success',title:'Saved'}); setModal(false); load()
    setSaving(false)
  }
  const saveMit = async () => {
    setSaving(true)
    await upsertSoDMitigation({...mitForm, conflict_id:activeConflict, programme_id:programmeId})
    toast({type:'success',title:'Mitigation saved'}); setMitModal(false); loadMit(activeConflict)
    setSaving(false)
  }

  const cols = [
    {key:'role_a',label:'Role A'},{key:'role_b',label:'Role B'},
    {key:'conflict_type',label:'Conflict type',render:r=><span className="text-xs text-gray-500">{r.conflict_type}</span>},
    {key:'risk_level',label:'Risk',render:r=><span className={`badge ${r.risk_level==='High'?'badge-red':r.risk_level==='Medium'?'badge-amber':'badge-green'}`}>{r.risk_level}</span>},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Open'?'badge-red':'badge-green'}`}>{r.status}</span>},
    {key:'mit',label:'Mitigations',render:r=><button className="text-xs text-brand-600 underline" onClick={e=>{e.stopPropagation();loadMit(r.id);setMitModal(true)}}>View</button>},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><ArrowLeftRight size={12}/>Execute · SoD</>} title="Segregation of duties matrix"
        subtitle="Document SoD conflicts, affected users, and compensating controls per AS 2201 Para .26."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add conflict</button>} />
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteSoDConflict(id).then(load):null} emptyMsg="No SoD conflicts documented."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="SoD conflict">
        <Field label="Role A (has access to…)"><Input placeholder="AP Invoice Entry" value={form.role_a} onChange={set('role_a')} maxLength={80}/></Field>
        <Field label="Role B (also has access to…)"><Input placeholder="AP Payment Approval" value={form.role_b} onChange={set('role_b')} maxLength={80}/></Field>
        <Field label="Conflict type"><Select value={form.conflict_type} onChange={set('conflict_type')} options={[{value:'',label:'Select or describe…'},...CONFLICT_TYPES.map(c=>({value:c,label:c}))]}/></Field>
        <Field label="Risk level"><Select value={form.risk_level} onChange={set('risk_level')} options={['High','Medium','Low']}/></Field>
        <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Open','Mitigated','Remediated']}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={mitModal} onClose={()=>setMitModal(false)} title="Compensating controls / mitigations" size="max-w-2xl">
        <RecordTable cols={[{key:'control_desc',label:'Control'},{key:'owner',label:'Owner'},{key:'tested',label:'Tested',render:r=><span className={`badge ${r.tested?'badge-green':'badge-gray'}`}>{r.tested?'Yes':'No'}</span>},{key:'effective',label:'Effective',render:r=>r.effective===null?'—':<span className={`badge ${r.effective?'badge-green':'badge-red'}`}>{r.effective?'Yes':'No'}</span>}]} rows={mitigations} emptyMsg="No mitigations yet."/>
        {isAuditor&&<>
          <div className="divider"/>
          <h4 className="text-sm font-semibold mb-3">Add mitigation</h4>
          <Field label="Compensating control description"><Textarea value={mitForm.control_desc} onChange={setm('control_desc')} placeholder="Management reviews all AP payments monthly — signed exception report" maxLength={300}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner"><Input value={mitForm.owner} onChange={setm('owner')} maxLength={60}/></Field>
            <Field label="Frequency"><Select value={mitForm.frequency} onChange={setm('frequency')} options={['daily','weekly','monthly','quarterly','annual']}/></Field>
          </div>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mitForm.tested} onChange={setm('tested')}/> Tested</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mitForm.effective===true} onChange={e=>setMitForm(f=>({...f,effective:e.target.checked?true:null}))}/> Effective</label>
          </div>
          <div className="flex justify-end"><button className="btn btn-primary btn-sm" onClick={saveMit} disabled={saving}>Add mitigation</button></div>
        </>}
      </Modal>
    </div>
  )
}
