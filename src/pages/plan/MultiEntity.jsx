import { useEffect, useState } from 'react'
import { Globe, Plus } from 'lucide-react'
import { getEntities, upsertEntity, deleteEntity } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { entity_name:'', entity_type:'Subsidiary', country:'', materiality:'', in_scope:true, notes:'' }
const ENTITY_TYPES = ['Parent','Subsidiary','Division','Joint venture','Branch','Significant component']

export default function MultiEntity() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getEntities(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])
  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }
  const save = async () => {
    if (!form.entity_name) { toast({type:'warning',title:'Entity name required'}); return }
    setSaving(true)
    await upsertEntity({...form, programme_id:programmeId})
    toast({type:'success',title:'Entity saved'}); setModal(false); load()
    setSaving(false)
  }

  const cols = [
    {key:'entity_name',label:'Entity'},{key:'entity_type',label:'Type'},{key:'country',label:'Country'},
    {key:'materiality',label:'Materiality ($)',render:r=>r.materiality?`$${Number(r.materiality).toLocaleString()}`:'—'},
    {key:'in_scope',label:'In scope',render:r=><span className={`badge ${r.in_scope?'badge-green':'badge-gray'}`}>{r.in_scope?'Yes':'No'}</span>},
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Globe size={12}/>Plan · Entities</>} title="Multi-entity register"
        subtitle="Document all entities in the SOX scope. Controls can be scoped per entity."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add entity</button>} />
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteEntity(id).then(load):null} emptyMsg="No entities. Add the parent entity and all significant components."/>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Entity">
        <Field label="Entity name"><Input placeholder="Acme Europe BV" value={form.entity_name} onChange={set('entity_name')} maxLength={100}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={form.entity_type} onChange={set('entity_type')} options={ENTITY_TYPES}/></Field>
          <Field label="Country"><Input placeholder="Netherlands" value={form.country} onChange={set('country')} maxLength={60}/></Field>
        </div>
        <Field label="Materiality threshold ($)"><Input type="number" value={form.materiality} onChange={set('materiality')}/></Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={form.in_scope} onChange={set('in_scope')}/> In scope for ITGC testing</label>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
