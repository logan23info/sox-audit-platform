import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { getPortalData } from '../lib/supabase'
import Spinner from '../components/Spinner'

const classColor = c => c==='MW'?'badge-red':c==='SD'?'badge-amber':c==='CD'?'badge-blue':'badge-gray'

export default function ClientPortal() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!token) { setError('No access token provided.'); setLoading(false); return }
    getPortalData(token).then(d => {
      if (!d) setError('Invalid or expired access token.')
      else setData(d)
    }).finally(() => setLoading(false))
  }, [token])

  if (loading) return <Spinner full />

  if (error) return (
    <div className="min-h-screen bg-surface-2 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center p-8">
        <Shield size={40} className="mx-auto text-gray-300 mb-4"/>
        <h2 className="font-bold text-gray-900 dark:text-white mb-2">Access denied</h2>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    </div>
  )

  const mwCount = data.deficiencies.filter(d=>d.classification==='MW'&&d.status==='Open').length
  const sdCount = data.deficiencies.filter(d=>d.classification==='SD'&&d.status==='Open').length
  const openRem = data.remediation.filter(r=>r.status!=='Closed').length

  return (
    <div className="min-h-screen bg-surface-2 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center"><Shield size={16} className="text-white"/></div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white">{data.programme?.name}</div>
            <div className="text-xs text-gray-400">SOX Audit Portal · FY{data.programme?.fiscal_year} · Read-only management view</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:'Total findings',val:data.findings.length,icon:AlertTriangle,warn:false},
            {label:'Open MW',val:mwCount,icon:AlertTriangle,warn:mwCount>0},
            {label:'Open SD',val:sdCount,icon:Clock,warn:sdCount>0},
            {label:'Open remediations',val:openRem,icon:Clock,warn:openRem>0},
          ].map(s=>(
            <div key={s.label} className={`card p-4 ${s.warn?'border-red-200 dark:border-red-900':''}`}>
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-500">{s.label}</span><s.icon size={14} className={s.warn?'text-red-500':'text-gray-400'}/></div>
              <div className={`text-2xl font-bold ${s.warn?'text-red-600':'text-gray-900 dark:text-white'}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {mwCount>0&&<div className="alert-danger"><AlertTriangle size={15}/><strong>{mwCount} material weakness — 10-K Item 9A public disclosure required.</strong></div>}

        {/* Deficiency log */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Deficiency log ({data.deficiencies.length})</h3>
          {data.deficiencies.length===0?<p className="text-sm text-gray-400">No deficiencies.</p>:(
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Ref</th><th>Classification</th><th>Audit comm.</th><th>Public disc.</th><th>Status</th></tr></thead>
                <tbody>{data.deficiencies.map(d=>(
                  <tr key={d.ref}>
                    <td className="mono">{d.ref}</td>
                    <td><span className={`badge ${classColor(d.classification)}`}>{d.classification}</span></td>
                    <td><span className={`badge ${d.audit_comm_req?'badge-amber':'badge-gray'}`}>{d.audit_comm_req?'Required':'No'}</span></td>
                    <td><span className={`badge ${d.public_disc_req?'badge-red':'badge-gray'}`}>{d.public_disc_req?'Required':'No'}</span></td>
                    <td><span className={`badge ${d.status==='Closed'?'badge-green':d.status==='Open'?'badge-red':'badge-amber'}`}>{d.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Remediation */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Remediation tracker ({data.remediation.length})</h3>
          {data.remediation.length===0?<p className="text-sm text-gray-400">No remediation actions.</p>:(
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Action</th><th>Owner</th><th>Target date</th><th>Status</th></tr></thead>
                <tbody>{data.remediation.map((r,i)=>(
                  <tr key={i}>
                    <td className="text-xs max-w-xs">{r.action}</td>
                    <td className="text-xs">{r.owner_role||'—'}</td>
                    <td className="text-xs">{r.target_date||'—'}</td>
                    <td><span className={`badge ${r.status==='Closed'?'badge-green':r.status==='Implemented'?'badge-blue':'badge-amber'}`}>{r.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Findings summary */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Signed-off findings ({data.findings.length})</h3>
          {data.findings.length===0?<p className="text-sm text-gray-400">No signed-off findings.</p>:(
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Control</th><th>Domain</th><th>Finding</th><th>Classification</th></tr></thead>
                <tbody>{data.findings.map((f,i)=>(
                  <tr key={i}>
                    <td className="mono text-xs">{f.control_id||'—'}</td>
                    <td><span className={`badge badge-${f.domain==='LA'?'blue':f.domain==='CM'?'green':f.domain==='CO'?'amber':f.domain==='PD'?'purple':'red'}`}>{f.domain}</span></td>
                    <td className="text-xs max-w-xs">{f.title}</td>
                    <td><span className={`badge ${f.classification==='Major NC'?'badge-red':f.classification==='Minor NC'?'badge-amber':f.classification==='Conforming'?'badge-green':'badge-gray'}`}>{f.classification||'—'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-gray-400">Read-only management view · SOX Audit Platform · {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
}
