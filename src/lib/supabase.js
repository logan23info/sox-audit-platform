import { createClient } from '@supabase/supabase-js'
import { logError } from './logger'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})

// ── UTILITIES ────────────────────────────────────────────────
export const sanitise = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]))

// Error bridge — ToastContext registers a reporter at mount so DB failures
// become visible instead of silently returning null (audit-tool requirement).
let errorReporter = null
export const registerErrorReporter = (fn) => { errorReporter = fn }

const friendly = (msg='') => {
  if (/row-level security|violates row-level/i.test(msg)) return 'You do not have permission to make this change.'
  if (/duplicate key|already exists/i.test(msg))          return 'A record with these details already exists.'
  if (/foreign key/i.test(msg))                           return 'Linked record not found or already removed.'
  if (/violates not-null/i.test(msg))                     return 'A required field is missing.'
  if (/JWT|expired/i.test(msg))                           return 'Your session expired — sign in again.'
  return msg
}

const handle = async (promise, opts = {}) => {
  const { data, error } = await promise
  if (error) {
    logError(error.message)
    if (!opts.silent && errorReporter) {
      errorReporter({ type: 'error', title: 'Save failed', description: friendly(error.message) })
    }
    return null
  }
  return data
}

// ── AUTH ─────────────────────────────────────────────────────
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── PROFILES ─────────────────────────────────────────────────
export const getProfile = (userId) =>
  handle(supabase.from('profiles').select('*').eq('id', userId).single())

export const upsertProfile = (profile) =>
  handle(supabase.from('profiles').upsert(profile))

// ── PROGRAMMES ───────────────────────────────────────────────
export const getProgrammes = () =>
  handle(supabase.from('programmes').select('*, programme_members(role, user_id)').order('created_at', { ascending: false }))

export const getProgramme = (id) =>
  handle(supabase.from('programmes').select('*').eq('id', id).single())

export const createProgramme = (data) =>
  handle(supabase.from('programmes').insert(data).select().single())

export const updateProgramme = (id, data) =>
  handle(supabase.from('programmes').update(data).eq('id', id))

export const deleteProgramme = (id) =>
  handle(supabase.from('programmes').delete().eq('id', id))

// ── PROGRAMME MEMBERS ────────────────────────────────────────
export const getMembers = (programmeId) =>
  handle(supabase.from('programme_members').select('*, profiles(full_name, email)').eq('programme_id', programmeId))

export const addMember = (data) =>
  handle(supabase.from('programme_members').insert(data))

export const updateMemberRole = (id, role) =>
  handle(supabase.from('programme_members').update({ role }).eq('id', id))

export const removeMember = (id) =>
  handle(supabase.from('programme_members').delete().eq('id', id))

// Invite lookup. Returns null for both "not found" and "error" so the
// caller cannot use this to enumerate which emails exist on the platform.
export const findUserByEmail = async (email) => {
  const { data } = await supabase
    .from('profiles').select('id, full_name, email')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle()
  return data ?? null
}

export const getMyRole = async (programmeId, userId) => {
  const { data } = await supabase.from('programme_members').select('role').eq('programme_id', programmeId).eq('user_id', userId).maybeSingle()
  return data
}

// ── SOX SCOPE ────────────────────────────────────────────────
export const getScope = (programmeId) =>
  handle(supabase.from('sox_scope').select('*').eq('programme_id', programmeId).order('created_at'))

export const upsertScope = (data) => {
  const { total_score, ...rest } = data
  return handle(supabase.from('sox_scope').upsert(sanitise(rest)).select().single())
}

export const deleteScope = (id) =>
  handle(supabase.from('sox_scope').delete().eq('id', id))

// ── SOX RCM ──────────────────────────────────────────────────
export const getRCM = (programmeId) =>
  handle(supabase.from('sox_rcm').select('*').eq('programme_id', programmeId).order('domain').order('control_id'))

export const upsertRCM = (data) =>
  handle(supabase.from('sox_rcm').upsert(sanitise(data)).select().single())

export const deleteRCM = (id) =>
  handle(supabase.from('sox_rcm').delete().eq('id', id))

