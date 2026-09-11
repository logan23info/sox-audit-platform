import { Globe, Plus } from 'lucide-react'
import { getEntities, upsertEntity, deleteEntity } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useRecords } from '../../hooks/useRecords'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { entity_name:'', entity_type:'Subsidiary', country:'', materiality:'', in_scope:true, notes:'' }
const ENTITY_TYPES = ['Parent','Subsidiary','Division','Joint venture','Branch','Significant component']

export default function MultiEntity() {
  const { isAuditor } = useProgramme()
  const r = useRecords({
    get: getEntities, upsert: upsertEntity, del: deleteEntity,
    blank: BLANK, required: ['entity_name'], label: 'Entity',
  })

  const cols = [
    {key:'entity_name',label:'Entity'},
    {key:'entity_type',label:'Type'},
    {key:'country',label:'Country'},
    {key:'materiality',label:'Materiality ($)',render:x=>x.materiality?`$${Number(x.materiality).toLocaleString()}`:'—'},
    {key:'in_scope',label:'In scope',render:x=><span className={`badge ${x.in_scope?'badge-green':'badge-gray'}`}>{x.in_scope?'Yes':'No'}</span>},
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Globe size={12}/>Plan · Entities</>} title="Multi-entity register"
        subtitle="Document all entities in the SOX scope. Entities can then be assigned to systems in Scoping and to controls in the RCM."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>r.open()}><Plus size={15}/>Add entity</button>} />

      <div className="alert-info mb-4"><span className="text-sm">Entities added here appear as selectable options on the Scoping worksheet and in the Risk &amp; Control Matrix, so scope and controls can be tracked per legal entity.</span></div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={r.rows} onEdit={isAuditor?r.open:null} onDelete={isAuditor?r.remove:null}
          emptyMsg="No entities. Add the parent entity and all significant components."/>
      </div>

      <Modal open={r.modal} onClose={r.close} title="Entity">
        <Field label="Entity name"><Input placeholder="Acme Europe BV" value={r.form.entity_name} onChange={r.set('entity_name')} maxLength={100}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={r.form.entity_type} onChange={r.set('entity_type')} options={ENTITY_TYPES}/></Field>
          <Field label="Country"><Input placeholder="Netherlands" value={r.form.country} onChange={r.set('country')} maxLength={60}/></Field>
        </div>
        <Field label="Materiality threshold ($)"><Input type="number" value={r.form.materiality} onChange={r.set('materiality')}/></Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
          <input type="checkbox" checked={r.form.in_scope} onChange={r.set('in_scope')}/> In scope for ITGC testing
        </label>
        <Field label="Notes"><Textarea value={r.form.notes} onChange={r.set('notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={r.close}>Cancel</button>
          <button className="btn btn-primary" onClick={r.save} disabled={r.saving}>Save</button>
        </div>
      </Modal>
    </div>
  )
}
