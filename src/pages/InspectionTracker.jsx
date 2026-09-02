import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { getInspectionFindings, upsertInspectionFinding, deleteInspectionFinding } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/FormField'

// PCAOB inspection findings from public reports — source: pcaobus.org/inspections
// [SAMPLE] — verify against current PCAOB inspection reports before use
const KNOWN_FINDINGS = [
  { pcaob_year:2024, finding_area:'IPE Validation', description:'Failure to test completeness and accuracy of system-generated reports (AS 1105.10A). Reports used as audit evidence not validated.' },
  { pcaob_year:2024, finding_area:'Risk Assessment', description:'Insufficient linkage between identified risks and audit procedures performed (AS 2110).' },
  { pcaob_year:2024, finding_area:'Substantive Testing', description:'Over-reliance on controls without sufficient substantive procedures for high-risk assertions.' },
  { pcaob_year:2023, finding_area:'JE Testing', description:'Incomplete JE population — automated entries excluded without justification (AS 2110.61).' },
  { pcaob_year:2023, finding_area:'Sampling', description:'Sample size not documented or below AS 2315 minimums. No rationale for reduced samples.' },
  { pcaob_year:2023, finding_area:'SOC 1 Reliance', description:'CUECs not tested before placing reliance on service organization controls (AS 2601).' },
  { pcaob_year:2023, finding_area:'Engagement Quality Review', description:'EQR performed concurrently rather than before report issuance (QC 1000).' },
  { pcaob_year:2022, finding_area:'Independence', description:'Independence impairment due to non-audit services provided to audit client.' },
  { pcaob_year:2022, finding_area:'Workpaper Documentation', description:'Insufficient documentation of procedures performed and conclusions reached (AS 1215).' },
]

const BLANK = { pcaob_year: new Date().getFullYear(), finding_area:'', description:'', applies_to_us:false, mitigation:'', status:'Open' }

export default function InspectionTracker() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]     = useState([])
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => getInspectionFindings(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }

  const save = async () => {
    if (!form.finding_area) { toast({type:'warning',title:'Finding area required'}); return }
    setSaving(true)
    await upsertInspectionFinding({...form, programme_id:programmeId})
    toast({type:'success',title:'Saved'}); setModal(false); load()
    setSaving(false)
  }

  const seedKnown = async () => {
    setSeeding(true)
    await Promise.all(KNOWN_FINDINGS.map(f=>upsertInspectionFinding({...f,programme_id:programmeId,applies_to_us:false,status:'Open'})))
    toast({type:'success',title:'PCAOB findings loaded — review applicability for each'}); load()
    setSeeding(false)
  }

  const visible = filter==='all'?rows:filter==='applies'?rows.filter(r=>r.applies_to_us):rows.filter(r=>!r.applies_to_us)

  const cols = [
    {key:'pcaob_year',label:'Year'},
    {key:'finding_area',label:'Area',render:r=><span className="font-medium">{r.finding_area}</span>},
    {key:'description',label:'Description',render:r=><span className="text-xs text-gray-400 line-clamp-2">{r.description}</span>},
    {key:'applies_to_us',label:'Applies',render:r=><span className={`badge ${r.applies_to_us?'badge-red':'badge-gray'}`}>{r.applies_to_us?'Yes':'No'}</span>},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Closed'?'badge-green':r.status==='Mitigated'?'badge-blue':'badge-amber'}`}>{r.status}</span>},
  ]

  const applies = rows.filter(r=>r.applies_to_us).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Search size={12}/>Reference · PCAOB Inspections</>} title="PCAOB inspection finding tracker"
        subtitle="Track which PCAOB inspection findings apply to your methodology and document mitigations."
        actions={isAuditor&&<div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={seedKnown} disabled={seeding}>Load known findings</button>
          <button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add finding</button>
        </div>} />

      {applies>0&&<div className="alert-warn mb-4"><span className="text-sm"><strong>{applies} findings apply to your methodology</strong> — document mitigations before engagement completion.</span></div>}

      <div className="flex gap-2 mb-4">
        {[['all','All'],['applies','Applies to us'],['na','Not applicable']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-outline'}`}>{l}</button>
        ))}
      </div>

      <div className="alert-info mb-4"><span className="text-xs">Source: pcaobus.org/inspections — [SAMPLE] data loaded from public inspection reports. Verify against current PCAOB releases before relying on this list.</span></div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={visible} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteInspectionFinding(id).then(load):null} emptyMsg="No findings. Load known PCAOB findings or add manually."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="PCAOB inspection finding" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="PCAOB year"><Input type="number" value={form.pcaob_year} onChange={set('pcaob_year')}/></Field>
          <Field label="Finding area"><Input placeholder="IPE Validation / JE Testing / Sampling" value={form.finding_area} onChange={set('finding_area')} maxLength={80}/></Field>
        </div>
        <Field label="Description"><Textarea value={form.description} onChange={set('description')} maxLength={500}/></Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={form.applies_to_us} onChange={set('applies_to_us')}/><span className="font-medium text-red-600">This finding applies to our methodology</span></label>
        {form.applies_to_us&&<Field label="Mitigation"><Textarea value={form.mitigation||''} onChange={set('mitigation')} placeholder="Document how your methodology addresses this finding…" maxLength={500}/></Field>}
        <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Open','Mitigated','Closed','Not Applicable']}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
