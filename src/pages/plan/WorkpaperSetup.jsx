import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { getWorkpapers, upsertWorkpaper, deleteWorkpaper, getRCM, getSamplePlan, upsertSamplePlan, getTestingItems } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { DOMAINS, SAMPLE_TABLE, FREQUENCIES, RISK_RATINGS } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { domain:'LA', control_id:'', control_title:'', population_src:'', population_cnt:'', ipe_validated:false, preparer:'', reviewer:'', conclusion:'', status:'Not Started' }
const WP_STATUSES = ['Not Started','In Progress','Complete','Reviewed']

// AS 2315 sample size enforcement
const checkSampleReady = (wp, samplePlan, itemCount) => {
  if (!samplePlan?.final_sample) return { ok: true, msg: '' }
  if (itemCount < samplePlan.final_sample) {
    return { ok: false, msg: `AS 2315: ${itemCount} items tested — ${samplePlan.final_sample} required. Cannot mark Complete.` }
  }
  return { ok: true, msg: '' }
}

const calcSample = (freq,risk,isNew,priorEx) => {
  const base = SAMPLE_TABLE[freq]?.[risk] ?? 5
  let uplift = 1
  if (isNew) uplift += 0.25
  if (priorEx) uplift += 0.40
  return Math.ceil(base * uplift)
}

