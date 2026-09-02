import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useProgramme } from '../context/ProgrammeContext'
import { signOut } from '../lib/supabase'
import {
  LayoutDashboard, Target, FlaskConical, BarChart3, BookOpen,
  ChevronDown, ChevronRight, Sun, Moon, LogOut, Menu, X,
  Shield, Search, Bell, Settings, ChevronLeft, Users
} from 'lucide-react'

const NAV = [
  {
    mode: 'plan', label: 'Plan the Audit', icon: Target, color: 'text-blue-600',
    items: [
      { path: '/plan/scoping',    label: 'Scoping Worksheet' },
      { path: '/plan/rcm',        label: 'Risk & Control Matrix' },
      { path: '/plan/workpapers', label: 'Workpaper Setup' },
      { path: '/plan/entities',   label: 'Multi-Entity Register' },
    ]
  },
  {
    mode: 'execute', label: 'Execute Testing', icon: FlaskConical, color: 'text-green-600',
    items: [
      { path: '/execute/ipe',          label: 'IPE Validation' },
      { path: '/execute/testing',      label: 'Sample Testing' },
      { path: '/execute/je-testing',   label: 'JE Testing' },
      { path: '/execute/findings',     label: 'Finding Register' },
      { path: '/execute/deficiencies', label: 'Deficiency Log' },
      { path: '/execute/sod',          label: 'SoD Matrix' },
    ]
  },
  {
    mode: 'manage', label: 'Manage & Report', icon: BarChart3, color: 'text-purple-600',
    items: [
      { path: '/manage/remediation', label: 'Remediation Tracker' },
      { path: '/manage/vendors',     label: 'Vendor / SOC 1 Review' },
      { path: '/manage/reliance',    label: 'Auditor Reliance' },
      { path: '/manage/assertions',  label: '§302 / §404 Assertions' },
      { path: '/manage/standards',   label: 'Standards Tracker' },
      { path: '/manage/reports',     label: 'Audit Reports' },
    ]
  },
  {
    mode: 'reference', label: 'Reference', icon: BookOpen, color: 'text-amber-600',
    items: [
      { path: '/reference/frameworks',    label: 'Framework Crosswalk' },
      { path: '/reference/cloud-itgc',    label: 'Cloud ITGC' },
      { path: '/reference/erp-guides',    label: 'ERP Guides' },
      { path: '/reference/sector',        label: 'Sector Controls' },
      { path: '/reference/interview',     label: 'Interview Prep' },
    ]
  },
]

export default function AppShell({ children }) {
  const { user, profile }       = useAuth()
  const { dark, toggle }        = useTheme()
  const { programme, programmeId, selectProgramme } = useProgramme()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [open,    setOpen]    = useState(true)
  const [mobile,  setMobile]  = useState(false)
  const [expanded, setExpanded] = useState(() => {
    const seg = location.pathname.split('/')[1]
    return NAV.findIndex(n => n.mode === seg)
  })

  const handleSignOut = async () => { await signOut(); navigate('/auth') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {open && (
          <div>
            <div className="font-bold text-sm text-gray-900 dark:text-white">SOX Audit</div>
            <div className="text-xs text-gray-400">Platform v1</div>
          </div>
        )}
      </div>

      {/* Programme selector */}
      {open && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="label">Active engagement</div>
          <Link to="/programmes" className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-dark-surface-3 hover:bg-gray-100 dark:hover:bg-dark-surface text-sm">
            <span className="truncate font-medium text-gray-700 dark:text-gray-300">
              {programme?.name ?? 'Select programme…'}
            </span>
            <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={16} />
          {open && 'Dashboard'}
        </Link>
        <Link to="/team" className={`sidebar-link ${location.pathname === '/team' ? 'active' : ''}`}>
          <Users size={16} />
          {open && 'Team'}
        </Link>
        {NAV.map((section, idx) => {
          const Icon = section.icon
          const isExpanded = expanded === idx
          const isActive = location.pathname.startsWith(`/${section.mode}`)
          return (
            <div key={section.mode}>
              <button
                onClick={() => setExpanded(isExpanded ? -1 : idx)}
                className={`sidebar-link w-full justify-between ${isActive ? 'active' : ''}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} className={section.color} />
                  {open && section.label}
                </span>
                {open && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </button>
              {isExpanded && open && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {section.items.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobile(false)}
                      className={`sidebar-link text-xs py-1.5 ${location.pathname === item.path ? 'active' : ''}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        {open ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400 flex-shrink-0">
              {(profile?.full_name ?? user?.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{profile?.full_name ?? 'User'}</div>
              <div className="text-xs text-gray-400 truncate">{profile?.firm ?? user?.email}</div>
            </div>
            <button onClick={handleSignOut} className="btn-ghost p-1 rounded-lg" title="Sign out"><LogOut size={14} /></button>
          </div>
        ) : (
          <button onClick={handleSignOut} className="sidebar-link justify-center w-full" title="Sign out"><LogOut size={16} /></button>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ${open ? 'w-56' : 'w-14'} flex-shrink-0`}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-white dark:bg-dark-surface h-full shadow-xl"><SidebarContent /></div>
          <div className="flex-1 bg-black/40" onClick={() => setMobile(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="md:hidden btn-ghost p-1.5 rounded-lg" onClick={() => setMobile(true)}><Menu size={18} /></button>
            <button className="hidden md:flex btn-ghost p-1.5 rounded-lg" onClick={() => setOpen(o => !o)}>
              {open ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
            {programme && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-400 hidden sm:block">{programme.name}</span>
                <span className="badge badge-blue hidden sm:inline-flex">{programme.fiscal_year}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost p-1.5 rounded-lg" title="Search"><Search size={16} /></button>
            <button onClick={toggle} className="btn-ghost p-1.5 rounded-lg" title="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/settings" className="btn-ghost p-1.5 rounded-lg"><Settings size={16} /></Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {!programmeId && location.pathname !== '/programmes' && location.pathname !== '/dashboard' && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
              <span>⚠ No active engagement selected — data cannot load.</span>
              <a href="/programmes" className="font-semibold underline whitespace-nowrap">Select engagement →</a>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
