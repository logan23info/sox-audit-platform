import { useEffect, useState } from 'react'
import { FlaskConical, Plus, Bot, Loader } from 'lucide-react'
import { getWorkpapers, getTestingItems, upsertTestingItem, deleteTestingItem, callAI, upsertWorkpaper } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Textarea, Select } from '../../components/FormField'

const BLANK = { sample_num:'', description:'', sample_date:'', evidence_desc:'', attribute_1:'', attribute_1_result:'Pass', attribute_2:'', attribute_2_result:'Pass', attribute_3:'', attribute_3_result:'Pass', exception:false, exception_desc:'' }

export default function SampleTesting() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [workpapers, setWorkpapers] = useState([])
  const [activeWp, setActiveWp]     = useState(null)
  const [items, setItems]           = useState([])
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(BLANK)
  const [saving, setSaving]         = useState(false)
  const [aiConc, setAiConc]         = useState(false)

  useEffect(()=>{ if(programmeId) getWorkpapers(programmeId).then(d=>setWorkpapers(d||[])) },[programmeId])
  const loadItems = (wp) => { setActiveWp(wp); getTestingItems(wp.id).then(d=>setItems(d||[])) }
  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }
  const save = async () => {
    setSaving(true)
    await upsertTestingItem({...form, workpaper_id:activeWp.id, programme_id:programmeId})
    toast({type:'success',title:'Item saved'}); setModal(false); loadItems(activeWp)
    setSaving(false)
  }

  const exceptions = items.filter(i=>i.exception).length
  const cols = [
    {key:'sample_num',label:'#'},{key:'description',label:'Sample item'},{key:'sample_date',label:'Date'},
    {key:'attribute_1_result',label:'Attr 1',render:r=><span className={`badge ${r.attribute_1_result==='Pass'?'badge-green':'badge-red'}`}>{r.attribute_1_result||'—'}</span>},
    {key:'attribute_2_result',label:'Attr 2',render:r=>r.attribute_2?<span className={`badge ${r.attribute_2_result==='Pass'?'badge-green':'badge-red'}`}>{r.attribute_2_result}</span>:'—'},
    {key:'exception',label:'Exception',render:r=>r.exception?<span className="badge badge-red">Yes</span>:'—'},
  ]

  const draftConclusion = async () => {
    if (!activeWp) return
    setAiConc(true)
    try {
      const total = items.length
      const exc   = items.filter(i=>i.exception).length
      const prompt = `[ROLE] SOX ITGC workpaper reviewer.
[OUTPUT] JSON only: {"conclusion":"string","status":"Effective|Ineffective|In Progress"}
[INSTRUCTIONS] Draft a professional workpaper conclusion based on test results. If 0 exceptions: conclude effective. If exceptions > 0: conclude ineffective or note exceptions. Be concise (3-4 sentences). DRAFT — auditor must review.`
      const msg = `Control: ${activeWp.control_title} (${activeWp.domain} - ${activeWp.control_id})
Population: ${activeWp.population_cnt||'N/A'} | Sample tested: ${total} | Exceptions: ${exc}
Exception rate: ${total>0?Math.round((exc/total)*100):0}%
Attributes tested: ${items[0]?[items[0].attribute_1,items[0].attribute_2,items[0].attribute_3].filter(Boolean).join(', '):'N/A'}`
      const res = await callAI({ systemPrompt:prompt, userMessage:msg })
      const clean = res.text.replace(/\`\`\`json|\`\`\`/g,'').replace(/^[^{]*/,'').trim()
      const parsed = JSON.parse(clean)
      await upsertWorkpaper({ ...activeWp, conclusion: parsed.conclusion, status: parsed.status })
      setActiveWp(wp => ({ ...wp, conclusion: parsed.conclusion, status: parsed.status }))
      workpapers.find(w=>w.id===activeWp.id) && (workpapers.find(w=>w.id===activeWp.id).conclusion = parsed.conclusion)
      toast({ type:'success', title:'Conclusion drafted — DRAFT, review before finalising' })
    } catch(e) { toast({ type:'error', title:'AI error', description:e.message }) }
    setAiConc(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><FlaskConical size={12}/>Execute · Testing</>} title="Sample testing" subtitle="Test individual sample items per workpaper. Document each attribute, result, and exception."/>
      <div className="flex gap-2 flex-wrap mb-5">
        {workpapers.map(wp=>(
          <button key={wp.id} onClick={()=>loadItems(wp)} className={`btn btn-sm ${activeWp?.id===wp.id?'btn-primary':'btn-outline'}`}>
            <span className={`badge badge-${wp.domain==='LA'?'blue':wp.domain==='CM'?'green':wp.domain==='CO'?'amber':wp.domain==='PD'?'purple':'red'} mr-1`}>{wp.domain}</span>
            {wp.control_id}
          </button>
        ))}
      </div>
      {activeWp&&(
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">{activeWp.control_title}</h3>
              <p className="text-xs text-gray-400">{items.length} items tested · {exceptions} exception{exceptions!==1?'s':''}</p>
              {exceptions>0&&<span className="badge badge-red mt-1">{exceptions} exception(s) — evaluate for deficiency</span>}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={draftConclusion} disabled={aiConc}>
                {aiConc?<><Loader size={13} className="animate-spin"/>Drafting…</>:<><Bot size={13}/>Draft conclusion</>}
              </button>
              {isAuditor&&<button className="btn btn-primary btn-sm" onClick={()=>open()}><Plus size={13}/>Add item</button>}
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <RecordTable cols={cols} rows={items} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteTestingItem(id).then(()=>loadItems(activeWp)):null} emptyMsg="No items tested yet."/>
          </div>
        </>
      )}
      {!activeWp&&<div className="card text-center py-10 border-dashed"><p className="text-sm text-gray-400">Select a workpaper above to view and add test items.</p></div>}

      <Modal open={modal} onClose={()=>setModal(false)} title="Sample test item">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sample #"><Input type="number" value={form.sample_num} onChange={set('sample_num')}/></Field>
          <Field label="Sample date"><Input type="date" value={form.sample_date||''} onChange={set('sample_date')}/></Field>
        </div>
        <Field label="Sample description"><Input placeholder="User ID: jsmith — role: AP Approver" value={form.description} onChange={set('description')} maxLength={200}/></Field>
        <Field label="Evidence obtained"><Textarea value={form.evidence_desc} onChange={set('evidence_desc')} placeholder="Obtained access certification report page 12, row 45. Approval by manager Jane Doe dated 15-Sep-2026." maxLength={400}/></Field>
        {[1,2,3].map(n=>(
          <div key={n} className="grid grid-cols-2 gap-3">
            <Field label={`Attribute ${n}`}><Input placeholder="Authorization — approved before access granted" value={form[`attribute_${n}`]} onChange={set(`attribute_${n}`)} maxLength={100}/></Field>
            <Field label="Result"><Select value={form[`attribute_${n}_result`]} onChange={set(`attribute_${n}_result`)} options={['Pass','Fail','N/A']}/></Field>
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3"><input type="checkbox" checked={form.exception} onChange={set('exception')}/> <span className="text-red-500 font-medium">Exception noted</span></label>
        {form.exception&&<Field label="Exception description"><Textarea value={form.exception_desc} onChange={set('exception_desc')} maxLength={300}/></Field>}
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
