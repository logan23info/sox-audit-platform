import { useEffect, useState } from 'react'
import { Search, AlertTriangle, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react'
import { getExecutiveData } from '../lib/supabase'
import { exportPDF } from '../lib/exportUtils'
import { useProgramme } from '../context/ProgrammeContext'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

// Rule engine — each rule mirrors a documented PCAOB inspection finding theme
const RULES = [
  {
    id:'IPE-01', area:'IPE validation', severity:'Critical', ref:'AS 1105.10A',
    title:'System-generated reports not validated',
    inspector:'Did you test the completeness and accuracy of every report used as audit evidence?',
    check: d => {
      const bad = d.ipe.filter(i=>!i.validated).length
      return { fail: bad>0, detail: bad>0 ? `${bad} of ${d.ipe.length} IPE records not marked validated` : `All ${d.ipe.length} IPE records validated`, count: bad }
    }
  },
  {
    id:'IPE-02', area:'IPE validation', severity:'Critical', ref:'AS 1105.10A',
    title:'Workpapers with no IPE validation recorded',
    inspector:'Which report did you use for the population, and how did you validate it?',
    check: d => {
      const bad = d.workpapers.filter(w=>!w.ipe_validated).length
      return { fail: bad>0, detail: bad>0 ? `${bad} of ${d.workpapers.length} workpapers not flagged IPE validated` : 'All workpapers IPE validated', count: bad }
    }
  },
  {
    id:'JE-01', area:'JE testing', severity:'Critical', ref:'AS 2110.61',
    title:'No JE testing performed',
    inspector:'JE testing is a required fraud risk procedure — where is it?',
    check: d => {
      const none = d.rcm.filter(c=>c.domain==='JE').length===0
      return { fail: none, detail: none ? 'No JE domain controls found in the RCM' : 'JE controls present in RCM', count: none?1:0 }
    }
  },
  {
    id:'FIND-01', area:'Findings', severity:'High', ref:'AS 2201.62–.70',
    title:'Non-conformity findings without documented root cause',
    inspector:'What was the root cause? A symptom is not a root cause.',
    check: d => {
      const bad = d.findings.filter(f=>['Major NC','Minor NC'].includes(f.classification) && !f.root_cause?.trim()).length
      return { fail: bad>0, detail: bad>0 ? `${bad} NC findings have no root cause documented` : 'All NC findings have root cause', count: bad }
    }
  },
  {
    id:'FIND-02', area:'Findings', severity:'High', ref:'AS 1215',
    title:'Findings still in DRAFT status',
    inspector:'Is this an audit record or a working note? Unsigned findings are not evidence.',
    check: d => {
      const bad = d.findings.filter(f=>f.is_draft).length
      return { fail: bad>0, detail: bad>0 ? `${bad} findings remain unsigned (DRAFT)` : 'All findings signed off', count: bad }
    }
  },
  {
    id:'DEF-01', area:'Deficiencies', severity:'Critical', ref:'AS 2201.69, SEC Item 9A',
    title:'Material weakness open without disclosure workflow complete',
    inspector:'A material weakness requires public disclosure. Where is the §302 impact assessment?',
    check: d => {
      const mw = d.defs.filter(x=>x.classification==='MW' && x.status==='Open').length
      const assertReflects = d.assertions.some(a=>a.has_mw)
      const fail = mw>0 && !assertReflects
      return { fail, detail: fail ? `${mw} open MW but no assertion flags a material weakness` : mw>0 ? `${mw} MW open, assertion reflects it` : 'No open MW', count: fail?mw:0 }
    }
  },
  {
    id:'DEF-02', area:'Deficiencies', severity:'High', ref:'AS 2201.78',
    title:'Significant deficiencies not communicated to audit committee',
    inspector:'SDs require written communication before fiscal year end. Show me the date.',
    check: d => {
      const bad = d.defs.filter(x=>x.classification==='SD' && x.status==='Open' && !x.comm_date).length
      return { fail: bad>0, detail: bad>0 ? `${bad} open SDs have no communication date recorded` : 'All open SDs communicated', count: bad }
    }
  },
  {
    id:'RCM-01', area:'Control coverage', severity:'High', ref:'AS 2201.39',
    title:'Controls in the RCM never tested',
    inspector:'You identified this as a key control. Why was it not tested?',
    check: d => {
      const bad = d.rcm.filter(c=>c.status==='Not Tested').length
      return { fail: bad>0, detail: bad>0 ? `${bad} of ${d.rcm.length} controls remain Not Tested` : 'All controls tested', count: bad }
    }
  },
  {
    id:'RCM-02', area:'Control coverage', severity:'Medium', ref:'AS 1215',
    title:'Controls with no corresponding workpaper',
    inspector:'Where is the workpaper supporting this control conclusion?',
    check: d => {
      const wpIds = new Set(d.workpapers.map(w=>w.control_id).filter(Boolean))
      const bad = d.rcm.filter(c=>c.status!=='Not Tested' && c.control_id && !wpIds.has(c.control_id)).length
      return { fail: bad>0, detail: bad>0 ? `${bad} tested controls have no workpaper` : 'All tested controls have workpapers', count: bad }
    }
  },
  {
    id:'SOC-01', area:'Service organisations', severity:'High', ref:'AS 2601',
    title:'CUECs not tested before placing reliance',
    inspector:'You relied on this SOC 1. Which CUECs did you test?',
    check: d => {
      const relied = d.vendors.filter(v=>v.reliance_decision==='place' || v.reliance_decision==='partial')
      const untested = d.cuecs.filter(c=>!c.tested).length
      const noCuecs = relied.filter(v=>!d.cuecs.some(c=>c.vendor_review_id===v.id)).length
      const fail = untested>0 || noCuecs>0
      return { fail, detail: fail ? `${untested} untested CUECs; ${noCuecs} reliance vendors with no CUECs recorded` : 'All CUECs tested for reliance vendors', count: untested+noCuecs }
    }
  },
  {
    id:'QC-01', area:'Quality control', severity:'Critical', ref:'QC 1000',
    title:'Engagement quality review not completed',
    inspector:'QC 1000 requires EQR concurrence before report issuance.',
    check: d => {
      const done = d.qc.some(q=>q.status==='Complete' && q.conclusion==='Concur')
      const reportIssued = d.reports.some(r=>r.status==='Final')
      const fail = reportIssued && !done
      return { fail, detail: fail ? 'Report marked Final but no QC concurrence recorded' : done ? 'QC review complete and concurred' : 'QC review not yet complete (report not yet issued)', count: fail?1:0 }
    }
  },
  {
    id:'QC-02', area:'Quality control', severity:'Critical', ref:'QC 1000',
    title:'QC reviewer did not concur',
    inspector:'Your EQR did not concur. Why was the report issued?',
    check: d => {
      const adverse = d.qc.some(q=>q.conclusion==='Do not concur')
      return { fail: adverse, detail: adverse ? 'QC reviewer recorded "Do not concur"' : 'No adverse QC conclusion', count: adverse?1:0 }
    }
  },
  {
    id:'REM-01', area:'Remediation', severity:'Medium', ref:'AS 2201.72',
    title:'Remediation actions overdue',
    inspector:'These remediations passed their target date. What is the current status?',
    check: d => {
      const today = new Date().toISOString().slice(0,10)
      const bad = d.rem.filter(r=>r.status!=='Closed' && r.target_date && r.target_date<today).length
      return { fail: bad>0, detail: bad>0 ? `${bad} remediation actions past target date` : 'No overdue remediations', count: bad }
    }
  },
  {
    id:'DOC-01', area:'Documentation', severity:'Medium', ref:'AS 1215',
    title:'Workpapers not marked Complete or Reviewed',
    inspector:'Was this workpaper reviewed? By whom, and when?',
    check: d => {
      const bad = d.workpapers.filter(w=>!['Complete','Reviewed'].includes(w.status)).length
      return { fail: bad>0, detail: bad>0 ? `${bad} of ${d.workpapers.length} workpapers not Complete/Reviewed` : 'All workpapers finalised', count: bad }
    }
  },
  {
    id:'CERT-01', area:'Certification', severity:'High', ref:'SOX §302 / §404',
    title:'Management assertion not finalised',
    inspector:'The audit is complete. Where is the signed management assertion?',
    check: d => {
      const reportIssued = d.reports.some(r=>r.status==='Final')
      const signed = d.assertions.some(a=>a.status==='Final')
      const fail = reportIssued && !signed
      return { fail, detail: fail ? 'Report issued but no final assertion' : signed ? 'Assertion finalised' : 'Assertion pending (report not yet issued)', count: fail?1:0 }
    }
  },
]

const sevBadge = s => s==='Critical'?'badge-red':s==='High'?'badge-amber':'badge-blue'
const sevOrder = { Critical:3, High:2, Medium:1 }

export default function InspectionReadiness() {
  const { programmeId, programme } = useProgramme()
  const [d, setD]           = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('issues')

  const load = () => {
    if (!programmeId) return
    setLoading(true)
    getExecutiveData(programmeId).then(setD).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[programmeId])

  if (!programmeId) return <div className="p-6 text-gray-400">Select an engagement.</div>
  if (loading || !d) return <Spinner full />

  const results = RULES.map(r => ({ ...r, ...r.check(d) }))
    .sort((a,b)=>(b.fail-a.fail)||((sevOrder[b.severity]||0)-(sevOrder[a.severity]||0)))

  const failed   = results.filter(r=>r.fail)
  const passed   = results.filter(r=>!r.fail)
  const critical = failed.filter(r=>r.severity==='Critical').length
  const high     = failed.filter(r=>r.severity==='High').length
  const score    = Math.round((passed.length/results.length)*100)

  const visible = filter==='issues' ? failed : filter==='passed' ? passed : results

  const scoreColor = score>=90?'text-green-600':score>=70?'text-amber-600':'text-red-600'
  const scoreBg    = score>=90?'bg-green-500':score>=70?'bg-amber-500':'bg-red-500'

  const doExport = () => {
    exportPDF({
      filename: `${programme?.name||'SOX'}_Inspection_Readiness`.replace(/\s+/g,'_'),
      title: 'PCAOB Inspection Readiness Assessment',
      subtitle: `${programme?.name||''} · FY${programme?.fiscal_year||''} · Score ${score}% · ${new Date().toLocaleDateString()}`,
      sections: [
        { heading:'Summary', text:`${failed.length} of ${results.length} checks failed. ${critical} critical, ${high} high severity. Readiness score: ${score}%.\n\nThis assessment applies rule-based checks derived from documented PCAOB inspection finding themes. It is an internal readiness indicator, not a substitute for firm quality review.` },
        ...(failed.length ? [{ heading:`Issues to address (${failed.length})`, columns:['ID','Severity','Area','Issue','Detail','Reference'],
          rows: failed.map(r=>[r.id, r.severity, r.area, r.title, r.detail, r.ref]) }] : []),
        { heading:`Checks passed (${passed.length})`, columns:['ID','Area','Check','Reference'],
          rows: passed.map(r=>[r.id, r.area, r.title, r.ref]) },
      ]
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Search size={12}/>Inspection Readiness</>} title="PCAOB inspection simulation"
        subtitle="Rule-based scan against documented PCAOB inspection finding themes — what an inspector would challenge."
        actions={<div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13}/>Re-scan</button>
          <button className="btn btn-outline btn-sm" onClick={doExport}><Download size={13}/>Export PDF</button>
        </div>} />

      {/* Score */}
      <div className="card mb-5">
        <div className="flex items-center gap-6">
          <div className="text-center flex-shrink-0">
            <div className={`text-5xl font-bold ${scoreColor}`}>{score}%</div>
            <div className="text-xs text-gray-400 mt-1">Readiness score</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${scoreBg}`} style={{width:`${score}%`}}/>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{passed.length} passed</span>
              {critical>0 && <span className="text-red-600 font-semibold">{critical} critical</span>}
              {high>0 && <span className="text-amber-600 font-semibold">{high} high</span>}
              {failed.length-critical-high>0 && <span className="text-blue-600">{failed.length-critical-high} medium</span>}
            </div>
          </div>
        </div>
      </div>

      {critical>0 && (
        <div className="alert-danger mb-4">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5"/>
          <div><strong>{critical} critical issue{critical>1?'s':''}</strong> — these map to the most frequently cited PCAOB inspection findings. Address before report issuance.</div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[['issues',`Issues (${failed.length})`],['passed',`Passed (${passed.length})`],['all',`All (${results.length})`]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-outline'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length===0 && <div className="card text-center py-10 text-sm text-gray-400">Nothing in this view.</div>}
        {visible.map(r=>(
          <div key={r.id} className={`card ${r.fail?(r.severity==='Critical'?'border-red-200 dark:border-red-900':'border-amber-200 dark:border-amber-900'):''}`}>
            <div className="flex items-start gap-3">
              {r.fail
                ? <XCircle size={16} className={`flex-shrink-0 mt-0.5 ${r.severity==='Critical'?'text-red-500':'text-amber-500'}`}/>
                : <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-green-500"/>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="mono text-xs">{r.id}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{r.title}</span>
                  {r.fail && <span className={`badge ${sevBadge(r.severity)}`}>{r.severity}</span>}
                  <span className="badge badge-gray text-xs">{r.ref}</span>
                </div>
                <p className={`text-sm ${r.fail?'text-gray-700 dark:text-gray-300':'text-gray-500 dark:text-gray-400'}`}>{r.detail}</p>
                {r.fail && (
                  <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-surface-3 border-l-2 border-gray-300 dark:border-gray-600">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">What an inspector would ask</div>
                    <p className="text-xs italic text-gray-600 dark:text-gray-400">"{r.inspector}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="alert-info mt-5">
        <span className="text-xs">These checks are rule-based indicators derived from publicly documented PCAOB inspection finding themes. They are an internal readiness aid, not a substitute for firm quality control review or professional judgment. A 100% score does not guarantee inspection outcomes.</span>
      </div>
    </div>
  )
}
