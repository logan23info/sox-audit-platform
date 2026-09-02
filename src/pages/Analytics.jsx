import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { TrendingUp, Bot, Loader, AlertTriangle, CheckCircle, Shield } from 'lucide-react'
import { getAnalyticsData, callAI } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import { DOMAINS } from '../constants'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

const COLORS = { High:'#dc2626', Medium:'#d97706', Low:'#16a34a', MW:'#dc2626', SD:'#d97706', CD:'#2563eb', 'CD-D':'#7c3aed', Open:'#dc2626', Closed:'#16a34a' }
const DOMAIN_COLORS = { LA:'#3b82f6', CM:'#22c55e', CO:'#f59e0b', PD:'#a855f7', JE:'#ef4444' }

const ANALYTICS_PROMPT = `[ROLE] SOX IT Audit analytics engine. Analyse the provided audit statistics and produce a structured report.
[OUTPUT] JSON only, no markdown, no preamble.
[SCHEMA] {"executive_summary":"string (3-4 sentences, audit committee language)","overall_opinion":"Clean|Qualified|Adverse|Insufficient Evidence","key_risks":[{"area":"string","finding":"string","severity":"High|Medium|Low"}],"recommendations":[{"action":"string","priority":"High|Medium|Low","owner_role":"string"}],"prompt_version":"analytics-v1"}
[RULES] overall_opinion = Adverse if any MW open. Qualified if SD open and no MW. Insufficient Evidence if >50% controls untested. Clean only if 0 MW, 0 open SD. DRAFT — human sign-off required.`

const opinionColor = o => o==='Adverse'?'badge-red':o==='Qualified'?'badge-amber':o==='Clean'?'badge-green':'badge-gray'