// ── WORKPAPER SHELLS ─────────────────────────────────────────
export const getWorkpapers = (programmeId) =>
  handle(supabase.from('sox_workpaper_shells').select('*').eq('programme_id', programmeId).order('domain'))

export const upsertWorkpaper = async (data) => {
  const clean = sanitise(data)
  if (clean.id) {
    const { id, created_at, ...rest } = clean
    return handle(supabase.from('sox_workpaper_shells').update(rest).eq('id', id).select().single())
  }
  return handle(supabase.from('sox_workpaper_shells').insert(clean).select().single())
}

export const deleteWorkpaper = (id) =>
  handle(supabase.from('sox_workpaper_shells').delete().eq('id', id))

// ── SAMPLE PLAN ──────────────────────────────────────────────
export const getSamplePlan = async (workpaperId) => {
  const { data } = await supabase.from('sox_sample_plan').select('*').eq('workpaper_id', workpaperId).maybeSingle()
  return data
}

export const upsertSamplePlan = async (data) => {
  const clean = sanitise(data)
  // Check if plan exists for this workpaper
  const existing = await supabase.from('sox_sample_plan').select('id').eq('workpaper_id', clean.workpaper_id).maybeSingle()
  if (existing.data?.id) {
    const { id, created_at, workpaper_id, programme_id, ...rest } = clean
    return handle(supabase.from('sox_sample_plan').update(rest).eq('id', existing.data.id).select().single())
  }
  return handle(supabase.from('sox_sample_plan').insert(clean).select().single())
}

// ── IPE VALIDATIONS ──────────────────────────────────────────
export const getIPEValidations = (programmeId) =>
  handle(supabase.from('sox_ipe_validations').select('*').eq('programme_id', programmeId).order('created_at'))

export const upsertIPEValidation = (data) =>
  handle(supabase.from('sox_ipe_validations').upsert(sanitise(data)).select().single())

export const deleteIPEValidation = (id) =>
  handle(supabase.from('sox_ipe_validations').delete().eq('id', id))

// ── TESTING ITEMS ────────────────────────────────────────────
export const getTestingItems = (workpaperId) =>
  handle(supabase.from('sox_testing_items').select('*').eq('workpaper_id', workpaperId).order('sample_num'))

export const upsertTestingItem = (data) =>
  handle(supabase.from('sox_testing_items').upsert(sanitise(data)).select().single())

export const deleteTestingItem = (id) =>
  handle(supabase.from('sox_testing_items').delete().eq('id', id))

// ── JE TESTING ───────────────────────────────────────────────
export const getJEPopulation = (programmeId) =>
  handle(supabase.from('sox_je_population').select('*').eq('programme_id', programmeId).single())

export const upsertJEPopulation = (data) =>
  handle(supabase.from('sox_je_population').upsert(sanitise(data)).select().single())

export const getJESegments = (programmeId) =>
  handle(supabase.from('sox_je_segments').select('*').eq('programme_id', programmeId).order('risk_level'))

export const upsertJESegment = (data) =>
  handle(supabase.from('sox_je_segments').upsert(sanitise(data)).select().single())

export const deleteJESegment = (id) =>
  handle(supabase.from('sox_je_segments').delete().eq('id', id))

export const getJESamples = (segmentId) =>
  handle(supabase.from('sox_je_samples').select('*').eq('segment_id', segmentId).order('je_date'))

export const upsertJESample = (data) =>
  handle(supabase.from('sox_je_samples').upsert(sanitise(data)).select().single())

export const deleteJESample = (id) =>
  handle(supabase.from('sox_je_samples').delete().eq('id', id))

// ── FINDINGS ─────────────────────────────────────────────────
export const getFindings = (programmeId) =>
  handle(supabase.from('sox_findings').select('*').eq('programme_id', programmeId).order('created_at', { ascending: false }))

export const getFinding = (id) =>
  handle(supabase.from('sox_findings').select('*').eq('id', id).single())

export const upsertFinding = (data) =>
  handle(supabase.from('sox_findings').upsert(sanitise(data)).select().single())

