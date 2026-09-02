import { useEffect, useState, useRef } from 'react'
import { Bell, X, AlertTriangle, Info, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getNotifications } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'

const TYPE_STYLES = {
  danger:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
}
const TYPE_ICONS = { danger: AlertTriangle, warning: AlertTriangle, info: Info }

export default function NotificationCenter() {
  const { programmeId } = useProgramme()
  const [open, setOpen]   = useState(false)
  const [notes, setNotes] = useState([])
  const ref = useRef(null)

  const load = () => { if (programmeId) getNotifications(programmeId).then(n => setNotes(n||[])) }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [programmeId])
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const danger  = notes.filter(n => n.type === 'danger').length
  const warning = notes.filter(n => n.type === 'warning').length
  const badge   = danger > 0 ? danger : warning > 0 ? warning : 0
  const badgeColor = danger > 0 ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="btn-ghost p-1.5 rounded-lg relative" title="Notifications">
        <Bell size={16} />
        {badge > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 ${badgeColor} text-white text-xs rounded-full flex items-center justify-center font-bold`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white dark:bg-dark-surface-2 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications {notes.length > 0 && `(${notes.length})`}</span>
            <button onClick={() => setOpen(false)} className="btn-ghost p-1 rounded-lg"><X size={14}/></button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No alerts — all controls on track.</div>
            ) : (
              notes.map((n, i) => {
                const Icon = TYPE_ICONS[n.type]
                return (
                  <Link key={i} to={n.link} onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 p-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:opacity-80 transition-opacity ${TYPE_STYLES[n.type]}`}>
                    <Icon size={14} className="flex-shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{n.title}</div>
                      {n.body && <div className="text-xs opacity-70 mt-0.5 truncate">{n.body}</div>}
                    </div>
                    <ExternalLink size={11} className="flex-shrink-0 mt-0.5 opacity-50"/>
                  </Link>
                )
              })
            )}
          </div>
          {notes.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">Refreshes every 60s</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
