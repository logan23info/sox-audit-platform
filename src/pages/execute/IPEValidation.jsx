import { useEffect, useState } from 'react'
import { Database, Plus } from 'lucide-react'
import { getIPEValidations, upsertIPEValidation, deleteIPEValidation } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Textarea } from '../../components/FormField'

const BLANK = { report_name:'', system_source:'', extract_params:'', total_records:'', validation_method:'', reconciled_to:'', difference:'', validated:false, validated_by:'', validated_date:'', notes:'' }

export default function IPEValidation() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getIPEValidations(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }
  const save = async () => {
    if (!form.report_name) { toast({type:'warning',title:'Report name required'}); return }
    setSaving(true)
    await upsertIPEValidation({...form, programme_id:programmeId})
    toast({type:'success',title:'IPE validation saved'}); setModal(false); load()
    setSaving(false)
  }

  const cols = [
    {key:'report_name',label:'Report / IPE'},
    {key:'system_source',label:'System'},
    {key:'total_records',label:'Records'},
    {key:'reconciled_to',label:'Reconciled to'},
    {key:'difference',label:'Difference'},
    {key:'validated',label:'Validated',render:r=><span className={`badge ${r.validated?'badge-green':'badge-amber'}`}>{r.validated?'✓ Valid':'Pending'}</span>},
    {key:'validated_by',label:'By'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Database size={12}/>Execute · IPE</>} title="IPE validation log"
        subtitle="Per AS 1105.10A — all system-generated reports used in controls must be validated for completeness and accuracy before testing."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add IPE</button>} />
      <div className="alert-warn mb-4"><Database size={14}/><span className="text-sm">IPE validation is the #1 PCAOB inspection finding (2023–2025). Document every report used in any control before sampling.</span></div>
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteIPEValidation(id).then(load):null} emptyMsg="No IPE validations logged yet."/>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="IPE validation">
        <Field label="Report name"><Input placeholder="User access review report — IAM tool export" value={form.report_name} onChange={set('report_name')} maxLength={150}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="System source"><Input placeholder="Okta / SAP / Oracle" value={form.system_source} onChange={set('system_source')} maxLength={80}/></Field>
          <Field label="Total record count"><Input type="number" value={form.total_records} onChange={set('total_records')}/></Field>
        </div>
        <Field label="Extract parameters"><Textarea placeholder="Date range: 01-Jul to 30-Sep 2026. Status: Active. Entity: All. Ledger: Company Code 1000." value={form.extract_params} onChange={set('extract_params')} maxLength={300}/></Field>
        <Field label="Validation method"><Input placeholder="Reconciled record count to HR headcount report dated [date]" value={form.validation_method} onChange={set('validation_method')} maxLength={200}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reconciled to"><Input placeholder="HR headcount report / GL trial balance" value={form.reconciled_to} onChange={set('reconciled_to')} maxLength={100}/></Field>
          <Field label="Difference"><Input placeholder="None / $0 / 3 records" value={form.difference} onChange={set('difference')} maxLength={50}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Validated by"><Input value={form.validated_by} onChange={set('validated_by')} maxLength={60}/></Field>
          <Field label="Validation date"><Input type="date" value={form.validated_date||''} onChange={set('validated_date')}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={form.validated} onChange={e=>setForm(f=>({...f,validated:e.target.checked}))}/> Mark as validated — IPE confirmed complete and accurate</label>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
