// ── ITGC DOMAINS ─────────────────────────────────────────────
export const DOMAINS = [
  { id: 'LA', label: 'Logical Access',      color: 'blue',   pcaob: 'AS 2201 Para .26' },
  { id: 'CM', label: 'Change Management',   color: 'green',  pcaob: 'AS 2201 Para .28' },
  { id: 'CO', label: 'Computer Operations', color: 'amber',  pcaob: 'AS 2201 Para .27' },
  { id: 'PD', label: 'Program Development', color: 'purple', pcaob: 'AS 2201 Para .29' },
  { id: 'JE', label: 'Journal Entry',       color: 'red',    pcaob: 'AS 2110.61' },
]

export const DOMAIN_IDS = DOMAINS.map(d => d.id)

// ── DEFICIENCY CLASSIFICATION TRUTH TABLE ────────────────────
// Inputs: likelihood × magnitude → classification
// Source: PCAOB AS 2201.62–.70
export const DEFICIENCY_TRUTH_TABLE = [
  { likelihood: 'remote',              magnitude: 'any',          classification: 'CD',   auditComm: false, publicDisclose: false },
  { likelihood: 'more_than_remote',    magnitude: 'not_material', classification: 'SD',   auditComm: true,  publicDisclose: false },
  { likelihood: 'more_than_remote',    magnitude: 'material',     classification: 'MW',   auditComm: true,  publicDisclose: true  },
  { likelihood: 'reasonably_possible', magnitude: 'material',     classification: 'MW',   auditComm: true,  publicDisclose: true  },
  { likelihood: 'design_gap',          magnitude: 'any',          classification: 'CD-D', auditComm: false, publicDisclose: false },
]

export const CLASSIFICATIONS = ['CD', 'CD-D', 'SD', 'MW', 'OPEN']
export const CLASSIFICATION_LABELS = {
  'CD':   'Control Deficiency',
  'CD-D': 'Design Deficiency',
  'SD':   'Significant Deficiency',
  'MW':   'Material Weakness',
  'OPEN': 'Under Assessment',
}
export const CLASSIFICATION_COLORS = {
  'CD': 'green', 'CD-D': 'blue', 'SD': 'amber', 'MW': 'red', 'OPEN': 'gray',
}

// ── JE SEGMENT RISK TRUTH TABLE ──────────────────────────────
// Source: AS 2110.61, PCAOB JE testing guidance
export const JE_SEGMENTS = [
  { id: 'after_hours', label: 'After-hours / weekend', risk: 'High',     required_sample: 'All or 40+' },
  { id: 'period_end',  label: 'Period-end (last 3 days)', risk: 'High',  required_sample: 'All or 40+' },
  { id: 'round_dollar',label: 'Round dollar / unusual', risk: 'High',    required_sample: 'Targeted'   },
  { id: 'new_preparer',label: 'New / infrequent preparer', risk: 'High', required_sample: 'All flagged' },
  { id: 'normal',      label: 'General population',    risk: 'Standard', required_sample: 'AS 2315 base' },
]

// ── SOC 1 RELIANCE TRUTH TABLE ───────────────────────────────
export const SOC1_RELIANCE_TABLE = [
  { type: 'Type II', period_covers_fy: true,  opinion: 'Unqualified', cueCs_tested: true,  decision: 'place',    note: '' },
  { type: 'Type II', period_covers_fy: true,  opinion: 'Qualified',   cueCs_tested: true,  decision: 'partial',  note: 'Evaluate exceptions' },
  { type: 'Type II', period_covers_fy: false, opinion: 'any',         cueCs_tested: true,  decision: 'gap',      note: 'Bridge letter required' },
  { type: 'Type I',  period_covers_fy: null,  opinion: 'any',         cueCs_tested: false, decision: 'none',     note: 'Design only — no operating effectiveness' },
  { type: 'None',    period_covers_fy: null,  opinion: 'none',        cueCs_tested: false, decision: 'direct',   note: 'Direct test or compensating control' },
]

// ── SAMPLE SIZES (AS 2315) ───────────────────────────────────
export const SAMPLE_TABLE = {
  daily:     { high: 40, medium: 25, low: 20 },
  weekly:    { high: 15, medium: 10, low: 8  },
  monthly:   { high: 5,  medium: 4,  low: 3  },
  quarterly: { high: 2,  medium: 2,  low: 1  },
  annual:    { high: 1,  medium: 1,  low: 1  },
}
export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
export const RISK_RATINGS = ['high', 'medium', 'low']