export default function Analytics() {
  const { programmeId, programme } = useProgramme()
  const { toast } = useToast()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [ai, setAi]           = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!programmeId) return
    setLoading(true)
    getAnalyticsData(programmeId).then(setData).finally(() => setLoading(false))
  }, [programmeId])

  if (!programmeId) return <div className="p-6 text-gray-400">Select an engagement to view analytics.</div>
  if (loading) return <Spinner full />

  // ── Derived stats ─────────────────────────────────────────
  const rcmByDomain = DOMAINS.map(d => ({
    domain: d.id,
    Effective: data?.rcm.filter(r => r.domain===d.id && r.status==='Effective').length || 0,
    'In Progress': data?.rcm.filter(r => r.domain===d.id && r.status==='In Progress').length || 0,
    Ineffective: data?.rcm.filter(r => r.domain===d.id && r.status==='Ineffective').length || 0,
    'Not Tested': data?.rcm.filter(r => r.domain===d.id && r.status==='Not Tested').length || 0,
  }))

  const defByClass = ['MW','SD','CD','CD-D'].map(c => ({ name:c, value: data?.deficiencies.filter(d=>d.classification===c).length||0 })).filter(x=>x.value>0)
  const remByStatus = ['Not Started','In Progress','Implemented','Re-testing','Closed'].map(s => ({ name:s, value: data?.remediation.filter(r=>r.status===s).length||0 })).filter(x=>x.value>0)
  const vendorReliance = ['place','partial','gap','none','direct'].map(r => ({ name:r, value: data?.vendors.filter(v=>v.reliance_decision===r).length||0 })).filter(x=>x.value>0)

  const totalTests = data?.testingItems.length || 0
  const exceptions = data?.testingItems.filter(t=>t.exception).length || 0
  const exceptionRate = totalTests > 0 ? Math.round((exceptions/totalTests)*100) : 0

  const totalControls = data?.rcm.length || 0
  const untestedPct = totalControls > 0 ? Math.round((data.rcm.filter(r=>r.status==='Not Tested').length/totalControls)*100) : 0
  const mwCount = data?.deficiencies.filter(d=>d.classification==='MW'&&d.status==='Open').length || 0
  const sdCount = data?.deficiencies.filter(d=>d.classification==='SD'&&d.status==='Open').length || 0
  const ipeValidated = data?.ipe.filter(i=>i.validated).length || 0
  const ipeTotal = data?.ipe.length || 0

  const domainExceptions = DOMAINS.map(d => ({
    domain: d.id,
    'Exception rate %': 0, // testing items don't have domain — aggregate only
  }))

  const runAI = async () => {
    setAiLoading(true)
    try {
      const stats = {
        engagement: programme?.name, fiscal_year: programme?.fiscal_year,
        controls: { total: totalControls, untested_pct: untestedPct, ineffective: data.rcm.filter(r=>r.status==='Ineffective').length },
        findings: { total: data.findings.length, by_classification: Object.fromEntries(['Major NC','Minor NC','Observation','Conforming'].map(c=>[c, data.findings.filter(f=>f.classification===c).length])) },
        deficiencies: { mw_open: mwCount, sd_open: sdCount, cd_open: data.deficiencies.filter(d=>d.classification==='CD'&&d.status==='Open').length },
        remediation: { open: data.remediation.filter(r=>r.status!=='Closed').length, closed: data.remediation.filter(r=>r.status==='Closed').length },
        testing: { total_items: totalTests, exceptions, exception_rate_pct: exceptionRate },
        ipe: { total: ipeTotal, validated: ipeValidated, unvalidated: ipeTotal - ipeValidated },
        vendors: { total: data.vendors.length, reliance_placed: data.vendors.filter(v=>v.reliance_decision==='place').length },
        je_segments: data.jeSegments.length,
      }
      const res = await callAI({ systemPrompt: ANALYTICS_PROMPT, userMessage: `Analyse this SOX audit data and return JSON: ${JSON.stringify(stats)}` })
      const clean = res.text.replace(/```json|```/g,'').replace(/^[^{]*/,'').trim()
      setAi(JSON.parse(clean))
      toast({ type:'success', title:'AI analysis complete — DRAFT' })
    } catch(e) {
      toast({ type:'error', title:'AI error', description: e.message })
    }
    setAiLoading(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader eyebrow={<><TrendingUp size={12}/>Analytics</>} title="Audit analytics"
        subtitle={`${programme?.name} · FY${programme?.fiscal_year} · ${totalControls} controls · ${data?.findings.length} findings`} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Controls untested', val:`${untestedPct}%`, warn: untestedPct>50, icon: Shield },
          { label:'Open MW', val: mwCount, warn: mwCount>0, icon: AlertTriangle },
          { label:'Open SD', val: sdCount, warn: sdCount>0, icon: AlertTriangle },
          { label:'Exception rate', val:`${exceptionRate}%`, warn: exceptionRate>10, icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.warn?'border-red-200 dark:border-red-900':''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{s.label}</span>
              <s.icon size={14} className={s.warn?'text-red-500':'text-gray-400'} />
            </div>
            <div className={`text-2xl font-bold ${s.warn?'text-red-600':'text-gray-900 dark:text-white'}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Control status by domain */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Control status by domain</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rcmByDomain} barSize={16}>
              <XAxis dataKey="domain" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} allowDecimals={false} />
              <Tooltip contentStyle={{fontSize:11}} />
              <Bar dataKey="Effective" stackId="a" fill="#16a34a" />
              <Bar dataKey="In Progress" stackId="a" fill="#d97706" />
              <Bar dataKey="Ineffective" stackId="a" fill="#dc2626" />
              <Bar dataKey="Not Tested" stackId="a" fill="#94a3b8" />
              <Legend wrapperStyle={{fontSize:11}} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deficiency breakdown */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Deficiency breakdown</h3>
          {defByClass.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={defByClass} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                  {defByClass.map(entry => <Cell key={entry.name} fill={COLORS[entry.name]||'#94a3b8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">No deficiencies logged.</p>}
        </div>

        {/* Remediation status */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Remediation status</h3>
          {remByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={remByStatus} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{fontSize:11}} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{fontSize:10}} width={90} />
                <Tooltip contentStyle={{fontSize:11}} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {remByStatus.map(entry => <Cell key={entry.name} fill={entry.name==='Closed'?'#16a34a':entry.name==='Implemented'?'#2563eb':'#d97706'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">No remediations logged.</p>}
        </div>

        {/* Vendor reliance */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Vendor SOC 1 reliance</h3>
          {vendorReliance.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendorReliance} barSize={20}>
                <XAxis dataKey="name" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} allowDecimals={false} />
                <Tooltip contentStyle={{fontSize:11}} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {vendorReliance.map(entry => <Cell key={entry.name} fill={entry.name==='place'?'#16a34a':entry.name==='partial'?'#d97706':entry.name==='none'?'#94a3b8':'#dc2626'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">No vendor reviews logged.</p>}
        </div>
      </div>

      {/* IPE + Testing strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:'IPE validated', val:`${ipeValidated}/${ipeTotal}`, warn: ipeTotal>0&&ipeValidated<ipeTotal },
          { label:'Test items', val: totalTests },
          { label:'Exceptions', val: exceptions, warn: exceptions>0 },
          { label:'JE segments', val: data?.jeSegments.length||0 },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.warn?'border-amber-200 dark:border-amber-900':''}`}>
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.warn?'text-amber-600':'text-gray-900 dark:text-white'}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* AI narrative panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-brand-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">AI audit narrative</h3>
            <span className="badge badge-amber text-xs">DRAFT — human review required</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <><Loader size={13} className="animate-spin"/>Analysing…</> : <><Bot size={13}/>Generate narrative</>}
          </button>
        </div>

        {ai ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall opinion:</span>
              <span className={`badge ${opinionColor(ai.overall_opinion)}`}>{ai.overall_opinion}</span>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Executive summary</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{ai.executive_summary}</p>
            </div>

            {ai.key_risks?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Key risks</div>
                <div className="space-y-2">
                  {ai.key_risks.map((r,i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-3">
                      <span className={`badge flex-shrink-0 mt-0.5 ${r.severity==='High'?'badge-red':r.severity==='Medium'?'badge-amber':'badge-green'}`}>{r.severity}</span>
                      <div><div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{r.area}</div><div className="text-xs text-gray-500 mt-0.5">{r.finding}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ai.recommendations?.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recommendations</div>
                <div className="space-y-2">
                  {ai.recommendations.map((r,i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                      <span className={`badge flex-shrink-0 mt-0.5 ${r.priority==='High'?'badge-red':r.priority==='Medium'?'badge-amber':'badge-green'}`}>{r.priority}</span>
                      <div><div className="text-xs text-gray-700 dark:text-gray-300">{r.action}</div><div className="text-xs text-gray-400 mt-0.5">Owner: {r.owner_role}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Bot size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Click "Generate narrative" to produce an AI audit summary with risk assessment and recommendations.</p>
          </div>
        )}
      </div>
    </div>
  )
}