export const deleteFinding = (id) =>
  handle(supabase.from('sox_findings').delete().eq('id', id))

// ── DEFICIENCY LOG ───────────────────────────────────────────
export const getDeficiencies = (programmeId) =>
  handle(supabase.from('sox_deficiency_log').select('*, sox_findings(control_id, domain)').eq('programme_id', programmeId).order('classification'))

export const upsertDeficiency = (data) =>
  handle(supabase.from('sox_deficiency_log').upsert(sanitise(data)).select().single())

export const deleteDeficiency = (id) =>
  handle(supabase.from('sox_deficiency_log').delete().eq('id', id))

// ── SOD MATRIX ───────────────────────────────────────────────
export const getSoDConflicts = (programmeId) =>
  handle(supabase.from('sox_sod_matrix').select('*').eq('programme_id', programmeId).order('risk_level'))

export const upsertSoDConflict = (data) =>
  handle(supabase.from('sox_sod_matrix').upsert(sanitise(data)).select().single())

export const deleteSoDConflict = (id) =>
  handle(supabase.from('sox_sod_matrix').delete().eq('id', id))

export const getSoDMitigations = (conflictId) =>
  handle(supabase.from('sox_sod_mitigations').select('*').eq('conflict_id', conflictId))

export const upsertSoDMitigation = (data) =>
  handle(supabase.from('sox_sod_mitigations').upsert(sanitise(data)).select().single())

// ── REMEDIATION ──────────────────────────────────────────────
export const getRemediations = (programmeId) =>
  handle(supabase.from('sox_remediation').select('*, sox_deficiency_log(ref, classification)').eq('programme_id', programmeId).order('target_date'))

export const upsertRemediation = (data) =>
  handle(supabase.from('sox_remediation').upsert(sanitise(data)).select().single())

export const deleteRemediation = (id) =>
  handle(supabase.from('sox_remediation').delete().eq('id', id))

// ── VENDOR / SOC1 REVIEWS ────────────────────────────────────
export const getVendorReviews = (programmeId) =>
  handle(supabase.from('sox_vendor_reviews').select('*').eq('programme_id', programmeId).order('vendor_name'))

export const upsertVendorReview = (data) =>
  handle(supabase.from('sox_vendor_reviews').upsert(sanitise(data)).select().single())

export const deleteVendorReview = (id) =>
  handle(supabase.from('sox_vendor_reviews').delete().eq('id', id))

export const getCUECItems = (vendorId) =>
  handle(supabase.from('sox_cuec_items').select('*').eq('vendor_review_id', vendorId).order('cuec_ref'))

export const upsertCUECItem = (data) =>
  handle(supabase.from('sox_cuec_items').upsert(sanitise(data)).select().single())

export const deleteCUECItem = (id) =>
  handle(supabase.from('sox_cuec_items').delete().eq('id', id))

// ── EXTERNAL AUDITOR RELIANCE ────────────────────────────────
export const getReliance = (programmeId) =>
  handle(supabase.from('sox_external_reliance').select('*').eq('programme_id', programmeId))

export const upsertReliance = (data) =>
  handle(supabase.from('sox_external_reliance').upsert(sanitise(data)).select().single())

// ── MULTI-ENTITY ─────────────────────────────────────────────
export const getEntities = (programmeId) =>
  handle(supabase.from('sox_multi_entity').select('*').eq('programme_id', programmeId).order('entity_name'))

export const upsertEntity = (data) =>
  handle(supabase.from('sox_multi_entity').upsert(sanitise(data)).select().single())

export const deleteEntity = (id) =>
  handle(supabase.from('sox_multi_entity').delete().eq('id', id))

// ── SECTOR VARIANTS ──────────────────────────────────────────
export const getSectorVariants = (programmeId) =>
  handle(supabase.from('sox_sector_variants').select('*').eq('programme_id', programmeId))

export const upsertSectorVariant = (data) =>
  handle(supabase.from('sox_sector_variants').upsert(sanitise(data)).select().single())

// ── SIGNATURES ───────────────────────────────────────────────
export const getSignatures = (programmeId) =>
  handle(supabase.from('sox_signatures').select('*').eq('programme_id', programmeId).order('signed_at', { ascending: false }))

