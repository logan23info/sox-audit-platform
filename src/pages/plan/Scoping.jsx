import { useEffect, useState } from 'react'
import { Target, Plus, Calculator } from 'lucide-react'
import { getScope, upsertScope, deleteScope } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { DOMAINS, SCOPE_DECISIONS } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { system_name:'', system_type:'', fs_impact:0, volume_score:0, complexity:0, prior_findings:0, change_activity:0, decision:'', rationale:'', domains:[] }
const score2decision = s => s>=8?'IN SCOPE':s>=5?'IN SCOPE':s>=2?'CONSIDER':'OUT OF SCOPE'
const score2color = d => d==='IN SCOPE'?'badge-red':d==='CONSIDER'?'badge-amber':'badge-green'

const SCORE_FIELDS = [
  { key:'fs_impact',      label:'FS impact',       max:3, hint:'3=Direct GL, 2=Indirect, 1=Reference, 0=None' },
  { key:'volume_score',   label:'Volume/Amount',    max:3, hint:'3=>$10M, 2=$1-10M, 1=<$1M' },
  { key:'complexity',     label:'Complexity',       max:2, hint:'2=Custom/complex, 1=Standard pkg, 0=SaaS' },
  { key:'prior_findings', label:'Prior findings',   max:2, hint:'2=MW/SD, 1=CD, 0=None' },
  { key:'change_activity',label:'Change activity',  max:2, hint:'2=Major migration, 1=Moderate, 0=Stable' },
]

export default function Scoping() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast }     = useToast()
  const [rows, setRows] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getScope(programmeId).then(d => setRows(d||[]))
  useEffect(() => { if (programmeId) load() }, [programmeId])

  const set = k => e => {
    const v = ['fs_impact','volume_score','complexity','prior_findings','change_activity'].includes(k) ? Number(e.target.value) : e.target.value
    setForm(f => { const n={...f,[k]:v}; n.decision=score2decision((n.fs_impact+n.volume_score+n.complexity+n.prior_findings+n.change_activity)); return n })
  }

  const open = (r=BLANK) => { setForm({...BLANK,...r, domains:r.domains??[]}); setModal(true) }

  const save = async () => {
    if (!form.system_name) { toast({type:'warning',title:'System name required'}); return }
    setSaving(true)
    const total = form.fs_impact+form.volume_score+form.complexity+form.prior_findings+form.change_activity
    await upsertScope({ ...form, programme_id:programmeId, total_score:total })
    toast({type:'success',title:'Saved'})
    setModal(false); load()
    setSaving(false)
  }

  const cols = [
    { key:'system_name', label:'System' },
    { key:'system_type', label:'Type' },
    { key:'total_score', label:'Score', render:r=><span className="mono">{r.total_score??'—'}/12</span> },
    { key:'decision', label:'Decision', render:r=>r.decision?<span className={`badge ${score2color(r.decision)}`}>{r.decision}</span>:'—' },
    { key:'rationale', label:'Rationale', render:r=><span className="text-xs text-gray-400 line-clamp-1">{r.rationale}</span> },
  ]

  const inScope = rows.filter(r=>r.decision==='IN SCOPE').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Target size={12}/>Plan · Scoping</>} title="System scoping worksheet"
        subtitle="Risk-based top-down scoping — score each system to determine ITGC testing requirement. PCAOB AS 2201 Para .22."
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add system</button>} />

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{l:'Total systems',v:rows.length},{l:'In scope',v:inScope,w:true},{l:'Out of scope',v:rows.filter(r=>r.decision==='OUT OF SCOPE').length}].map(s=>(
          <div key={s.l} className={`card p-4 text-center ${s.w&&inScope>0?'border-red-200 dark:border-red-900':''}`}>
            <div className={`text-2xl font-bold ${s.w&&inScope>0?'text-red-600':'text-gray-900 dark:text-white'}`}>{s.v}</div>
            <div className="text-xs text-gray-400 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteScope(id).then(load):null} emptyMsg="No systems scored yet. Add your first in-scope candidate." />
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Score system" size="max-w-xl">
        <Field label="System name"><Input placeholder="SAP S/4HANA — AP/GL module" value={form.system_name} onChange={set('system_name')} maxLength={100}/></Field>
        <Field label="System type"><Input placeholder="ERP / SaaS / Database / Middleware" value={form.system_type} onChange={set('system_type')} maxLength={60}/></Field>
        <div className="divider"/>
        <div className="flex items-center gap-2 mb-3"><Calculator size={14} className="text-brand-600"/><span className="text-sm font-semibold">Risk scoring</span><span className="text-xs text-gray-400">AS 2201 Para .22</span></div>
        {SCORE_FIELDS.map(f=>(
          <div key={f.key} className="flex items-center justify-between mb-3 gap-3">
            <div className="flex-1"><div className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</div><div className="text-xs text-gray-400">{f.hint}</div></div>
            <Select value={form[f.key]} onChange={set(f.key)} options={Array.from({length:f.max+1},(_,i)=>({value:i,label:`${i} pts`}))} />
          </div>
        ))}
        <div className={`flex items-center justify-between p-3 rounded-lg mt-2 ${form.decision==='IN SCOPE'?'bg-red-50 dark:bg-red-900/20':form.decision==='CONSIDER'?'bg-amber-50 dark:bg-amber-900/20':'bg-green-50 dark:bg-green-900/20'}`}>
          <span className="text-sm font-semibold">Score: {form.fs_impact+form.volume_score+form.complexity+form.prior_findings+form.change_activity}/12</span>
          <span className={`badge ${score2color(form.decision)}`}>{form.decision||'—'}</span>
        </div>
        <div className="divider"/>
        <Field label="ITGC domains in scope">
          <div className="flex gap-2 flex-wrap mt-1">{DOMAINS.map(d=>(
            <label key={d.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={form.domains?.includes(d.id)} onChange={e=>setForm(f=>({...f,domains:e.target.checked?[...(f.domains||[]),d.id]:(f.domains||[]).filter(x=>x!==d.id)}))}/>
              {d.id}
            </label>
          ))}</div>
        </Field>
        <Field label="Rationale / notes"><Textarea value={form.rationale} onChange={set('rationale')} placeholder="Document why this system is in/out of scope…" maxLength={500}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
