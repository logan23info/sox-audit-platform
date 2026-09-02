import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader'

const SECTIONS = [
  {
    title: '1. Getting started',
    content: `**What is this platform?**
The SOX Audit Platform is a purpose-built tool for IT General Controls (ITGC) audits under the Sarbanes-Oxley Act (SOX). It supports the full audit lifecycle — from scoping and risk assessment through testing, deficiency classification, remediation tracking, and final reporting.

**Who is it for?**
Internal auditors, IT auditors, and external audit teams conducting SOX Section 404 ITGC assessments. Supports multi-user engagements with Lead, Auditor, and Reviewer roles.

**Creating your first engagement**
Go to Programmes → New engagement. Enter the entity name, fiscal year, and sector. Each engagement is a self-contained workspace — all data (scope, controls, findings, reports) is isolated per engagement. Select the engagement to activate it before using any other page.`
  },
  {
    title: '2. Phase 1 — Plan the audit',
    content: `**Step 1: Scoping worksheet**
Navigate to Plan → Scoping. Add each system that may be in scope. Score each system across five risk dimensions:
- Financial statement impact (0–3)
- Transaction volume/amount (0–3)
- System complexity (0–2)
- Prior period findings (0–2)
- Change activity (0–2)

Total score out of 12. Systems scoring ≥5 are typically IN SCOPE. Document the rationale for each decision. Reference: PCAOB AS 2201 Para .36.

**Step 2: Risk & Control Matrix (RCM)**
Navigate to Plan → RCM. Click "Seed base controls" to load the 16 standard ITGC controls across five domains:
- LA — Logical Access (5 controls)
- CM — Change Management (4 controls)
- CO — Computer Operations (3 controls)
- PD — Program Development (2 controls)
- JE — Journal Entry (2 controls)

Add sector-specific or client-specific controls manually. Each control requires: domain, risk, control type (Preventive/Detective), frequency, and evidence requirements.

**Step 3: Workpaper setup**
Navigate to Plan → Workpaper Setup. Create a workpaper shell for each key control. Set the sample size using the AS 2315 calculator — click "Set sample" on each row. Document the population source (IPE) and walk-through notes.

**Step 4: Multi-entity register**
If the engagement covers multiple legal entities or significant components, add them at Plan → Multi-entity. Controls can be scoped per entity.

**Step 5: Audit schedule**
Navigate to Schedule. Click "Seed milestones" to load 16 standard milestones across Planning, Fieldwork, Review, Reporting, and Follow-up phases. Set due dates and assign owners.`
  },
  {
    title: '3. Phase 2 — Execute testing',
    content: `**Step 1: IPE validation (mandatory first)**
Navigate to Execute → IPE Validation. Before testing any control that relies on a system-generated report, validate the report for completeness and accuracy per AS 1105.10A. Document:
- Report name and system source
- Extract parameters (date range, filters, entity)
- Total record count
- Reconciliation to an independent source (e.g., HR headcount, GL trial balance)
- Difference (should be nil or explained)

This is the #1 PCAOB inspection finding. Never proceed to testing without completing IPE validation for every report used as evidence.

**Step 2: Sample testing**
Navigate to Execute → Sample Testing. Select a workpaper, then add individual test items. For each sample, document:
- Sample description and date
- Evidence obtained
- Attributes tested (up to 3 per item)
- Pass/Fail result for each attribute
- Any exceptions noted

Click "Draft conclusion" after testing to generate an AI-assisted workpaper conclusion based on your results.

**Step 3: Journal entry testing (mandatory fraud procedure)**
Navigate to Execute → JE Testing. This is a required fraud risk procedure per AS 2110.61:
1. Set up the JE population — validate it as IPE against the GL trial balance
2. Segment by risk: after-hours, period-end, round-dollar, new preparer, general
3. Test high-risk segments (all items or 40+, whichever applies)
4. For each sample: verify support, preparer ≠ approver, business purpose documented
5. Flag any fraud indicators

**Step 4: Finding register**
Navigate to Execute → Findings. Document each exception or finding. Use the AI assessment panel:
1. Select the control domain and ID
2. Enter detailed evidence text describing what you found
3. Click "Run AI assessment"
4. Review the AI output — it follows the 4Cs format: Condition, Criteria, Cause, Consequence
5. Override classification or root cause as needed
6. Mark as signed off when the finding is complete

All AI outputs are DRAFT and require human auditor sign-off before becoming audit records.

**Step 5: Deficiency log**
Navigate to Execute → Deficiency Log. Deficiencies are auto-created when a Major NC or Minor NC finding is saved. The truth table auto-classifies:
- CD (Control Deficiency) — remote likelihood
- SD (Significant Deficiency) — more than remote, not material — audit committee communication required
- MW (Material Weakness) — reasonable possibility of material misstatement — public 10-K disclosure required

**Step 6: SoD matrix**
Navigate to Execute → SoD Matrix. Document all segregation of duties conflicts. For each conflict, add compensating controls and test their effectiveness.`
  },
  {
    title: '4. Phase 3 — Manage & report',
    content: `**Remediation tracker**
Navigate to Manage → Remediation. Link each action to a deficiency. Document the root cause addressed (not just symptoms), owner, target date, and re-testing plan. MW remediations require a minimum of 90–180 days of operation before re-testing.

**Vendor / SOC 1 review**
Navigate to Manage → Vendor/SOC 1. For each service organisation:
1. Assess the SOC 1 report type, period, and opinion
2. Reliance decision is auto-calculated from the truth table
3. Test all CUECs (Complementary User Entity Controls) before placing reliance
4. Obtain a bridge letter if the report period doesn't cover your full fiscal year

**Auditor reliance**
Navigate to Manage → Auditor Reliance. Document the percentage of internal audit work relied upon by the external auditor per domain. Note the re-performance percentage required per AS 2201.

**§302/§404 assertions**
Navigate to Manage → Assertions. Create the CEO/CFO certification. If any MW is open, the ICFR effectiveness assertion must reflect this. E-sign using the typed signature field. Status auto-updates to Final after signing.

**Standards tracker**
Navigate to Manage → Standards. Review and acknowledge each applicable PCAOB standard. Key standards for ITGC engagements: AS 2201, AS 2315, AS 1105 (Amendment), AS 2110.

**QC review**
Navigate to QC Review. Before issuing the audit report, the Engagement Quality Reviewer (EQR) must review and concur. Select the areas reviewed, document findings, and record the conclusion. Per QC 1000 (effective December 2026), the EQR must be independent of the engagement team.

**Audit reports**
Navigate to Manage → Reports. Create the audit report, auto-fill the findings section from the finding register, and export as XLSX or PDF. Do not issue a clean opinion if any MW remains open.`
  },
  {
    title: '5. AI features',
    content: `**AI finding assessment**
Available on Execute → Findings. The AI analyses evidence text and returns a structured assessment in 4Cs format. It cites the control objective, classifies the finding, scores severity, identifies root cause, and suggests corrective actions with SLA timelines.

All AI outputs carry a DRAFT watermark. The auditor is responsible for reviewing and approving every AI-generated finding before it becomes an audit record.

**AI audit narrative**
Available on Analytics → Generate narrative. The AI analyses your engagement statistics and produces an executive summary, overall opinion (Clean/Qualified/Adverse/Insufficient Evidence), key risk areas, and recommendations in audit committee language.

**AI workpaper conclusion**
Available on Execute → Sample Testing → Draft conclusion. After completing test items, the AI drafts a professional workpaper conclusion based on your sample size, exception rate, and attributes tested.

**Management rep letter**
Available on Manage → Assertions → Rep letter. The AI drafts a §302 sub-certification letter based on assertion data, MW status, and signatories.

**QC review draft**
Available on QC Review → AI draft. Analyses engagement statistics and drafts quality review findings and a recommended conclusion per QC 1000.

**Key principle:** The platform uses temperature 0.1 for all AI calls, minimising hallucination. If evidence is insufficient or ambiguous, the AI returns INSUFFICIENT_EVIDENCE rather than guessing. Human review is always required.`
  },
  {
    title: '6. Analytics & reporting',
    content: `**Current engagement analytics**
Navigate to Analytics. The dashboard shows:
- Control status by domain (stacked bar chart)
- Deficiency breakdown by classification (pie chart)
- Remediation status distribution
- Vendor SOC 1 reliance decisions
- IPE validation coverage
- Exception rate across sample items

**Multi-engagement comparison**
Click "Compare engagements" on the Analytics page. Select other engagements to compare side-by-side on findings, MW/SD counts, controls tested percentage, and remediation closure rate. Useful for year-over-year trend analysis.

**Export options**
Reports → XLSX: exports four tabs — Executive Summary, Findings, Deficiency Log, RCM
Reports → PDF: branded report with tables and AI narrative if generated
Analytics → Export PDF: chart data and KPI summary

**Client portal**
Navigate to Client Portal. Generate a read-only token link for management or the audit committee. The portal shows signed-off findings, deficiency log, and remediation status. Revoke links when the engagement closes.`
  },
  {
    title: '7. Team management',
    content: `**Roles**
- Lead — full access including inviting/removing members, generating portal links
- Auditor — create and edit all records
- Reviewer — read-only access

**Inviting team members**
Navigate to Team. Members must have an existing account on the platform. Enter their email address and select a role. The invitation takes effect immediately — the member sees the engagement on their next login.

**Removing members**
Only the Lead can remove members. Removal takes effect immediately — the member loses access to all engagement data.`
  },
  {
    title: '8. Reference pages',
    content: `**Framework crosswalk**
Maps ITGC domains to COSO 2013, COBIT 2019, PCAOB AS 2201, IIA Standards, and SEC rules.

**Cloud ITGC**
Documents cloud-native evidence sources for AWS, Azure, and GCP per domain. Includes common gaps — particularly around non-human identity (NHI) controls, the fastest-growing PCAOB inspection finding area.

**ERP guides**
Documents where to find ITGC evidence in SAP S/4HANA, Oracle EBS/Fusion, and NetSuite — transaction codes, reports, and extraction paths.

**Sector controls**
Additional control requirements for Financial Services (FFIEC/OCC), Pharma (21 CFR Part 11), Manufacturing (IATF 16949), SaaS/Technology (SOC 2), Healthcare (HIPAA), Retail (PCI DSS), and Energy (NERC CIP).

**PCAOB inspections**
Load and track known PCAOB inspection findings. Mark which findings apply to your methodology and document mitigations.

**Interview prep**
12 flashcard questions covering key SOX ITGC concepts — useful for team onboarding or pre-engagement refreshers.`
  },
]