export const createSignature = (data) =>
  handle(supabase.from('sox_signatures').insert(sanitise(data)).select().single())

// ── MGMT ASSERTIONS (302/404) ────────────────────────────────
export const getAssertions = (programmeId) =>
  handle(supabase.from('sox_mgmt_assertions').select('*').eq('programme_id', programmeId).order('assertion_date', { ascending: false }))

export const upsertAssertion = (data) =>
  handle(supabase.from('sox_mgmt_assertions').upsert(sanitise(data)).select().single())

export const updateAssertionStatus = (id, status, date) =>
  handle(supabase.from('sox_mgmt_assertions').update({ status, assertion_date: date }).eq('id', id))

// ── STANDARDS TRACKER ────────────────────────────────────────
export const getStandardsAck = (programmeId) =>
  handle(supabase.from('sox_standards_ack').select('*').eq('programme_id', programmeId))

export const upsertStandardsAck = (data) =>
  handle(supabase.from('sox_standards_ack').upsert(sanitise(data)).select().single())

// ── AUDIT REPORTS ────────────────────────────────────────────
export const getReports = (programmeId) =>
  handle(supabase.from('sox_audit_reports').select('*').eq('programme_id', programmeId).order('created_at', { ascending: false }))

export const upsertReport = (data) =>
  handle(supabase.from('sox_audit_reports').upsert(sanitise(data)).select().single())

export const deleteReport = (id) =>
  handle(supabase.from('sox_audit_reports').delete().eq('id', id))

// ── DASHBOARD STATS ──────────────────────────────────────────
export const getDashboardStats = async (programmeId) => {
  const [scope, rcm, findings, deficiencies, remediation, vendors] = await Promise.all([
    handle(supabase.from('sox_scope').select('id, decision', { count: 'exact' }).eq('programme_id', programmeId)),
    handle(supabase.from('sox_rcm').select('id, status', { count: 'exact' }).eq('programme_id', programmeId)),
    handle(supabase.from('sox_findings').select('id, classification').eq('programme_id', programmeId)),
    handle(supabase.from('sox_deficiency_log').select('id, classification, status').eq('programme_id', programmeId)),
    handle(supabase.from('sox_remediation').select('id, status').eq('programme_id', programmeId)),
    handle(supabase.from('sox_vendor_reviews').select('id, reliance_decision').eq('programme_id', programmeId)),
  ])
  return { scope, rcm, findings, deficiencies, remediation, vendors }
}

// ── AI EDGE FUNCTION ─────────────────────────────────────────
export const callAI = async ({ systemPrompt, userMessage }) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ systemPrompt, userMessage }),
  })
  if (!res.ok) throw new Error(`AI call failed: ${res.status}`)
  return res.json()
}

// ── ANALYTICS QUERIES ────────────────────────────────────────
export const getAnalyticsData = async (programmeId) => {
  const [rcm, findings, deficiencies, remediation, testingItems, jeSegments, vendors, ipe] = await Promise.all([
    handle(supabase.from('sox_rcm').select('domain, status, risk_rating').eq('programme_id', programmeId)),
    handle(supabase.from('sox_findings').select('domain, classification, severity, is_draft').eq('programme_id', programmeId)),
    handle(supabase.from('sox_deficiency_log').select('classification, status, audit_comm_req, public_disc_req').eq('programme_id', programmeId)),
    handle(supabase.from('sox_remediation').select('status').eq('programme_id', programmeId)),
    handle(supabase.from('sox_testing_items').select('exception').eq('programme_id', programmeId)),
    handle(supabase.from('sox_je_segments').select('segment_type, risk_level, population_count, sample_size').eq('programme_id', programmeId)),
    handle(supabase.from('sox_vendor_reviews').select('reliance_decision, report_type').eq('programme_id', programmeId)),
    handle(supabase.from('sox_ipe_validations').select('validated').eq('programme_id', programmeId)),
  ])
  return { rcm: rcm||[], findings: findings||[], deficiencies: deficiencies||[], remediation: remediation||[], testingItems: testingItems||[], jeSegments: jeSegments||[], vendors: vendors||[], ipe: ipe||[] }
}

