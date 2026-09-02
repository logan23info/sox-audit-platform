import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader'

const FAQS = [
  { q:'What is the correct order to run an engagement?', a:'Scoping → RCM → Workpaper setup → Schedule milestones → IPE validation → Sample testing → JE testing → Findings → Deficiency log → SoD matrix → Remediation → Vendor/SOC 1 → Assertions → QC review → Report. The platform enforces some of this order (e.g., workpapers reference RCM controls; deficiencies auto-create from findings) but does not hard-block out-of-sequence work.' },
  { q:'Why does the AI say INSUFFICIENT_EVIDENCE?', a:'The AI is calibrated to return INSUFFICIENT_EVIDENCE rather than guess when the evidence text is ambiguous, incomplete, or does not clearly identify an exception. Provide more specific detail: what the control requires, what you observed, how many items showed exceptions, and what the impact is. The AI uses your evidence text as its only input — it does not access the DB or prior findings.' },
  { q:'What is IPE and why must I validate it before testing?', a:'IPE stands for Information Produced by the Entity — any system-generated report used as audit evidence. Per AS 1105.10A, auditors must test the completeness and accuracy of every such report before relying on it. Validation means: document extract parameters, count total records, reconcile to an independent source (e.g., trial balance, HR headcount), and confirm the difference is nil or explained. Skipping IPE validation is the #1 PCAOB inspection finding in 2023–2025.' },
  { q:'What sample sizes should I use?', a:'Per PCAOB AS 2315: Daily high-risk controls — 25–40 items. Weekly — 10–15. Monthly — 4–5. Quarterly — 2. Annual — 1. Increase by 25% for new or redesigned controls, and by 40% if prior period exceptions were noted. Use the "Set sample" calculator in Workpaper Setup — it applies these rules automatically.' },
  { q:'When is a finding a CD vs SD vs MW?', a:'The classification depends on likelihood and magnitude per AS 2201.62–.70. Remote likelihood = CD (Control Deficiency). More than remote likelihood, not material = SD (Significant Deficiency) — requires written audit committee communication before fiscal year-end. Reasonable possibility of material misstatement = MW (Material Weakness) — requires public 10-K Item 9A disclosure and modifies CEO/CFO §302 certification. The deficiency log truth table applies this automatically.' },
  { q:'Can I place reliance on a SOC 1 Type I report?', a:'No. Type I reports cover design of controls only as of a point in time — they do not cover operating effectiveness. You can only place reliance on a Type II report that covers your fiscal year period. If the Type II report has a gap, obtain a bridge letter from the service organisation covering the gap period. If the opinion is qualified, evaluate whether the exceptions affect your reliance decision.' },
  { q:'What are CUECs and why must I test them?', a:'CUECs (Complementary User Entity Controls) are controls the SOC 1 report assumes your organisation is operating. If you do not test CUECs, you cannot place reliance on the SOC 1 report — regardless of the report type or opinion. Test each CUEC listed in the report and document your own corresponding control. Add CUECs under the vendor record in Manage → Vendor/SOC 1.' },
  { q:'What is the JE testing requirement under AS 2110.61?', a:'JE testing is a required fraud risk procedure, not an optional one. You must: (1) obtain the complete JE population and validate it as IPE against the GL trial balance — automated entries must be included; (2) segment by risk characteristics (after-hours, period-end, round-dollar, new preparers); (3) test high-risk segments with targeted selection; (4) test the general population with a random sample; (5) evaluate for fraud indicators. Incomplete population and excluding automated JEs are common PCAOB inspection findings.' },
  { q:'What does the QC review require under QC 1000?', a:'QC 1000 (effective December 15, 2026) requires an Engagement Quality Reviewer (EQR) to review and concur before the engagement report is issued. The EQR must be independent of the engagement team — cannot be the engagement partner or anyone who performed significant work. The EQR reviews risk assessment, significant judgments, deficiency conclusions, and the draft report. Navigate to QC Review to document and record the conclusion.' },
  { q:'How do I share findings with management or the audit committee?', a:'Navigate to Client Portal. Create a portal link with an optional expiry date and share the URL with management. The portal shows signed-off findings (draft findings are excluded), deficiency log, and remediation status in a read-only view. No editing capability. Revoke the link when the engagement closes.' },
  { q:'What happens when I mark a finding as signed off?', a:'When you uncheck "Draft" on a finding and save, the finding becomes a permanent audit record. If the classification is Major NC or Minor NC, a deficiency log entry is automatically created with the appropriate CD/SD/MW classification, audit committee requirement flag, and public disclosure flag set per the truth table.' },
  { q:'Can multiple auditors work on the same engagement simultaneously?', a:'Yes. The engagement is multi-user — each team member accesses the same dataset. The Lead invites team members by email from the Team page. Role-based access controls apply: Lead can create, edit, and delete; Auditor can create and edit; Reviewer has read-only access. Changes are visible to all users on page refresh.' },
  { q:'What PCAOB standards apply to this engagement?', a:'Core standards: AS 2201 (ICFR integrated audit), AS 2315 (audit sampling), AS 2110 (identifying risks — JE), AS 1105 / Amendment (audit evidence, IPE), AS 2601 (service organisations / SOC 1), QC 1000 (quality control). Navigate to Manage → Standards to acknowledge each standard. Navigate to Reference → PCAOB Inspections to track which recent inspection findings apply to your methodology.' },
  { q:'How do I handle a material weakness?', a:'A material weakness requires: (1) immediate escalation to the audit committee; (2) public disclosure in 10-K Item 9A; (3) CEO/CFO §302 certification must disclose the MW — the platform adjusts the assertion accordingly; (4) a remediation plan with a minimum 90–180 days of operation before re-testing; (5) the audit report must not carry a clean opinion. The dashboard shows an alert banner when any open MW is recorded.' },
  { q:'What is the exception extrapolation shown in Sample Testing?', a:'When you note an exception in a test item and the workpaper has a population count set, the platform calculates the estimated number of errors in the full population using the sample error rate per AS 2315. For example, 1 exception in 25 samples from a population of 500 = estimated 20 population errors. This does not automatically change the deficiency classification but informs the likelihood and magnitude assessment.' },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><HelpCircle size={12}/>Reference · FAQ</>} title="Frequently asked questions"
        subtitle={`${FAQS.length} questions covering the SOX audit lifecycle, AI features, PCAOB standards, and platform usage.`} />
      <div className="space-y-2">
        {FAQS.map((f,i)=>(
          <div key={i} className="card p-0 overflow-hidden">
            <button onClick={()=>setOpen(open===i?null:i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-dark-surface-3 transition-colors gap-3">
              <span className="font-medium text-gray-900 dark:text-white">{f.q}</span>
              {open===i?<ChevronDown size={16} className="text-gray-400 flex-shrink-0"/>:<ChevronRight size={16} className="text-gray-400 flex-shrink-0"/>}
            </button>
            {open===i&&(
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">{f.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
