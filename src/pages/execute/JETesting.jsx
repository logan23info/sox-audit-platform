import { useEffect, useState } from 'react'
import { FileText, Plus, AlertTriangle } from 'lucide-react'
import { getJEPopulation, upsertJEPopulation, getJESegments, upsertJESegment, deleteJESegment, getJESamples, upsertJESample, deleteJESample } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { JE_SEGMENTS } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

export default function JETesting() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [pop, setPop]         = useState(null)
  const [segments, setSegments] = useState([])
  const [samples, setSamples]   = useState([])
  const [activeSegId, setActiveSeg] = useState(null)
  const [popModal, setPopModal] = useState(false)
  const [segModal, setSegModal] = useState(false)
  const [sampleModal, setSampleModal] = useState(false)
  const [popForm, setPopForm]   = useState({ gl_system:'', period:'', extract_params:'', total_je_count:'', total_je_amount:'', automated_incl:true, reconciled_to:'', difference:'', ipe_validated:false, notes:'' })
  const [segForm, setSegForm]   = useState({ segment_type:'after_hours', description:'', risk_level:'High', population_count:'', sample_size:'', selection_method:'Random' })
  const [sampleForm, setSampleForm] = useState({ je_ref:'', je_date:'', preparer:'', approver:'', amount:'', account:'', description:'', support_obtained:false, sod_ok:true, exception:false, exception_desc:'', fraud_indicator:false })
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState('population')

  const load = async () => {
    if (!programmeId) return
    getJEPopulation(programmeId).then(setPop)
    getJESegments(programmeId).then(d=>setSegments(d||[]))
  }
  const loadSamples = (segId) => { setActiveSeg(segId); getJESamples(segId).then(d=>setSamples(d||[])) }
  useEffect(()=>{ load() },[programmeId])

  const setp = k => e => setPopForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const sets = k => e => setSegForm(f=>({...f,[k]:e.target.value}))
  const setsa = k => e => setSampleForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))

  const savePop = async () => {
    setSaving(true)
    await upsertJEPopulation({...popForm, programme_id:programmeId})
    toast({type:'success',title:'Population saved'}); setPopModal(false); load()
    setSaving(false)
  }
  const saveSeg = async () => {
    setSaving(true)
    await upsertJESegment({...segForm, programme_id:programmeId})
    toast({type:'success',title:'Segment saved'}); setSegModal(false); load()
    setSaving(false)
  }
  const saveSample = async () => {
    setSaving(true)
    await upsertJESample({...sampleForm, segment_id:activeSegId, programme_id:programmeId})
    toast({type:'success',title:'Sample saved'}); setSampleModal(false); loadSamples(activeSegId)
    setSaving(false)
  }

  const segCols = [
    {key:'segment_type',label:'Segment',render:r=>JE_SEGMENTS.find(s=>s.id===r.segment_type)?.label||r.segment_type},
    {key:'risk_level',label:'Risk',render:r=><span className={`badge ${r.risk_level==='High'?'badge-red':'badge-gray'}`}>{r.risk_level}</span>},
    {key:'population_count',label:'Population'},
    {key:'sample_size',label:'Sample'},
    {key:'selection_method',label:'Method'},
    {key:'samples',label:'Test items',render:r=><button className="text-xs text-brand-600 underline" onClick={e=>{e.stopPropagation();loadSamples(r.id);setSampleModal(true)}}>Open</button>},
  ]
  const sampleCols = [
    {key:'je_ref',label:'JE ref'},{key:'je_date',label:'Date'},{key:'preparer',label:'Preparer'},{key:'approver',label:'Approver'},
    {key:'amount',label:'Amount'},{key:'support_obtained',label:'Support',render:r=><span className={`badge ${r.support_obtained?'badge-green':'badge-amber'}`}>{r.support_obtained?'Yes':'No'}</span>},
    {key:'sod_ok',label:'SoD OK',render:r=><span className={`badge ${r.sod_ok?'badge-green':'badge-red'}`}>{r.sod_ok?'OK':'Conflict'}</span>},
    {key:'exception',label:'Exception',render:r=>r.exception?<span className="badge badge-red">Yes</span>:'—'},
    {key:'fraud_indicator',label:'Fraud',render:r=>r.fraud_indicator?<span className="badge badge-red">⚠ Yes</span>:'—'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><FileText size={12}/>Execute · JE Testing</>} title="Journal entry testing"
        subtitle="Required fraud risk procedure — AS 2110.61. IPE validation mandatory before any selection." />
      <div className="alert-warn mb-4"><AlertTriangle size={14}/><span className="text-sm">JE population is IPE. Validate completeness against GL trial balance before segmentation. Document extract parameters.</span></div>

      <div className="flex gap-1 mb-5">
        {['population','segments','samples'].map(t=><button key={t} onClick={()=>setTab(t)} className={`btn btn-sm ${tab===t?'btn-primary':'btn-outline'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>

      {tab==='population'&&(
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">JE population (IPE validation)</h3>
            {isAuditor&&<button className="btn btn-primary btn-sm" onClick={()=>{ if(pop) setPopForm(pop); setPopModal(true) }}>{pop?'Edit':'Set up'} population</button>}
          </div>
          {pop ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[['GL System',pop.gl_system],['Period',pop.period],['Total JEs',pop.total_je_count],['Total Amount',pop.total_je_amount?`$${Number(pop.total_je_amount).toLocaleString()}`:'—'],['Reconciled to',pop.reconciled_to],['Difference',pop.difference||'None']].map(([l,v])=>(
                <div key={l}><div className="text-xs text-gray-400 mb-0.5">{l}</div><div className="text-sm font-medium text-gray-900 dark:text-white">{v||'—'}</div></div>
              ))}
              <div className="col-span-full"><span className={`badge ${pop.ipe_validated?'badge-green':'badge-amber'}`}>{pop.ipe_validated?'✓ IPE Validated':'⚠ IPE not yet validated'}</span></div>
            </div>
          ) : <p className="text-sm text-gray-400">Population not set up. Click above to begin.</p>}
        </div>
      )}

      {tab==='segments'&&(
        <>
          <div className="flex justify-end mb-3">{isAuditor&&<button className="btn btn-primary btn-sm" onClick={()=>{setSegForm({segment_type:'after_hours',description:'',risk_level:'High',population_count:'',sample_size:'',selection_method:'Random'});setSegModal(true)}}><Plus size={13}/>Add segment</button>}</div>
          <div className="card p-0 overflow-hidden"><RecordTable cols={segCols} rows={segments} onDelete={isAuditor?id=>deleteJESegment(id).then(load):null} emptyMsg="No segments yet. Add JE risk segments."/></div>
          <div className="mt-3"><h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Required segments per AS 2110.61</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{JE_SEGMENTS.map(s=>(
            <div key={s.id} className={`p-2.5 rounded-lg border text-xs flex justify-between ${segments.find(x=>x.segment_type===s.id)?'border-green-200 bg-green-50 dark:bg-green-900/10':' border-dashed border-gray-300 dark:border-gray-600'}`}>
              <span className="font-medium">{s.label}</span><span className={`badge ${s.risk==='High'?'badge-red':'badge-gray'}`}>{s.required_sample}</span>
            </div>
          ))}</div></div>
        </>
      )}

      {tab==='samples'&&(
        <div className="card p-4">
          {activeSegId ? (<>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-gray-500">{samples.length} items · {samples.filter(s=>s.exception).length} exceptions · {samples.filter(s=>s.fraud_indicator).length} fraud indicators</p>
              {isAuditor&&<button className="btn btn-primary btn-sm" onClick={()=>{setSampleForm({je_ref:'',je_date:'',preparer:'',approver:'',amount:'',account:'',description:'',support_obtained:false,sod_ok:true,exception:false,exception_desc:'',fraud_indicator:false});setSampleModal(true)}}><Plus size={13}/>Add item</button>}
            </div>
            <RecordTable cols={sampleCols} rows={samples} onDelete={isAuditor?id=>deleteJESample(id).then(()=>loadSamples(activeSegId)):null} emptyMsg="No samples. Add segment first, then select it from Segments tab."/>
          </>) : <p className="text-sm text-gray-400 text-center py-8">Click 'Open' on a segment to view/add its test items.</p>}
        </div>
      )}

      <Modal open={popModal} onClose={()=>setPopModal(false)} title="JE population — IPE validation">
        <div className="grid grid-cols-2 gap-3">
          <Field label="GL system"><Input placeholder="SAP / Oracle / NetSuite" value={popForm.gl_system} onChange={setp('gl_system')} maxLength={60}/></Field>
          <Field label="Period"><Input placeholder="FY2026 / Q3 2026" value={popForm.period} onChange={setp('period')} maxLength={40}/></Field>
        </div>
        <Field label="Extract parameters"><Textarea placeholder="Date range, entity, ledger, journal type" value={popForm.extract_params} onChange={setp('extract_params')} maxLength={300}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total JE count"><Input type="number" value={popForm.total_je_count} onChange={setp('total_je_count')}/></Field>
          <Field label="Total JE amount ($)"><Input type="number" value={popForm.total_je_amount} onChange={setp('total_je_amount')}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reconciled to"><Input placeholder="GL trial balance dated [date]" value={popForm.reconciled_to} onChange={setp('reconciled_to')} maxLength={100}/></Field>
          <Field label="Difference"><Input placeholder="None / $X" value={popForm.difference} onChange={setp('difference')} maxLength={50}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={popForm.automated_incl} onChange={setp('automated_incl')}/> Automated JEs included in population</label>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-4"><input type="checkbox" checked={popForm.ipe_validated} onChange={setp('ipe_validated')}/> ✓ IPE validated — population confirmed complete and accurate</label>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setPopModal(false)}>Cancel</button><button className="btn btn-primary" onClick={savePop} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={segModal} onClose={()=>setSegModal(false)} title="JE segment">
        <Field label="Segment type"><Select value={segForm.segment_type} onChange={sets('segment_type')} options={JE_SEGMENTS.map(s=>({value:s.id,label:s.label}))}/></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Risk level"><Select value={segForm.risk_level} onChange={sets('risk_level')} options={['High','Standard']}/></Field>
          <Field label="Population count"><Input type="number" value={segForm.population_count} onChange={sets('population_count')}/></Field>
          <Field label="Sample size"><Input type="number" value={segForm.sample_size} onChange={sets('sample_size')}/></Field>
        </div>
        <Field label="Selection method"><Input placeholder="Random / Targeted / All" value={segForm.selection_method} onChange={sets('selection_method')} maxLength={60}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setSegModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveSeg} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={sampleModal&&!!activeSegId} onClose={()=>setSampleModal(false)} title="JE sample item" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="JE reference"><Input placeholder="JE-2026-00123" value={sampleForm.je_ref} onChange={setsa('je_ref')} maxLength={40}/></Field>
          <Field label="JE date"><Input type="date" value={sampleForm.je_date||''} onChange={setsa('je_date')}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preparer"><Input value={sampleForm.preparer} onChange={setsa('preparer')} maxLength={60}/></Field>
          <Field label="Approver"><Input value={sampleForm.approver} onChange={setsa('approver')} maxLength={60}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount ($)"><Input type="number" value={sampleForm.amount} onChange={setsa('amount')}/></Field>
          <Field label="Account"><Input value={sampleForm.account} onChange={setsa('account')} maxLength={60}/></Field>
        </div>
        <Field label="JE description"><Input value={sampleForm.description} onChange={setsa('description')} maxLength={200}/></Field>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sampleForm.support_obtained} onChange={setsa('support_obtained')}/> Support obtained</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sampleForm.sod_ok} onChange={setsa('sod_ok')}/> SoD OK (preparer≠approver)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sampleForm.exception} onChange={setsa('exception')}/> Exception</label>
        </div>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={sampleForm.fraud_indicator} onChange={setsa('fraud_indicator')}/><span className="text-red-500 font-medium">⚠ Fraud indicator</span></label>
        {sampleForm.exception&&<Field label="Exception description"><Textarea value={sampleForm.exception_desc} onChange={setsa('exception_desc')} maxLength={300}/></Field>}
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setSampleModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveSample} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