// ── MEMBER ROLES ─────────────────────────────────────────────
export const MEMBER_ROLES = ['Lead', 'Auditor', 'Reviewer']

// ── SECTORS ──────────────────────────────────────────────────
export const SECTORS = [
  { id: 'financial_services', label: 'Financial Services',  standards: ['FFIEC', 'OCC', 'FDIC'] },
  { id: 'pharma',             label: 'Pharma / Biotech',    standards: ['21 CFR Part 11', 'FDA'] },
  { id: 'manufacturing',      label: 'Manufacturing',       standards: ['IATF 16949'] },
  { id: 'automotive',         label: 'Automotive',          standards: ['IATF 16949', 'VDA'] },
  { id: 'tech_saas',          label: 'SaaS / Technology',   standards: ['SOC 2', 'ISO 27001'] },
  { id: 'healthcare',         label: 'Healthcare',          standards: ['HIPAA', 'HITECH'] },
  { id: 'retail',             label: 'Retail / E-commerce', standards: ['PCI DSS'] },
  { id: 'energy',             label: 'Energy / Utilities',  standards: ['NERC CIP'] },
  { id: 'general',            label: 'General / Other',     standards: [] },
]

// ── PROGRAMME STATUSES ───────────────────────────────────────
export const PROGRAMME_STATUSES = ['Planning', 'In Progress', 'Under Review', 'Complete', 'Archived']

// ── CONTROL TYPES / ASSERTIONS ───────────────────────────────
export const CONTROL_TYPES = ['Preventive', 'Detective', 'Corrective']
export const ASSERTIONS    = ['Completeness', 'Accuracy', 'Existence', 'Authorization', 'Valuation']

// ── SCOPE DECISIONS ──────────────────────────────────────────
export const SCOPE_DECISIONS = ['IN SCOPE', 'CONSIDER', 'OUT OF SCOPE']

// ── REMEDIATION STATUSES ─────────────────────────────────────
export const REMEDIATION_STATUSES = ['Not Started', 'In Progress', 'Implemented', 'Re-testing', 'Closed']

// ── PCAOB STANDARDS ──────────────────────────────────────────
export const PCAOB_STANDARDS = [
  { id: 'AS1000',  title: 'AS 1000 — General Responsibilities',   status: 'active',   effective: '2024-12-17', note: 'Modernises foundational auditor obligations' },
  { id: 'AS1105',  title: 'AS 1105 Amendment — IPE Para .10A',    status: 'active',   effective: '2025-12-15', note: 'IPE reliability validation — top inspection finding' },
  { id: 'AS2301',  title: 'AS 2301 — Technology-Assisted Analysis',status: 'active',  effective: '2025-12-15', note: 'AI/data analytics evidentiary standards' },
  { id: 'AS2201',  title: 'AS 2201 Amendment — ICFR Integrated',  status: 'upcoming', effective: '2026-12-15', note: 'Strengthens ICFR → FS audit link' },
  { id: 'AS2101',  title: 'AS 2101 Amendment — Audit Planning',   status: 'upcoming', effective: '2026-12-15', note: 'Updated planning for locations and IA reliance' },
  { id: 'QC1000',  title: 'QC 1000 — Quality Control Standard',   status: 'critical', effective: '2026-12-15', note: 'Form QC due Nov 2027' },
  { id: 'AS2315',  title: 'AS 2315 Amendment — Audit Sampling',   status: 'active',   effective: '2024-12-15', note: 'Sample size methodology documentation' },
  { id: 'AS2601',  title: 'AS 2601 / AI 18 — Service Orgs',       status: 'active',   effective: 'ongoing',    note: 'SOC 1 + subservice AI vendor coverage' },
]

// ── FINDING AI SCHEMA ────────────────────────────────────────
export const FINDING_AI_SCHEMA = {
  assessment: { control_id:'', domain:'', classification:'', severity:'', confidence: 0, evidence_excerpt:'' },
  audit_finding: '',
  root_cause: '',
  corrective_actions: [],
  prompt_version: 'sox-v1',
  model: '',
  retrieved_context_ids: [],
  timestamp: '',
}

export const AI_CLASSIFICATIONS = ['Conforming', 'Minor NC', 'Major NC', 'Observation', 'OFI', 'INSUFFICIENT_EVIDENCE']
export const AI_SEVERITIES      = ['Low', 'Medium', 'High', 'Critical', 'N/A']
