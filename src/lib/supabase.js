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

const handle = async (promise) => {
  const { data, error } = await promise
  if (error) { logError(error.message); return null }
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

export const upsertWorkpaper = (data) =>
  handle(supabase.from('sox_workpaper_shells').upsert(sanitise(data)).select().single())

export const deleteWorkpaper = (id) =>
  handle(supabase.from('sox_workpaper_shells').delete().eq('id', id))

// ── SAMPLE PLAN ──────────────────────────────────────────────
export const getSamplePlan = async (workpaperId) => {
  const { data } = await supabase.from('sox_sample_plan').select('*').eq('workpaper_id', workpaperId).maybeSingle()
  return data
}

export const upsertSamplePlan = (data) =>
  handle(supabase.from('sox_sample_plan').upsert(sanitise(data)).select().single())

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
