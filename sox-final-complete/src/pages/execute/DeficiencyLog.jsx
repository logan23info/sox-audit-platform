import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { getDeficiencies, upsertDeficiency, deleteDeficiency } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { CLASSIFICATIONS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS, DEFICIENCY_TRUTH_TABLE, REMEDIATION_STATUSES } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { ref:'', classification:'CD', likelihood:'remote', magnitude:'any', design_or_op:'Operating', audit_comm_req:false, public_disc_req:false, comm_date:'', status:'Open', notes:'' }
const LIKELIHOODS = ['remote','more_than_remote','reasonably_possible','design_gap']
const MAGNITUDES  = ['any','not_material','material']

export default function DeficiencyLog() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getDeficiencies(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => {
    const v = e.target.type==='checkbox'?e.target.checked:e.target.value
    setForm(f => {
      const n={...f,[k]:v}
      const tt = DEFICIENCY_TRUTH_TABLE.find(t=>t.likelihood===n.likelihood&&(t.magnitude===n.magnitude||t.magnitude==='any'))
      if(tt) { n.classification=tt.classification; n.audit_comm_req=tt.auditComm; n.public_disc_req=tt.publicDisclose }
      return n
    })
  }

  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }

  const save = async () => {
    if (!form.ref||!form.classification) { toast({type:'warning',title:'Ref and classification required'}); return }
    setSaving(true)
    await upsertDeficiency({...form, programme_id:programmeId})
    toast({type:'success',title:'Saved'}); setModal(false); load()
    setSaving(false)
  }

  const mwCount = rows.filter(r=>r.classification==='MW'&&r.status==='Open').length
  const sdCount = rows.filter(r=>r.classification==='SD'&&r.status==='Open').length

  const cols = [
    {key:'ref',label:'Ref',render:r=><span className="mono">{r.ref}</span>},
    {key:'classification',label:'Classification',render:r=><span className={`badge badge-${CLASSIFICATION_COLORS[r.classification]||'gray'}`}>{CLASSIFICATION_LABELS[r.classification]||r.classification}</span>},
    {key:'audit_comm_req',label:'Audit comm.',render:r=><span className={`badge ${r.audit_comm_req?'badge-amber':'badge-gray'}`}>{r.audit_comm_req?'Required':'No'}</span>},
    {key:'public_disc_req',label:'Public disc.',render:r=><span className={`badge ${r.public_disc_req?'badge-red':'badge-gray'}`}>{r.public_disc_req?'Required':'No'}</span>},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Closed'?'badge-green':r.status==='Open'?'badge-red':'badge-amber'}`}>{r.status}</span>},
    {key:'comm_date',label:'Comm. date'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><ShieldAlert size={12}/>Execute · Deficiencies</>} title="Deficiency log"
        subtitle="AS 2201.62–.70 classification. Truth table auto-classifies CD/SD/MW from likelihood × magnitude."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}>+ Add deficiency</button>} />

      {mwCount>0&&<div className="alert-danger mb-4"><AlertTriangle size={15}/><strong>{mwCount} open MW — public 10-K disclosure required. CEO/CFO §302 certification affected.</strong></div>}
      {sdCount>0&&<div className="alert-warn mb-4"><AlertTriangle size={15}/><strong>{sdCount} open SD — written communication to audit committee required before fiscal year-end.</strong></div>}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {CLASSIFICATIONS.filter(c=>c!=='OPEN').map(c=>(
          <div key={c} className="card p-3 text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">{rows.filter(r=>r.classification===c).length}</div>
            <div className={`badge badge-${CLASSIFICATION_COLORS[c]||'gray'} mt-1`}>{c}</div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteDeficiency(id).then(load):null} emptyMsg="No deficiencies logged."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Deficiency log entry">
        <div className="alert-info mb-4"><AlertTriangle size={14}/><span className="text-xs">Truth table auto-classifies based on likelihood × magnitude per AS 2201.62–.70</span></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ref"><Input placeholder="DEF-001" value={form.ref} onChange={set('ref')} maxLength={20}/></Field>
          <Field label="Design or operating"><Select value={form.design_or_op} onChange={set('design_or_op')} options={['Operating','Design','Both']}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Likelihood" hint="Per AS 2201.62"><Select value={form.likelihood} onChange={set('likelihood')} options={LIKELIHOODS}/></Field>
          <Field label="Magnitude"><Select value={form.magnitude} onChange={set('magnitude')} options={MAGNITUDES}/></Field>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-surface-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Auto-classification:</span>
          <span className={`badge badge-${CLASSIFICATION_COLORS[form.classification]||'gray'}`}>{CLASSIFICATION_LABELS[form.classification]||form.classification}</span>
        </div>
        {form.audit_comm_req&&<div className="alert-warn mb-3"><AlertTriangle size={13}/><span className="text-xs">Audit committee communication required before fiscal year-end</span></div>}
        {form.public_disc_req&&<div className="alert-danger mb-3"><AlertTriangle size={13}/><span className="text-xs">Public disclosure required in 10-K Item 9A</span></div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Communication date"><Input type="date" value={form.comm_date||''} onChange={set('comm_date')}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Open','Remediation in progress','Closed']}/></Field>
        </div>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} maxLength={500}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
