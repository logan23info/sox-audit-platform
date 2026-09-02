import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ToastProvider }     from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider }     from './context/ThemeContext'
import { ProgrammeProvider } from './context/ProgrammeContext'
import AppShell              from './components/AppShell'
import Spinner               from './components/Spinner'

const lazy_ = (fn) => lazy(fn)
const AuthPage       = lazy_(() => import('./pages/AuthPage'))
const Dashboard      = lazy_(() => import('./pages/Dashboard'))
const Programmes     = lazy_(() => import('./pages/Programmes'))
const Settings       = lazy_(() => import('./pages/Settings'))
const Team           = lazy_(() => import('./pages/Team'))
const Scoping        = lazy_(() => import('./pages/plan/Scoping'))
const RCM            = lazy_(() => import('./pages/plan/RCM'))
const WorkpaperSetup = lazy_(() => import('./pages/plan/WorkpaperSetup'))
const MultiEntity    = lazy_(() => import('./pages/plan/MultiEntity'))
const IPEValidation  = lazy_(() => import('./pages/execute/IPEValidation'))
const SampleTesting  = lazy_(() => import('./pages/execute/SampleTesting'))
const JETesting      = lazy_(() => import('./pages/execute/JETesting'))
const Findings       = lazy_(() => import('./pages/execute/Findings'))
const DeficiencyLog  = lazy_(() => import('./pages/execute/DeficiencyLog'))
const SoDMatrix      = lazy_(() => import('./pages/execute/SoDMatrix'))
const Remediation    = lazy_(() => import('./pages/manage/Remediation'))
const VendorSOC1     = lazy_(() => import('./pages/manage/VendorSOC1'))
const Reliance       = lazy_(() => import('./pages/manage/Reliance'))
const Assertions     = lazy_(() => import('./pages/manage/Assertions'))
const Standards      = lazy_(() => import('./pages/manage/Standards'))
const Reports        = lazy_(() => import('./pages/manage/Reports'))
const Frameworks     = lazy_(() => import('./pages/reference/Frameworks'))
const CloudITGC      = lazy_(() => import('./pages/reference/CloudITGC'))
const ERPGuides      = lazy_(() => import('./pages/reference/ERPGuides'))
const SectorControls = lazy_(() => import('./pages/reference/SectorControls'))
const InterviewPrep  = lazy_(() => import('./pages/reference/InterviewPrep'))

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner full />
  if (!user)   return <Navigate to="/auth" replace />
  return (
    <ProgrammeProvider>
      <AppShell>
        <Suspense fallback={<Spinner full />}>
          <Routes>
            <Route path="/dashboard"            element={<Dashboard />} />
            <Route path="/programmes"           element={<Programmes />} />
            <Route path="/settings"             element={<Settings />} />
            <Route path="/team"                 element={<Team />} />
            <Route path="/plan/scoping"         element={<Scoping />} />
            <Route path="/plan/rcm"             element={<RCM />} />
            <Route path="/plan/workpapers"      element={<WorkpaperSetup />} />
            <Route path="/plan/entities"        element={<MultiEntity />} />
            <Route path="/execute/ipe"          element={<IPEValidation />} />
            <Route path="/execute/testing"      element={<SampleTesting />} />
            <Route path="/execute/je-testing"   element={<JETesting />} />
            <Route path="/execute/findings"     element={<Findings />} />
            <Route path="/execute/deficiencies" element={<DeficiencyLog />} />
            <Route path="/execute/sod"          element={<SoDMatrix />} />
            <Route path="/manage/remediation"   element={<Remediation />} />
            <Route path="/manage/vendors"       element={<VendorSOC1 />} />
            <Route path="/manage/reliance"      element={<Reliance />} />
            <Route path="/manage/assertions"    element={<Assertions />} />
            <Route path="/manage/standards"     element={<Standards />} />
            <Route path="/manage/reports"       element={<Reports />} />
            <Route path="/reference/frameworks" element={<Frameworks />} />
            <Route path="/reference/cloud-itgc" element={<CloudITGC />} />
            <Route path="/reference/erp-guides" element={<ERPGuides />} />
            <Route path="/reference/sector"     element={<SectorControls />} />
            <Route path="/reference/interview"  element={<InterviewPrep />} />
            <Route path="*"                     element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ProgrammeProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Suspense fallback={<Spinner full />}><AuthPage /></Suspense>} />
              <Route path="/*"   element={<Protected />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  )
}
