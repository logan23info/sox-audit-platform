import { useEffect, useState } from 'react'
import { FileCheck, Plus } from 'lucide-react'
import { getAssertions, upsertAssertion, getSignatures, createSignature } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { assertion_type:'302', fiscal_year:'', has_mw:false, mw_desc:'', icfr_effective:null, ceo_name:'', cfo_name:'', assertion_date:'', disclosure_text:'', status:'Draft' }

export default function Assertions() {
  const { programmeId, programme, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [sigs, setSigs]   = useState([])
  const [modal, setModal] = useState(false)
  const [sigModal, setSigModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [sigForm, setSigForm] = useState({ signatory_name:'', signatory_title:'', document_type:'assertion', signature_data:'' })
  const [saving, setSaving] = useState(false)

  const load = () => { getAssertions(programmeId).then(d=>setRows(d||[])); getSignatures(programmeId).then(d=>setSigs(d||[])) }
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r, fiscal_year:r.fiscal_year||programme?.fiscal_year||''}); setModal(true) }

  const save = async () => {
    setSaving(true)
    await upsertAssertion({...form, programme_id:programmeId})
    toast({type:'success',title:'Assertion saved'}); setModal(false); load()
    setSaving(false)
  }
  const sign = async () => {
    if (!sigForm.signatory_name||!sigForm.signature_data) { toast({type:'warning',title:'Name and signature required'}); return }
    setSaving(true)
    await createSignature({...sigForm, programme_id:programmeId, signed_at:new Date().toISOString()})
    toast({type:'success',title:'Signed'}); setSigModal(false); load()
    setSaving(false)
  }

  const statusColor = s => s==='Final'?'badge-green':s==='Under Review'?'badge-blue':'badge-gray'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><FileCheck size={12}/>Manage · Assertions</>} title="§302 / §404 assertion tracker"
        subtitle="CEO/CFO certifications and ICFR effectiveness assertions. MW presence modifies certification language."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New assertion</button>} />
      <div className="space-y-3 mb-4">
        {rows.map(r=>(
          <div key={r.id} className={`card ${r.has_mw?'border-red-200 dark:border-red-900':''}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">§{r.assertion_type} — FY{r.fiscal_year}</span>
                  <span className={`badge ${statusColor(r.status)}`}>{r.status}</span>
                  {r.has_mw&&<span className="badge badge-red">MW disclosed</span>}
                  {r.icfr_effective===false&&<span className="badge badge-red">ICFR not effective</span>}
                  {r.icfr_effective===true&&<span className="badge badge-green">ICFR effective</span>}
                </div>
                <p className="text-xs text-gray-400">CEO: {r.ceo_name||'—'} · CFO: {r.cfo_name||'—'} · Date: {r.assertion_date||'—'}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={()=>setSigModal(true)}>E-sign</button>
                <button className="btn btn-outline btn-sm" onClick={()=>open(r)}>Edit</button>
              </div>
            </div>
            {r.has_mw&&r.mw_desc&&<p className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{r.mw_desc}</p>}
          </div>
        ))}
        {rows.length===0&&<div className="card text-center py-10 border-dashed"><p className="text-sm text-gray-400">No assertions yet. Create a §302 or §404 certification.</p></div>}
      </div>

      {sigs.length>0&&(
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Signatures ({sigs.length})</h3>
          {sigs.map(s=>(
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">
              <div><span className="font-medium">{s.signatory_name}</span> <span className="text-gray-400">· {s.signatory_title}</span></div>
              <span className="text-xs text-gray-400">{new Date(s.signed_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Management assertion" size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section"><Select value={form.assertion_type} onChange={set('assertion_type')} options={[{value:'302',label:'§302 — Quarterly certification'},{value:'404a',label:'§404(a) — Management assessment'},{value:'404b',label:'§404(b) — External auditor attestation'}]}/></Field>
          <Field label="Fiscal year"><Input value={form.fiscal_year} onChange={set('fiscal_year')} maxLength={10}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CEO name"><Input value={form.ceo_name} onChange={set('ceo_name')} maxLength={80}/></Field>
          <Field label="CFO name"><Input value={form.cfo_name} onChange={set('cfo_name')} maxLength={80}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assertion date"><Input type="date" value={form.assertion_date||''} onChange={set('assertion_date')}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Draft','Under Review','Final']}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ICFR effective?"><Select value={form.icfr_effective===null?'':String(form.icfr_effective)} onChange={e=>setForm(f=>({...f,icfr_effective:e.target.value===''?null:e.target.value==='true'}))} options={[{value:'',label:'Not assessed'},{value:'true',label:'Yes — effective'},{value:'false',label:'No — not effective'}]}/></Field>
          <div className="flex items-center gap-2 pt-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_mw} onChange={set('has_mw')}/><span className="text-red-500 font-medium">Material weakness present</span></label></div>
        </div>
        {form.has_mw&&<Field label="MW disclosure text"><Textarea value={form.mw_desc} onChange={set('mw_desc')} placeholder="A material weakness was identified in… The Company is implementing remediation measures including…" maxLength={1000}/></Field>}
        <Field label="Full disclosure text (10-K Item 9A draft)"><Textarea value={form.disclosure_text} onChange={set('disclosure_text')} maxLength={2000} placeholder="Management's annual report on internal control over financial reporting…"/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>

      <Modal open={sigModal} onClose={()=>setSigModal(false)} title="E-signature">
        <Field label="Signatory name"><Input value={sigForm.signatory_name} onChange={e=>setSigForm(f=>({...f,signatory_name:e.target.value}))} maxLength={80}/></Field>
        <Field label="Title"><Input placeholder="Chief Executive Officer" value={sigForm.signatory_title} onChange={e=>setSigForm(f=>({...f,signatory_title:e.target.value}))} maxLength={80}/></Field>
        <Field label="Typed signature (type your full name as signature)" hint="By typing your name you confirm your intent to sign this document.">
          <Input value={sigForm.signature_data} onChange={e=>setSigForm(f=>({...f,signature_data:e.target.value}))} placeholder="Jane A. Smith" maxLength={100} style={{fontFamily:'cursive',fontSize:'1.2rem'}}/>
        </Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setSigModal(false)}>Cancel</button><button className="btn btn-primary" onClick={sign} disabled={saving}>Sign document</button></div>
      </Modal>
    </div>
  )
}