export default function Wiki() {
  const [open, setOpen] = useState(null)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><BookOpen size={12}/>Reference · Wiki</>} title="SOX audit platform — user guide"
        subtitle="End-to-end guide for running a SOX ITGC engagement. Aligned to PCAOB AS 2201, AS 2315, AS 2110, and QC 1000." />
      <div className="space-y-2">
        {SECTIONS.map((s,i) => (
          <div key={i} className="card p-0 overflow-hidden">
            <button onClick={()=>setOpen(open===i?null:i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-dark-surface-3 transition-colors">
              <span className="font-semibold text-gray-900 dark:text-white">{s.title}</span>
              {open===i?<ChevronDown size={16} className="text-gray-400"/>:<ChevronRight size={16} className="text-gray-400"/>}
            </button>
            {open===i&&(
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                {s.content.split('\n\n').map((para,j)=>{
                  if (para.startsWith('**') && para.includes('**\n')) {
                    const [head,...rest] = para.split('\n')
                    return <div key={j} className="mt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{head.replace(/\*\*/g,'')}</h4>
                      {rest.join('\n').split('\n').filter(Boolean).map((line,k)=>(
                        line.startsWith('- ')?<li key={k} className="text-sm text-gray-600 dark:text-gray-400 ml-4 list-disc">{line.slice(2)}</li>:<p key={k} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  }
                  return <p key={j} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">{para}</p>
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