// ── NOTIFICATIONS ────────────────────────────────────────────
export const getNotifications = async (programmeId) => {
  const today = new Date().toISOString().slice(0,10)
  const [overdueRem, openMW, openSD, unvalidatedIPE, unsignedAssertions] = await Promise.all([
    handle(supabase.from('sox_remediation').select('id, action, target_date, status').eq('programme_id', programmeId).neq('status','Closed').lt('target_date', today)),
    handle(supabase.from('sox_deficiency_log').select('id, ref, classification').eq('programme_id', programmeId).eq('classification','MW').eq('status','Open')),
    handle(supabase.from('sox_deficiency_log').select('id, ref, classification').eq('programme_id', programmeId).eq('classification','SD').eq('status','Open')),
    handle(supabase.from('sox_ipe_validations').select('id, report_name').eq('programme_id', programmeId).eq('validated', false)),
    handle(supabase.from('sox_mgmt_assertions').select('id, assertion_type, fiscal_year, status').eq('programme_id', programmeId).eq('status','Draft')),
  ])
  const notifications = []
  ;(overdueRem||[]).forEach(r => notifications.push({ id:r.id, type:'danger', title:'Overdue remediation', body: r.action?.slice(0,60), link:'/manage/remediation' }))
  ;(openMW||[]).forEach(r => notifications.push({ id:r.id, type:'danger', title:`Material weakness open — ${r.ref}`, body:'Public 10-K disclosure required', link:'/execute/deficiencies' }))
  ;(openSD||[]).forEach(r => notifications.push({ id:r.id, type:'warning', title:`Significant deficiency open — ${r.ref}`, body:'Audit committee communication required', link:'/execute/deficiencies' }))
  ;(unvalidatedIPE||[]).forEach(r => notifications.push({ id:r.id, type:'warning', title:'IPE not validated', body: r.report_name?.slice(0,60), link:'/execute/ipe' }))
  ;(unsignedAssertions||[]).forEach(r => notifications.push({ id:r.id, type:'info', title:`§${r.assertion_type} assertion unsigned`, body:`FY${r.fiscal_year} — status: ${r.status}`, link:'/manage/assertions' }))
  return notifications
}

// ── MULTI-ENGAGEMENT COMPARISON ──────────────────────────────
export const getComparisonData = async (programmeIds) => {
  const results = await Promise.all(programmeIds.map(async (pid) => {
    const [prog, rcm, findings, deficiencies, remediation] = await Promise.all([
      handle(supabase.from('programmes').select('name, fiscal_year, sector').eq('id', pid).single()),
      handle(supabase.from('sox_rcm').select('status').eq('programme_id', pid)),
      handle(supabase.from('sox_findings').select('classification').eq('programme_id', pid)),
      handle(supabase.from('sox_deficiency_log').select('classification, status').eq('programme_id', pid)),
      handle(supabase.from('sox_remediation').select('status').eq('programme_id', pid)),
    ])
    return {
      id: pid,
      name: prog?.name || pid,
      fiscal_year: prog?.fiscal_year || '—',
      sector: prog?.sector || '—',
      controls_total: rcm?.length || 0,
      controls_tested: rcm?.filter(r => r.status !== 'Not Tested').length || 0,
      controls_effective: rcm?.filter(r => r.status === 'Effective').length || 0,
      findings_total: findings?.length || 0,
      major_nc: findings?.filter(f => f.classification === 'Major NC').length || 0,
      minor_nc: findings?.filter(f => f.classification === 'Minor NC').length || 0,
      mw_open: deficiencies?.filter(d => d.classification === 'MW' && d.status === 'Open').length || 0,
      sd_open: deficiencies?.filter(d => d.classification === 'SD' && d.status === 'Open').length || 0,
      rem_closed: remediation?.filter(r => r.status === 'Closed').length || 0,
      rem_open: remediation?.filter(r => r.status !== 'Closed').length || 0,
    }
  }))
  return results
}

