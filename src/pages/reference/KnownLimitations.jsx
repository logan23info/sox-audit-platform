import { AlertTriangle, Info, CheckCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'

const LIMITATIONS = [
  {
    category: 'AI & assessment',
    severity: 'important',
    items: [
      { title:'AI outputs are DRAFT only', desc:'Every AI-generated finding, narrative, conclusion, and letter requires human auditor review and sign-off before it becomes an audit record. The platform enforces DRAFT watermarks but cannot prevent an auditor from accepting AI output without review.' },
      { title:'AI does not access historical data', desc:'The AI assessment engine uses only the evidence text you provide in the current session. It does not access prior findings, the RCM, or other DB records. Context must be included in the evidence text.' },
      { title:'INSUFFICIENT_EVIDENCE is correct behaviour', desc:'When the AI returns INSUFFICIENT_EVIDENCE, it is working as designed — the evidence text was insufficient to support a classification. Add more detail to the evidence field and re-run.' },
      { title:'AI model availability', desc:'AI features depend on third-party model availability. If the AI panel returns an error, the model may be temporarily unavailable. All audit work can proceed without AI — the AI panel is an efficiency tool, not a required step.' },
    ]
  },
  {
    category: 'Sampling & calculations',
    severity: 'important',
    items: [
      { title:'Sample size calculator is advisory', desc:'The AS 2315 sample size calculator applies the standard methodology but does not account for all engagement-specific factors (e.g., tolerable error rate, expected population deviation rate). Professional judgment is required. The calculated size is a minimum starting point, not a ceiling.' },
      { title:'Exception extrapolation is illustrative', desc:'The population error rate extrapolation shown in Sample Testing is calculated using basic ratio estimation. It does not apply statistical confidence intervals or stratification. Use it as an indicator, not as a formal statistical conclusion.' },
      { title:'Sample enforcer is advisory', desc:'The sample size enforcer on Workpaper Setup shows an advisory warning when items tested are below the recommended minimum but does not prevent saving. The auditor remains responsible for ensuring sample sufficiency.' },
    ]
  },
  {
    category: 'Data & storage',
    severity: 'info',
    items: [
      { title:'Evidence file size limit', desc:'Attached evidence files are limited to 10MB per file. For large extracts or GL data files, attach a summary or excerpt and reference the full file location in the evidence description field.' },
      { title:'No version history on records', desc:'Editing a finding, workpaper, or RCM control overwrites the prior version. The audit trail logs who changed what and when, but does not store the full prior record content. Finalise records before editing if version retention is needed.' },
      { title:'Portal links are not individually permissioned', desc:'A client portal link gives access to all signed-off findings and deficiencies for the engagement. You cannot restrict a link to specific domains or findings. If granular access is needed, create separate engagements.' },
      { title:'Free tier storage limits', desc:'The platform operates on cloud infrastructure with free tier limits. For large engagements with many evidence files, monitor storage usage. The audit trail and DB records are not affected by storage limits.' },
    ]
  },
  {
    category: 'Standards & compliance',
    severity: 'important',
    items: [
      { title:'Platform does not constitute audit evidence', desc:'Records in this platform support the audit but are not themselves audit evidence. Physical workpapers, signed documents, and evidence files obtained from the client remain the primary audit documentation per AS 1215.' },
      { title:'PCAOB reference content is not authoritative', desc:'The framework crosswalk, PCAOB inspection findings, and standards tracker contain reference information compiled from public sources. Always verify against the current official PCAOB standard text at pcaobus.org before relying on any specific reference.' },
      { title:'Base controls are illustrative', desc:'The 16 base controls seeded by "Seed base controls" are illustrative starting points aligned to ITGC best practice. They are not a comprehensive or authoritative control catalogue. Add, modify, and remove controls to reflect the actual control environment of the engagement.' },
      { title:'QC 1000 effective date', desc:'QC 1000 is effective for engagements with fiscal years beginning on or after December 15, 2026. The QC Review page documents the review but does not enforce the standard — confirm applicability with your firm\'s quality control function.' },
      { title:'Sector-specific controls require expert review', desc:'The sector-specific control requirements shown in Reference → Sector Controls are based on publicly available regulatory guidance. They should be reviewed by subject matter experts familiar with the applicable regulation before use in an engagement.' },
    ]
  },
  {
    category: 'Platform & access',
    severity: 'info',
    items: [
      { title:'No offline mode', desc:'The platform requires an internet connection. All data is stored in the cloud. There is no offline or local mode.' },
      { title:'Mobile display', desc:'The platform is designed for desktop use. Display on mobile devices (phones) may require horizontal scrolling on data tables and modals. Tablet use is generally functional.' },
      { title:'Browser compatibility', desc:'The platform is tested on Chrome and Edge. Firefox and Safari are functionally compatible but may have minor display differences. Internet Explorer is not supported.' },
      { title:'Session timeout', desc:'Sessions expire after a period of inactivity. If you see a login prompt after being idle, sign back in — your saved data is not lost.' },
      { title:'Concurrent edits', desc:'If two users edit the same record simultaneously, the last save wins. The platform does not currently show real-time indicators of who is editing a record. Coordinate with team members when editing shared records.' },
    ]
  },
]

const severityIcon = s => s==='important'?<AlertTriangle size={14} className="text-amber-500"/>:<Info size={14} className="text-blue-500"/>

export default function KnownLimitations() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow="Reference · Limitations" title="Known limitations"
        subtitle="Understand the boundaries of the platform before relying on it for engagement decisions." />
      <div className="alert-info mb-6">
        <Info size={15} className="flex-shrink-0"/>
        <span className="text-sm">This page documents known limitations, not defects. The platform is a decision-support tool. Professional judgment, regulatory knowledge, and human review remain the auditor's responsibility.</span>
      </div>
      <div className="space-y-5">
        {LIMITATIONS.map((cat,i)=>(
          <div key={i} className="card">
            <div className="flex items-center gap-2 mb-4">
              {severityIcon(cat.severity)}
              <h3 className="font-semibold text-gray-900 dark:text-white">{cat.category}</h3>
            </div>
            <div className="space-y-4">
              {cat.items.map((item,j)=>(
                <div key={j} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-0.5">{item.title}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="card mt-5 border-green-200 dark:border-green-900">
        <div className="flex items-center gap-2 mb-3"><CheckCircle size={14} className="text-green-500"/><h3 className="font-semibold text-gray-900 dark:text-white">What the platform does well</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          {['Full SOX ITGC audit lifecycle in one workspace','Multi-user engagement with role-based access','AI-assisted finding assessment with 4Cs format','AS 2315 sample size calculation','Deficiency truth table auto-classification (CD/SD/MW)','SOC 1 reliance decision logic','JE fraud risk procedure workflow','PCAOB standards tracker and acknowledgment','Evidence file attachment per finding and workpaper','Client portal with read-only management access','Audit trail logging all record changes','Multi-engagement comparison analytics','QC 1000 engagement quality review workflow','Export to XLSX and PDF'].map(item=>(
            <div key={item} className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500 flex-shrink-0"/>{item}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
