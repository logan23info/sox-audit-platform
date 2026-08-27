import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { getReliance, upsertReliance } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { DOMAINS } from '../../constants'
import PageHeader from '../../components/PageHeader'

export default function Reliance() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [form, setForm] = useState({ la_pct:0, cm_pct:0, co_pct:0, pd_pct:0, je_pct:0, reperform_pct:0, notes:'' })
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ if(programmeId) getReliance(programmeId).then(d=>{ if(d) setForm(d) }) },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const save = async () => {
    setSaving(true)
    await upsertReliance({...form, programme_id:programmeId})
    toast({type:'success',title:'Reliance settings saved'})
    setSaving(false)
  }

  const domainKeys = { LA:'la_pct', CM:'cm_pct', CO:'co_pct', PD:'pd_pct', JE:'je_pct' }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader eyebrow={<><BarChart3 size={12}/>Manage · Reliance</>} title="External auditor reliance"
        subtitle="AS 2201.16–.19 — document % of IA work relied upon by external auditor per domain. Re-performance % required." />
      <div className="alert-info mb-5"><span className="text-sm">External auditors must re-perform a portion of IA's work to validate quality. Typically 10–25% of reliance sample. Document in written agreement with the external auditor team.</span></div>
      <div className="card space-y-5">
        {DOMAINS.map(d=>(
          <div key={d.id}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.id} — {d.label}</label>
              <span className="text-sm font-bold text-brand-600">{form[domainKeys[d.id]]||0}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={form[domainKeys[d.id]]||0} onChange={set(domainKeys[d.id])} className="w-full accent-brand-600" disabled={!isAuditor}/>
          </div>
        ))}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Re-performance % (of reliance sample)</label>
            <span className="text-sm font-bold text-purple-600">{form.reperform_pct||0}%</span>
          </div>
          <input type="range" min="0" max="50" step="5" value={form.reperform_pct||0} onChange={set('reperform_pct')} className="w-full accent-purple-600" disabled={!isAuditor}/>
        </div>
        <textarea className="input min-h-[80px]" placeholder="Notes on reliance approach, coordination with external audit team…" value={form.notes||''} onChange={set('notes')} maxLength={500} disabled={!isAuditor}/>
        {isAuditor&&<div className="flex justify-end"><button className="btn btn-primary" onClick={save} disabled={saving}>Save reliance settings</button></div>}
      </div>
    </div>
  )
}
