import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { getEngagementProgress } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'

// The audit sequence, in the order PCAOB procedures require it.
const STEPS = [
  { key:'scope',     label:'Scope',      path:'/plan/scoping',        hint:'Score systems to determine ITGC testing requirement' },
  { key:'rcm',       label:'RCM',        path:'/plan/rcm',            hint:'Define the controls you will test' },
  { key:'workpaper', label:'Workpapers', path:'/plan/workpapers',     hint:'Create a workpaper and sample plan per control' },
  { key:'ipe',       label:'IPE',        path:'/execute/ipe',         hint:'Validate every report before testing — AS 1105.10A' },
  { key:'testing',   label:'Testing',    path:'/execute/testing',     hint:'Test sample items against control attributes' },
  { key:'findings',  label:'Findings',   path:'/execute/findings',    hint:'Document and sign off exceptions' },
  { key:'report',    label:'Report',     path:'/manage/reports',      hint:'Issue the audit report' },
]

export default function ProgressStrip() {
  const { programmeId } = useProgramme()
  const location = useLocation()
  const [p, setP] = useState(null)

  useEffect(() => {
    if (!programmeId) { setP(null); return }
    getEngagementProgress(programmeId).then(setP)
  }, [programmeId, location.pathname])

  if (!programmeId || !p) return null

  // First incomplete step is "current" — everything before it is done.
  const currentIdx = STEPS.findIndex(s => !p[s.key])
  const activeIdx  = currentIdx === -1 ? STEPS.length : currentIdx

  const detail = (key) => {
    const c = p.counts
    if (key === 'rcm'      && c.rcmTotal)  return `${c.rcmTested}/${c.rcmTotal}`
    if (key === 'ipe'      && c.ipeTotal)  return `${c.ipeOk}/${c.ipeTotal}`
    if (key === 'findings' && c.findTotal) return `${c.findSigned}/${c.findTotal}`
    return null
  }

  return (
    <div className="hidden md:flex items-center gap-1 px-4 py-2 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-2 flex-shrink-0">Progress</span>
      {STEPS.map((s, i) => {
        const done    = p[s.key]
        const current = i === activeIdx
        const onPage  = location.pathname === s.path
        const d       = detail(s.key)
        return (
          <div key={s.key} className="flex items-center flex-shrink-0">
            <Link to={s.path} title={s.hint}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                ${onPage    ? 'bg-brand-600 text-white'
                : done      ? 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                : current   ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
                            : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface-3'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                ${onPage ? 'bg-white/25 text-white'
                : done   ? 'bg-green-500 text-white'
                : current? 'bg-amber-500 text-white'
                         : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                {done ? <Check size={10}/> : i + 1}
              </span>
              {s.label}
              {d && <span className={`opacity-60 ${onPage ? 'text-white' : ''}`}>{d}</span>}
            </Link>
            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 mx-0.5"/>}
          </div>
        )
      })}
    </div>
  )
}
