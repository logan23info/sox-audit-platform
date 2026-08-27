import { useEffect, useState } from 'react'
import { Building, Plus } from 'lucide-react'
import { getVendorReviews, upsertVendorReview, deleteVendorReview, getCUECItems, upsertCUECItem, deleteCUECItem } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { SOC1_RELIANCE_TABLE } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK_V = { vendor_name:'', service_desc:'', report_type:'Type II', report_period_start:'', report_period_end:'', covers_fy:true, opinion:'Unqualified', exceptions_noted:false, exception_desc:'', bridge_letter:false, reliance_decision:'', reliance_notes:'' }
const BLANK_C = { cuec_ref:'', description:'', our_control:'', tested:false, evidence_desc:'', result:'', exception:false }

export default function VendorSOC1() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]    = useState([])
  const [cuecs, setCuecs]  = useState([])
  const [activeVendor, setActiveVendor] = useState(null)
  const [modal, setModal]  = useState(false)
  const [cuecModal, setCuecModal] = useState(false)
  const [form, setForm]    = useState(BLANK_V)
  const [cuecForm, setCuecForm] = useState(BLANK_C)
  const [saving, setSaving] = useState(false)

  const load = () => getVendorReviews(programmeId).then(d=>setRows(d||[]))
  const loadCuecs = (id) => { setActiveVendor(id); getCUECItems(id).then(d=>setCuecs(d||[])) }
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const setc = k => e => setCuecForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))

  // Auto-determine reliance decision from truth table
  const getReliance = (f) => {
    if (f.report_type==='Type I') return 'none'
    if (!f.covers_fy) return 'gap'
    if (f.opinion==='Qualified') return 'partial'
    if (f.opinion==='Unqualified') return 'place'
    return ''
  }

  const open = (r=BLANK_V) => { const f={...BLANK_V,...r}; f.reliance_decision=getReliance(f); setForm(f); setModal(true) }
  const save = async () => {
    if (!form.vendor_name) { toast({type:'warning',title:'Vendor name required'}); return }
    setSaving(true)
    const f={...form, reliance_decision:getReliance(form)}
    await upsertVendorReview({...f, programme_id:programmeId})
    toast({type:'success',title:'Saved'}); setModal(false); load()
    setSaving(false)
  }
  const saveCuec = async () => {
    setSaving(true)
    await upsertCUECItem({...cuecForm, vendor_review_id:activeVendor, programme_id:programmeId})
    toast({type:'success',title:'CUEC saved'}); setCuecModal(false); loadCuecs(activeVendor)
    setSaving(false)
  }

  const relianceColor = d => d==='place'?'badge-green':d==='partial'?'badge-amber':d==='gap'?'badge-amber':d==='none'?'badge-gray':'badge-red'
  const cols = [
    {key:'vendor_name',label:'Vendor'},{key:'service_desc',label:'Service',render:r=><span className="text-xs text-gray-400 line-clamp-1">{r.service_desc}</span>},
    {key:'report_type',label:'Type'},{key:'opinion',label:'Opinion'},
    {key:'covers_fy',label:'Covers FY',render:r=><span className={`badge ${r.covers_fy?'badge-green':'badge-amber'}`}>{r.covers_fy?'Yes':'Gap'}</span>},
    {key:'reliance_decision',label:'Reliance',render:r=>r.reliance_decision?<span className={`badge ${relianceColor(r.reliance_decision)}`}>{r.reliance_decision}</span>:'—'},
    {key:'cuec',label:'CUECs',render:r=><button className="text-xs text-brand-600 underline" onClick={e=>{e.stopPropagation();loadCuecs(r.id);setCuecModal(true)}}>Test CUECs</button>},
  ]
  const cuecCols = [
    {key:'cuec_ref',label:'Ref',render:r=><span className="mono">{r.cuec_ref}</span>},
    {key:'description',label:'CUEC description',render:r=><span className="text-xs line-clamp-2">{r.description}</span>},
    {key:'our_control',label:'Our control',render:r=><span className="text-xs line-clamp-1 text-gray-400">{r.our_control}</span>},
    {key:'tested',label:'Tested',render:r=><span className={`badge ${r.tested?'badge-green':'badge-gray'}`}>{r.tested?'Yes':'No'}</span>},
    {key:'result',label:'Result',render:r=>r.result?<span className={`badge ${r.result==='Pass'?'badge-green':'badge-red'}`}>{r.result}</span>:'—'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Building size={12}/>Manage · Vendor / SOC 1</>} title="Vendor & SOC 1 review"
        subtitle="AS 2601 — evaluate SOC 1 reports and test all CUECs before placing reliance."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add vendor</button>} />
      <div className="card p-0 overflow-hidden mb-6">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteVendorReview(id).then(load):null} emptyMsg="No vendor reviews yet."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Vendor / SOC 1 review" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor name"><Input placeholder="ADP / Workday / AWS" value={form.vendor_name} onChange={set('vendor_name')} maxLength={80}/></Field>
          <Field label="Report type"><Select value={form.report_type} onChange={set('report_type')} options={['Type II','Type I','None']}/></Field>
        </div>
        <Field label="Service description"><Textarea value={form.service_desc} onChange={set('service_desc')} placeholder="Payroll processing and tax filing for all US employees" maxLength={200}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Report period start"><Input type="date" value={form.report_period_start||''} onChange={set('report_period_start')}/></Field>
          <Field label="Report period end"><Input type="date" value={form.report_period_end||''} onChange={set('report_period_end')}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opinion"><Select value={form.opinion} onChange={set('opinion')} options={['Unqualified','Qualified','None']}/></Field>
          <Field label="Covers fiscal year?"><Select value={form.covers_fy?'yes':'no'} onChange={e=>setForm(f=>({...f,covers_fy:e.target.value==='yes'}))} options={[{value:'yes',label:'Yes'},{value:'no',label:'No — bridge letter needed'}]}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={form.exceptions_noted} onChange={set('exceptions_noted')}/> Exceptions noted in report</label>
        {form.exceptions_noted&&<Field label="Exception description"><Textarea value={form.exception_desc} onChange={set('exception_desc')} maxLength={300}/></Field>}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-3 mb-3 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Auto reliance decision:</span>
          <span className={`badge ${relianceColor(getReliance(form))}`}>{getReliance(form)||'—'}</span>
        </div>
        <Field label="Reliance notes"><Textarea value={form.reliance_notes} onChange={set('reliance_notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={cuecModal} onClose={()=>setCuecModal(false)} title="CUEC testing" size="max-w-2xl">
        <RecordTable cols={cuecCols} rows={cuecs} onDelete={isAuditor?id=>deleteCUECItem(id).then(()=>loadCuecs(activeVendor)):null} emptyMsg="No CUECs added yet."/>
        {isAuditor&&<>
          <div className="divider"/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CUEC ref"><Input placeholder="CUEC-01" value={cuecForm.cuec_ref} onChange={setc('cuec_ref')} maxLength={20}/></Field>
            <Field label="Result"><Select value={cuecForm.result||''} onChange={setc('result')} options={[{value:'',label:'Pending'},{value:'Pass',label:'Pass'},{value:'Fail',label:'Fail'}]}/></Field>
          </div>
          <Field label="CUEC description from SOC 1 report"><Textarea value={cuecForm.description} onChange={setc('description')} placeholder="The service organization's controls assume that user entities perform periodic access reviews of their user accounts within the vendor system." maxLength={400}/></Field>
          <Field label="Our corresponding control"><Input value={cuecForm.our_control} onChange={setc('our_control')} placeholder="Quarterly access review — LA-02" maxLength={150}/></Field>
          <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={cuecForm.tested} onChange={setc('tested')}/> Tested</label>
          <div className="flex justify-end"><button className="btn btn-primary btn-sm" onClick={saveCuec} disabled={saving}>Add CUEC</button></div>
        </>}
      </Modal>
    </div>
  )
}
