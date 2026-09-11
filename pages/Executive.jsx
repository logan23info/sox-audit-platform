import { useEffect, useState } from 'react'
import { Briefcase, AlertTriangle, CheckCircle, XCircle, Clock, Download, TrendingUp } from 'lucide-react'
import { getExecutiveData, getProgrammes, getComparisonData } from '../lib/supabase'
import { exportPDF } from '../lib/exportUtils'
import { useProgramme } from '../context/ProgrammeContext'
import { DOMAINS } from '../constants'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

const light = (ok, warn) => ok ? 'bg-green-500' : warn ? 'bg-amber-500' : 'bg-red-500'

export default function Executive() {
  const { programmeId, programme } = useProgramme()
  const [d, setD]           = useState(null)
  const [loading, setLoading] = useState(false)
  const [prior, setPrior]   = useState(null)

  useEffect(() => {
    if (!programmeId) return
    setLoading(true)
    getExecutiveData(programmeId).then(setD).finally(()=>setLoading(false))
    // Load prior year for trend
    getProgrammes().then(async ps => {
      const others = (ps||[]).filter(p=>p.id!==programmeId)
      if (others.length) {
        const comp = await getComparisonData([others[0].id])
        setPrior(comp?.[0])
      }
    })
  }, [programmeId])

  if (!programmeId) return <div className="p-6 text-gray-400">Select an engagement.</div>
  if (loading || !d) return <Spinner full />

  // ── Derived metrics ───────────────────────────────────────
  const mwOpen  = d.defs.filter(x=>x.classification==='MW' && x.status==='Open')
  const sdOpen  = d.defs.filter(x=>x.classification==='SD' && x.status==='Open')
  const sdNoComm = sdOpen.filter(x=>!x.comm_date)
  const icfrEffective = mwOpen.length === 0

  const controlsTotal   = d.rcm.length
  const controlsTested  = d.rcm.filter(c=>c.status!=='Not Tested').length
  const testedPct       = controlsTotal ? Math.round(controlsTested/controlsTotal*100) : 0

  const findingsSigned  = d.findings.filter(f=>!f.is_draft).length
  const findingsPct     = d.findings.length ? Math.round(findingsSigned/d.findings.length*100) : 100

  const remClosed = d.rem.filter(r=>r.status==='Closed').length
  const remPct    = d.rem.length ? Math.round(remClosed/d.rem.length*100) : 100

  const msComplete = d.milestones.filter(m=>m.status==='Complete').length
  const msPct      = d.milestones.length ? Math.round(msComplete/d.milestones.length*100) : 0

  const qcDone     = d.qc.some(q=>q.status==='Complete' && q.conclusion==='Concur')
  const qcAdverse  = d.qc.some(q=>q.conclusion==='Do not concur')
  const assertSigned = d.assertions.some(a=>a.status==='Final')
  const reportFinal  = d.reports.some(r=>r.status==='Final')
  const ipeAll     = d.ipe.length===0 || d.ipe.every(i=>i.validated)
  const cuecsAll   = d.cuecs.length===0 || d.cuecs.every(c=>c.tested)

  // Risk heatmap — domain × severity
  const heat = DOMAINS.map(dom => ({
    domain: dom.id,
    label: dom.label,
    critical: d.findings.filter(f=>f.domain===dom.id && f.severity==='Critical').length,
    high:     d.findings.filter(f=>f.domain===dom.id && f.severity==='High').length,
    medium:   d.findings.filter(f=>f.domain===dom.id && f.severity==='Medium').length,
    low:      d.findings.filter(f=>f.domain===dom.id && f.severity==='Low').length,
  }))
  const heatCell = n => n===0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
    : n<=1 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    : n<=3 ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
    : 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'

  // Top 5 issues by severity
  const sevRank = { Critical:4, High:3, Medium:2, Low:1 }
  const topIssues = [...d.findings]
    .filter(f=>['Major NC','Minor NC'].includes(f.classification))
    .sort((a,b)=>(sevRank[b.severity]||0)-(sevRank[a.severity]||0))
    .slice(0,5)

  const readiness = [
    { label:'All IPE validated',        ok: ipeAll,        warn:false },
    { label:'All CUECs tested',         ok: cuecsAll,      warn:false },
    { label:'Findings signed off',      ok: findingsPct===100, warn: findingsPct>=50 },
    { label:'QC 1000 review concurred', ok: qcDone,        warn: d.qc.length>0 },
    { label:'§302/§404 assertion final',ok: assertSigned,  warn: d.assertions.length>0 },
    { label:'Audit report issued',      ok: reportFinal,   warn: d.reports.length>0 },
  ]

  const doExport = () => {
    exportPDF({
      filename: `${programme?.name||'SOX'}_Executive_Summary`.replace(/\s+/g,'_'),
      title: `Executive Summary — ${programme?.name||''}`,
      subtitle: `FY${programme?.fiscal_year||''} · SOX 404 ICFR Assessment · ${new Date().toLocaleDateString()}`,
      sections: [
        { heading:'ICFR Conclusion', text: icfrEffective
          ? 'Based on procedures performed to date, no material weaknesses have been identified. Internal control over financial reporting is assessed as effective, subject to completion of remaining audit procedures.'
          : `${mwOpen.length} material weakness(es) identified. Internal control over financial reporting cannot be concluded as effective. Public disclosure required in Form 10-K Item 9A. CEO/CFO §302 certification must reflect this conclusion.` },
        { heading:'Disclosure Obligations', columns:['Obligation','Count','Action required'], rows:[
          ['Material weakness — 10-K Item 9A', mwOpen.length, mwOpen.length?'Public disclosure required':'None'],
          ['Significant deficiency — audit committee', sdOpen.length, sdNoComm.length?`${sdNoComm.length} not yet communicated`:'Communicated'],
        ]},
        { heading:'Engagement Completion', columns:['Metric','Progress'], rows:[
          ['Controls tested', `${controlsTested}/${controlsTotal} (${testedPct}%)`],
          ['Findings signed off', `${findingsSigned}/${d.findings.length} (${findingsPct}%)`],
          ['Remediations closed', `${remClosed}/${d.rem.length} (${remPct}%)`],
          ['Milestones complete', `${msComplete}/${d.milestones.length} (${msPct}%)`],
        ]},
        { heading:'Risk Concentration by Domain', columns:['Domain','Critical','High','Medium','Low'],
          rows: heat.map(h=>[h.label, h.critical, h.high, h.medium, h.low]) },
        ...(topIssues.length ? [{ heading:'Top Issues Requiring Attention', columns:['Control','Domain','Finding','Severity'],
          rows: topIssues.map(f=>[f.control_id||'—', f.domain||'—', f.title, f.severity||'—']) }] : []),
        { heading:'Certification Readiness', columns:['Gate','Status'],
          rows: readiness.map(r=>[r.label, r.ok?'Complete':'Outstanding']) },
      ]
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Briefcase size={12}/>Executive</>} title="Executive summary"
        subtitle={`${programme?.name} · FY${programme?.fiscal_year} · Audit committee & management view`}
        actions={<button className="btn btn-outline btn-sm" onClick={doExport}><Download size={13}/>Board pack (PDF)</button>} />

      {/* Headline verdict */}
      <div className={`card mb-5 border-2 ${icfrEffective?'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10':'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}>
        <div className="flex items-start gap-4">
          {icfrEffective ? <CheckCircle size={32} className="text-green-600 flex-shrink-0"/> : <XCircle size={32} className="text-red-600 flex-shrink-0"/>}
          <div>
            <div className={`text-xl font-bold ${icfrEffective?'text-green-800 dark:text-green-300':'text-red-800 dark:text-red-300'}`}>
              ICFR {icfrEffective ? 'Effective' : 'Not Effective'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {icfrEffective
                ? 'No material weaknesses identified. Conclusion subject to completion of remaining audit procedures and QC review.'
                : `${mwOpen.length} material weakness${mwOpen.length>1?'es':''} identified. Public disclosure required in Form 10-K Item 9A. CEO/CFO §302 certification must reflect this conclusion.`}
            </p>
          </div>
        </div>
      </div>

      {/* Disclosure obligations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className={`card ${mwOpen.length?'border-red-200 dark:border-red-900':''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">10-K Item 9A disclosure</span>
            <AlertTriangle size={14} className={mwOpen.length?'text-red-500':'text-gray-300'}/>
          </div>
          <div className={`text-3xl font-bold ${mwOpen.length?'text-red-600':'text-gray-900 dark:text-white'}`}>{mwOpen.length}</div>
          <p className="text-xs text-gray-500 mt-1">{mwOpen.length?'Material weakness — public disclosure required':'No material weaknesses'}</p>
          {mwOpen.length>0 && <div className="mt-2 space-y-1">{mwOpen.slice(0,3).map(m=><div key={m.ref} className="text-xs mono text-red-600">{m.ref}</div>)}</div>}
        </div>
        <div className={`card ${sdNoComm.length?'border-amber-200 dark:border-amber-900':''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Audit committee communication</span>
            <Clock size={14} className={sdNoComm.length?'text-amber-500':'text-gray-300'}/>
          </div>
          <div className={`text-3xl font-bold ${sdNoComm.length?'text-amber-600':'text-gray-900 dark:text-white'}`}>{sdOpen.length}</div>
          <p className="text-xs text-gray-500 mt-1">
            {sdNoComm.length ? `${sdNoComm.length} significant deficienc${sdNoComm.length>1?'ies':'y'} not yet communicated` : 'All communicated or none open'}
          </p>
        </div>
      </div>

      {/* Completion progress */}
      <div className="card mb-5">
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Engagement completion</h3>
        <div className="space-y-3">
          {[
            {label:'Controls tested', val:testedPct, detail:`${controlsTested}/${controlsTotal}`},
            {label:'Findings signed off', val:findingsPct, detail:`${findingsSigned}/${d.findings.length}`},
            {label:'Remediations closed', val:remPct, detail:`${remClosed}/${d.rem.length}`},
            {label:'Milestones complete', val:msPct, detail:`${msComplete}/${d.milestones.length}`},
          ].map(m=>(
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{m.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{m.detail} · {m.val}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${m.val>=80?'bg-green-500':m.val>=50?'bg-amber-500':'bg-red-500'}`} style={{width:`${m.val}%`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk heatmap */}
      <div className="card mb-5">
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Risk concentration by domain</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500">
              <th className="text-left pb-2 font-medium">Domain</th>
              <th className="pb-2 font-medium">Critical</th><th className="pb-2 font-medium">High</th>
              <th className="pb-2 font-medium">Medium</th><th className="pb-2 font-medium">Low</th>
            </tr></thead>
            <tbody>{heat.map(h=>(
              <tr key={h.domain}>
                <td className="py-1.5 text-xs text-gray-700 dark:text-gray-300">{h.domain} — {h.label}</td>
                {['critical','high','medium','low'].map(sev=>(
                  <td key={sev} className="py-1.5 px-1">
                    <div className={`rounded-md text-center py-1.5 text-xs font-semibold ${heatCell(h[sev])}`}>{h[sev]}</div>
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Top issues */}
      {topIssues.length>0 && (
        <div className="card mb-5">
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Top issues requiring attention</h3>
          <div className="space-y-2">
            {topIssues.map((f,i)=>(
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-3">
                <span className={`badge flex-shrink-0 ${f.severity==='Critical'||f.severity==='High'?'badge-red':f.severity==='Medium'?'badge-amber':'badge-gray'}`}>{f.severity||'—'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200">{f.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{f.control_id} · {f.domain} · {f.classification}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend vs prior */}
      {prior && (
        <div className="card mb-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={14} className="text-brand-600"/><h3 className="font-semibold text-sm text-gray-900 dark:text-white">Year-over-year trend</h3></div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              {label:'Findings', now:d.findings.length, was:prior.findings_total},
              {label:'Open MW', now:mwOpen.length, was:prior.mw_open},
              {label:'Open SD', now:sdOpen.length, was:prior.sd_open},
            ].map(t=>{
              const delta = t.now - t.was
              return (
                <div key={t.label} className="p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-3">
                  <div className="text-xs text-gray-500 mb-1">{t.label}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{t.now}</div>
                  <div className={`text-xs mt-0.5 ${delta>0?'text-red-500':delta<0?'text-green-600':'text-gray-400'}`}>
                    {delta>0?'▲':delta<0?'▼':'—'} {Math.abs(delta)} vs {prior.fiscal_year}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Certification readiness */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Certification readiness</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {readiness.map(r=>(
            <div key={r.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-surface-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${light(r.ok, r.warn)}`}/>
              <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
              <span className={`badge ml-auto ${r.ok?'badge-green':'badge-amber'}`}>{r.ok?'Complete':'Outstanding'}</span>
            </div>
          ))}
        </div>
        {qcAdverse && <div className="alert-danger mt-3"><AlertTriangle size={14}/><span className="text-sm font-medium">QC reviewer did not concur — report must not be issued until matters are resolved (QC 1000).</span></div>}
      </div>
    </div>
  )
}