// ── AUDIT LOG ────────────────────────────────────────────────
export const getAuditLog = (programmeId, limit=100) =>
  handle(supabase.from('sox_audit_log').select('*').eq('programme_id', programmeId).order('created_at', { ascending:false }).limit(limit))

// ── EVIDENCE UPLOAD ──────────────────────────────────────────
export const uploadEvidence = async (file, programmeId, recordId) => {
  const ext = file.name.split('.').pop()
  const path = `${programmeId}/${recordId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from('sox-evidence').upload(path, file, { upsert: false })
  if (error) { logError(error.message); return null }
  return data.path
}

export const getEvidenceFiles = async (programmeId, recordId) => {
  const { data, error } = await supabase.storage.from('sox-evidence').list(`${programmeId}/${recordId}`)
  if (error) { logError(error.message); return [] }
  return data || []
}

export const getEvidenceUrl = async (path) => {
  const { data } = await supabase.storage.from('sox-evidence').createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

export const deleteEvidence = async (path) => {
  const { error } = await supabase.storage.from('sox-evidence').remove([path])
  return !error
}

// ── PROGRAMME TEMPLATES ───────────────────────────────────────
export const getTemplates = (programmeId) =>
  handle(supabase.from('sox_programme_templates').select('*').eq('programme_id', programmeId).order('domain'))

export const upsertTemplate = (data) =>
  handle(supabase.from('sox_programme_templates').upsert(sanitise(data)).select().single())

export const deleteTemplate = (id) =>
  handle(supabase.from('sox_programme_templates').delete().eq('id', id))

// ── PCAOB INSPECTION FINDINGS ─────────────────────────────────
export const getInspectionFindings = (programmeId) =>
  handle(supabase.from('sox_inspection_findings').select('*').eq('programme_id', programmeId).order('pcaob_year', { ascending: false }))

export const upsertInspectionFinding = (data) =>
  handle(supabase.from('sox_inspection_findings').upsert(sanitise(data)).select().single())

export const deleteInspectionFinding = (id) =>
  handle(supabase.from('sox_inspection_findings').delete().eq('id', id))

// ── MILESTONES ────────────────────────────────────────────────
export const getMilestones = (programmeId) =>
  handle(supabase.from('sox_milestones').select('*').eq('programme_id', programmeId).order('due_date'))

export const upsertMilestone = (data) =>
  handle(supabase.from('sox_milestones').upsert(sanitise(data)).select().single())

export const deleteMilestone = (id) =>
  handle(supabase.from('sox_milestones').delete().eq('id', id))

// ── QC REVIEWS ────────────────────────────────────────────────
export const getQCReviews = (programmeId) =>
  handle(supabase.from('sox_qc_reviews').select('*').eq('programme_id', programmeId).order('created_at', { ascending:false }))

export const upsertQCReview = (data) =>
  handle(supabase.from('sox_qc_reviews').upsert(sanitise(data)).select().single())

export const deleteQCReview = (id) =>
  handle(supabase.from('sox_qc_reviews').delete().eq('id', id))

// ── PORTAL ACCESS ─────────────────────────────────────────────
export const getPortalTokens = (programmeId) =>
  handle(supabase.from('sox_portal_access').select('*').eq('programme_id', programmeId).order('created_at', { ascending:false }))

export const createPortalToken = (data) =>
  handle(supabase.from('sox_portal_access').insert(sanitise(data)).select().single())

export const revokePortalToken = (id) =>
  handle(supabase.from('sox_portal_access').update({ active:false }).eq('id', id))

export const getPortalData = async (token) => {
  // Served by the portal-data Edge Function using the service role.
  // The browser never queries engagement tables for portal access, so RLS
  // on those tables stays strict and tokens cannot be enumerated client-side.
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.error ? null : data
  } catch (e) {
    logError(e.message)
    return null
  }
}


// ── EXECUTIVE DASHBOARD ───────────────────────────────────────
export const getExecutiveData = async (programmeId) => {
  const [rcm, findings, defs, rem, milestones, qc, assertions, ipe, vendors, cuecs, workpapers, reports] = await Promise.all([
    handle(supabase.from('sox_rcm').select('domain, status, risk_rating, control_id').eq('programme_id', programmeId)),
    handle(supabase.from('sox_findings').select('domain, classification, severity, is_draft, root_cause, title, control_id').eq('programme_id', programmeId)),
    handle(supabase.from('sox_deficiency_log').select('ref, classification, status, audit_comm_req, public_disc_req, comm_date').eq('programme_id', programmeId)),
    handle(supabase.from('sox_remediation').select('status, target_date, action').eq('programme_id', programmeId)),
    handle(supabase.from('sox_milestones').select('milestone_type, status, due_date').eq('programme_id', programmeId)),
    handle(supabase.from('sox_qc_reviews').select('status, conclusion, signed_at').eq('programme_id', programmeId)),
    handle(supabase.from('sox_mgmt_assertions').select('assertion_type, status, icfr_effective, has_mw').eq('programme_id', programmeId)),
    handle(supabase.from('sox_ipe_validations').select('validated').eq('programme_id', programmeId)),
    handle(supabase.from('sox_vendor_reviews').select('id, vendor_name, reliance_decision').eq('programme_id', programmeId)),
    handle(supabase.from('sox_cuec_items').select('tested, vendor_review_id').eq('programme_id', programmeId)),
    handle(supabase.from('sox_workpaper_shells').select('control_id, status, ipe_validated').eq('programme_id', programmeId)),
    handle(supabase.from('sox_audit_reports').select('status, report_type').eq('programme_id', programmeId)),
  ])
  return {
    rcm:rcm||[], findings:findings||[], defs:defs||[], rem:rem||[], milestones:milestones||[],
    qc:qc||[], assertions:assertions||[], ipe:ipe||[], vendors:vendors||[], cuecs:cuecs||[],
    workpapers:workpapers||[], reports:reports||[]
  }
}

// ── ENGAGEMENT PROGRESS (workflow strip) ──────────────────────
export const getEngagementProgress = async (programmeId) => {
  const [scope, rcm, wp, ipe, items, findings, defs, reports] = await Promise.all([
    handle(supabase.from('sox_scope').select('id', { count:'exact', head:true }).eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_rcm').select('status').eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_workpaper_shells').select('status').eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_ipe_validations').select('validated').eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_testing_items').select('id', { count:'exact', head:true }).eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_findings').select('is_draft').eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_deficiency_log').select('id', { count:'exact', head:true }).eq('programme_id', programmeId), { silent:true }),
    handle(supabase.from('sox_audit_reports').select('status').eq('programme_id', programmeId), { silent:true }),
  ])
  const len = x => Array.isArray(x) ? x.length : 0
  return {
    scope:     len(scope) > 0,
    rcm:       len(rcm) > 0,
    workpaper: len(wp) > 0,
    ipe:       len(ipe) > 0 && ipe.every(i => i.validated),
    testing:   len(items) > 0,
    findings:  len(findings) > 0 && findings.every(f => !f.is_draft),
    report:    len(reports) > 0 && reports.some(r => r.status === 'Final'),
    counts: {
      rcmTested: len(rcm) ? rcm.filter(r => r.status !== 'Not Tested').length : 0,
      rcmTotal:  len(rcm),
      ipeOk:     len(ipe) ? ipe.filter(i => i.validated).length : 0,
      ipeTotal:  len(ipe),
      findSigned:len(findings) ? findings.filter(f => !f.is_draft).length : 0,
      findTotal: len(findings),
    }
  }
}

// ── SECTOR VARIANTS → RCM (wiring the orphaned table) ─────────
export const promoteSectorVariantToRCM = async (variant, programmeId) =>
  upsertRCM({
    programme_id: programmeId,
    control_id:   variant.control_id,
    domain:       variant.domain || 'LA',
    control_title:variant.additional_req?.slice(0,120) || variant.control_id,
    objective:    variant.additional_req || null,
    risk_rating:  'High',
    control_type: 'Preventive',
    frequency:    'quarterly',
    pcaob_ref:    variant.standard_basis || null,
    sector_tags:  [variant.sector],
    status:       'Not Tested',
    is_key_control: true,
  })