export default function WorkpaperSetup() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]     = useState([])
  const [rcm, setRcm]       = useState([])
  const [modal, setModal]   = useState(false)
  const [sampleModal, setSampleModal] = useState(false)
  const [form, setForm]     = useState(BLANK)
  const [sp, setSp]         = useState({ frequency:'monthly', risk_rating:'high', is_new_control:false, prior_exception:false, is_itdm:false })
  const [activeWp, setActiveWp] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [samplePlans, setSamplePlans] = useState({})
  const [itemCounts, setItemCounts]   = useState({})

  const load = () => getWorkpapers(programmeId).then(async d => {
    const wps = d||[]
    setRows(wps)
    // Load sample plans for each workpaper
    const plans = {}
    const counts = {}
    await Promise.all(wps.map(async wp => {
      const sp = await getSamplePlan(wp.id)
      if (sp) plans[wp.id] = sp
      const items = await getTestingItems(wp.id)
      counts[wp.id] = items?.length || 0
    }))
    setSamplePlans(plans)
    setItemCounts(counts)
  })
  useEffect(()=>{ if(programmeId){ load(); getRCM(programmeId).then(d=>setRcm(d||[])) } },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const setSPk = k => e => setSp(s=>({...s,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))

  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }
  const openSample = async (wp) => {
    setActiveWp(wp)
    const existing = await getSamplePlan(wp.id)
    if (existing) setSp({ frequency:existing.frequency||'monthly', risk_rating:existing.risk_rating||'high', is_new_control:existing.is_new_control||false, prior_exception:existing.prior_exception||false, is_itdm:existing.is_itdm||false })
    setSampleModal(true)
  }

  const save = async () => {
    if (!form.domain||!form.control_title) { toast({type:'warning',title:'Domain and title required'}); return }
    if (form.status==='Complete' && form.id) {
      const check = checkSampleReady(form, samplePlans[form.id], itemCounts[form.id]||0)
      if (!check.ok) { toast({type:'warning',title:'Sample size not met',description:check.msg}); return }
    }
    setSaving(true)
    await upsertWorkpaper({...form, programme_id:programmeId})
    toast({type:'success',title:'Workpaper saved'}); setModal(false); load()
    setSaving(false)
  }

  const saveSample = async () => {
    const final = calcSample(sp.frequency, sp.risk_rating, sp.is_new_control, sp.prior_exception)
    const base  = SAMPLE_TABLE[sp.frequency]?.[sp.risk_rating] ?? 5
    const justification = `Sample of ${final} items selected for ${sp.frequency} control (${sp.risk_rating} risk). Base: ${base}${sp.is_new_control?' +25% new control':''}${sp.prior_exception?' +40% prior exceptions':''}. Per PCAOB AS 2315.`
    await upsertSamplePlan({ workpaper_id:activeWp.id, programme_id:programmeId, ...sp, base_sample:base, final_sample:final, justification })
    toast({type:'success',title:`Sample plan saved — ${final} items`}); setSampleModal(false)
  }

  const statusColor = s => s==='Complete'?'badge-green':s==='Reviewed'?'badge-blue':s==='In Progress'?'badge-amber':'badge-gray'
  const cols = [
    {key:'domain',label:'Domain',render:r=><span className={`badge badge-${r.domain==='LA'?'blue':r.domain==='CM'?'green':r.domain==='CO'?'amber':r.domain==='PD'?'purple':'red'}`}>{r.domain}</span>},
    {key:'control_id',label:'Control ID',render:r=><span className="mono">{r.control_id}</span>},
    {key:'control_title',label:'Title'},
    {key:'ipe_validated',label:'IPE',render:r=><span className={`badge ${r.ipe_validated?'badge-green':'badge-gray'}`}>{r.ipe_validated?'✓ Valid':'Pending'}</span>},
    {key:'status',label:'Status',render:r=><span className={`badge ${statusColor(r.status)}`}>{r.status}</span>},
    {key:'sample',label:'Sample',render:r=>{
    const sp = samplePlans[r.id]
    const cnt = itemCounts[r.id]||0
    if (!sp) return <button className="text-xs text-brand-600 underline" onClick={e=>{e.stopPropagation();openSample(r)}}>Set sample</button>
    const ok = cnt>=sp.final_sample
    return <span className={`badge ${ok?'badge-green':'badge-amber'}`} onClick={e=>{e.stopPropagation();openSample(r)}} style={{cursor:'pointer'}}>{cnt}/{sp.final_sample}</span>
  }},
  ]

  const final = calcSample(sp.frequency,sp.risk_rating,sp.is_new_control,sp.prior_exception)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><FileText size={12}/>Plan · Workpapers</>} title="Workpaper setup"
        subtitle={`${rows.length} workpapers · AS 2201 + AS 2315`}
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add workpaper</button>} />
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteWorkpaper(id).then(load):null} emptyMsg="No workpapers yet."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Workpaper shell">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain"><Select value={form.domain} onChange={set('domain')} options={DOMAINS.map(d=>({value:d.id,label:d.id+' — '+d.label}))}/></Field>
          <Field label="Control ID"><Input placeholder="LA-02" value={form.control_id} onChange={set('control_id')} maxLength={20}/></Field>
        </div>
        <Field label="Control title"><Input value={form.control_title} onChange={set('control_title')} maxLength={120}/></Field>
        <Field label="Population source (IPE)"><Input placeholder="User access listing from IAM tool — extract params: all active users, date X" value={form.population_src} onChange={set('population_src')} maxLength={200}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Population count"><Input type="number" value={form.population_cnt} onChange={set('population_cnt')}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={WP_STATUSES}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={form.ipe_validated} onChange={e=>setForm(f=>({...f,ipe_validated:e.target.checked}))}/> IPE validated per AS 1105.10A</label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preparer"><Input value={form.preparer} onChange={set('preparer')} maxLength={60}/></Field>
          <Field label="Reviewer"><Input value={form.reviewer} onChange={set('reviewer')} maxLength={60}/></Field>
        </div>
        <Field label="Conclusion"><Textarea value={form.conclusion} onChange={set('conclusion')} placeholder="Based on procedures performed…" maxLength={500}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={sampleModal} onClose={()=>setSampleModal(false)} title="Sample plan — AS 2315">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Control frequency"><Select value={sp.frequency} onChange={setSPk('frequency')} options={FREQUENCIES}/></Field>
          <Field label="Risk rating"><Select value={sp.risk_rating} onChange={setSPk('risk_rating')} options={RISK_RATINGS}/></Field>
        </div>
        <div className="space-y-2 mb-4">
          {[{k:'is_new_control',l:'New or redesigned control (+25%)'},{k:'prior_exception',l:'Prior period exceptions (+40%)'},{k:'is_itdm',l:'IT-dependent manual control (ITDM) — IPE validation required'}].map(x=>(
            <label key={x.k} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={sp[x.k]} onChange={setSPk(x.k)}/>{x.l}</label>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-brand-50 dark:bg-blue-900/20 text-center">
          <div className="text-3xl font-bold text-brand-600">{final}</div>
          <div className="text-sm text-gray-500 mt-1">items recommended</div>
          <div className="text-xs text-gray-400 mt-2">Base: {SAMPLE_TABLE[sp.frequency]?.[sp.risk_rating]??5} · {sp.is_new_control?'+25% ':''}{ sp.prior_exception?'+40% ':''} · Per PCAOB AS 2315</div>
        </div>
        <div className="flex justify-end gap-2 mt-4"><button className="btn btn-outline" onClick={()=>setSampleModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveSample}>Save plan</button></div>
      </Modal>
    </div>
  )
}
