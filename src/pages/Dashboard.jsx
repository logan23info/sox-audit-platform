import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Target, FlaskConical, BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp, ArrowRight, Shield, Layers } from 'lucide-react'
import { useProgramme } from '../context/ProgrammeContext'
import { useAuth }      from '../context/AuthContext'
import { getDashboardStats } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Spinner    from '../components/Spinner'

const MODES = [
  {
    to: '/plan/scoping', icon: Target, color: 'blue', label: 'Plan the Audit',
    desc: 'Scope systems, build RCM, set up workpapers, define entities.',
    links: [
      { to: '/plan/scoping',    label: 'Scoping worksheet' },
      { to: '/plan/rcm',        label: 'Risk & control matrix' },
      { to: '/plan/workpapers', label: 'Workpaper setup' },
    ]
  },
  {
    to: '/execute/findings', icon: FlaskConical, color: 'green', label: 'Execute Testing',
    desc: 'IPE validation, sample testing, JE fraud procedures, deficiency log.',
    links: [
      { to: '/execute/ipe',        label: 'IPE validation' },
      { to: '/execute/je-testing', label: 'JE testing' },
      { to: '/execute/findings',   label: 'Finding register' },
    ]
  },
  {
    to: '/manage/reports', icon: BarChart3, color: 'purple', label: 'Manage & Report',
    desc: 'Remediation, SOC 1 reviews, §302/§404 assertions, audit reports.',
    links: [
      { to: '/manage/remediation', label: 'Remediation tracker' },
      { to: '/manage/vendors',     label: 'Vendor / SOC 1 review' },
      { to: '/manage/assertions',  label: '§302 / §404 assertions' },
    ]
  },
]

const COLOR = {
  blue:   { icon:'bg-blue-100 dark:bg-blue-900/30 text-blue-600', bar:'bg-blue-500', border:'hover:border-blue-200 dark:hover:border-blue-800' },
  green:  { icon:'bg-green-100 dark:bg-green-900/30 text-green-600', bar:'bg-green-500', border:'hover:border-green-200 dark:hover:border-green-800' },
  purple: { icon:'bg-purple-100 dark:bg-purple-900/30 text-purple-600', bar:'bg-purple-500', border:'hover:border-purple-200 dark:hover:border-purple-800' },
}

export default function Dashboard() {
  const { profile }     = useAuth()
  const { programme, programmeId } = useProgramme()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!programmeId) return
    const fetch = () => { setLoading(true); getDashboardStats(programmeId).then(setStats).finally(() => setLoading(false)) }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [programmeId])

  const mwCount  = stats?.deficiencies?.filter(d => d.classification === 'MW').length ?? 0
  const sdCount  = stats?.deficiencies?.filter(d => d.classification === 'SD').length ?? 0
  const openRem  = stats?.remediation?.filter(r => r.status !== 'Closed').length ?? 0
  const inScope  = stats?.scope?.filter(s => s.decision === 'IN SCOPE').length ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        eyebrow={<><Shield size={12} /> SOX Audit Platform</>}
        title={`Welcome back${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}`}
        subtitle={programme ? `Active: ${programme.name} · FY ${programme.fiscal_year}` : 'Select or create an engagement to begin'}
        actions={<Link to="/programmes" className="btn btn-outline btn-sm"><Layers size={14} /> Programmes</Link>}
      />

      {/* Stats strip */}
      {programmeId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label:'In-scope systems', val: loading ? '—' : inScope,  icon: Target,        color:'text-blue-600'  },
            { label:'Material weakness', val: loading ? '—' : mwCount, icon: AlertTriangle,  color:'text-red-600',  warn: mwCount > 0 },
            { label:'Sig. deficiencies', val: loading ? '—' : sdCount, icon: Clock,          color:'text-amber-600', warn: sdCount > 0 },
            { label:'Open remediations', val: loading ? '—' : openRem, icon: TrendingUp,     color:'text-purple-600' },
          ].map(s => (
            <div key={s.label} className={`card p-4 ${s.warn ? 'border-red-200 dark:border-red-900' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                <s.icon size={14} className={s.color} />
              </div>
              <div className={`text-2xl font-bold ${s.warn ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* MW alert */}
      {mwCount > 0 && (
        <div className="alert-danger mb-6">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>{mwCount} material weakness{mwCount > 1 ? 'es' : ''} identified.</strong> Public disclosure required in 10-K Item 9A. CEO/CFO §302 certification affected.{' '}
            <Link to="/execute/deficiencies" className="underline font-medium">Review deficiency log →</Link>
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {MODES.map(m => {
          const Icon = m.icon
          const c    = COLOR[m.color]
          return (
            <div key={m.label} className={`card card-hover flex flex-col gap-4 border-2 border-transparent ${c.border} transition-all`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{m.label}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{m.desc}</p>
                </div>
              </div>
              <div className="space-y-1">
                {m.links.map(l => (
                  <Link key={l.to} to={l.to} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-surface-3 hover:bg-gray-100 dark:hover:bg-dark-surface text-sm text-gray-700 dark:text-gray-300 transition-colors group">
                    {l.label}
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* No programme state */}
      {!programmeId && (
        <div className="card text-center py-12 border-dashed">
          <Shield size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No active engagement</h3>
          <p className="text-sm text-gray-400 mb-4">Create or select a SOX engagement to start working</p>
          <Link to="/programmes" className="btn btn-primary">Create engagement</Link>
        </div>
      )}
      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        {[
          {to:'/reference/wiki', label:'User guide', desc:'End-to-end SOX engagement walkthrough', color:'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'},
          {to:'/reference/faq', label:'FAQ', desc:'15 common questions on PCAOB standards and platform use', color:'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'},
          {to:'/reference/limitations', label:'Known limitations', desc:'What the platform does and does not do', color:'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'},
        ].map(l=>(
          <Link key={l.to} to={l.to} className={`card card-hover border ${l.color} p-4`}>
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{l.label} →</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
