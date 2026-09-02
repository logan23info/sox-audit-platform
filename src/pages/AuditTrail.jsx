import { useEffect, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { getAuditLog } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

const ACTION_COLOR = { INSERT:'badge-green', UPDATE:'badge-blue', DELETE:'badge-red' }
const TABLE_LABELS = {
  sox_rcm:'RCM', sox_findings:'Findings', sox_deficiency_log:'Deficiency Log',
  sox_remediation:'Remediation', sox_workpaper_shells:'Workpapers', sox_mgmt_assertions:'Assertions'
}

export default function AuditTrail() {
  const { programmeId } = useProgramme()
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const load = () => {
    if (!programmeId) return
    setLoading(true)
    getAuditLog(programmeId).then(d=>setRows(d||[])).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[programmeId])

  const tables = ['ALL',...new Set(rows.map(r=>r.table_name))]
  const visible = filter==='ALL' ? rows : rows.filter(r=>r.table_name===filter)

  if (!programmeId) return <div className="p-6 text-gray-400">Select an engagement.</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><History size={12}/>Audit Trail</>} title="Audit trail"
        subtitle={`${rows.length} events logged across 6 tables`}
        actions={<button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13}/>Refresh</button>} />

      <div className="flex gap-2 flex-wrap mb-4">
        {tables.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} className={`btn btn-sm ${filter===t?'btn-primary':'btn-outline'}`}>
            {TABLE_LABELS[t]||t}
          </button>
        ))}
      </div>

      {loading ? <Spinner full /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>Time</th><th>Table</th><th>Action</th><th>Record ID</th><th>Changes</th>
              </tr></thead>
              <tbody>
                {visible.length===0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No audit events yet. Events are logged when records are created, updated, or deleted.</td></tr>
                )}
                {visible.map(r=>(
                  <tr key={r.id}>
                    <td className="text-xs text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td><span className="mono">{TABLE_LABELS[r.table_name]||r.table_name}</span></td>
                    <td><span className={`badge ${ACTION_COLOR[r.action]||'badge-gray'}`}>{r.action}</span></td>
                    <td><span className="mono text-xs">{r.record_id?.slice(0,8)}…</span></td>
                    <td className="text-xs text-gray-500 max-w-xs">
                      {r.action==='UPDATE' && r.old_data && r.new_data && (
                        <span>
                          {Object.keys(r.new_data).filter(k=>r.new_data[k]!==r.old_data[k]&&k!=='updated_at').slice(0,3).map(k=>(
                            <span key={k} className="inline-block mr-2"><strong>{k}</strong>: {String(r.old_data[k]).slice(0,20)} → {String(r.new_data[k]).slice(0,20)}</span>
                          ))}
                        </span>
                      )}
                      {r.action==='INSERT' && <span className="text-green-600">New record created</span>}
                      {r.action==='DELETE' && <span className="text-red-600">Record deleted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
