// Portal data — server-side token validation using service role.
// The browser never queries engagement tables directly for portal access.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string' || token.length < 32) {
      return json({ error: 'INVALID_TOKEN' }, 401)
    }

    // Service role client — bypasses RLS, so RLS on content tables stays strict.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: access } = await admin
      .from('sox_portal_access')
      .select('id, programme_id, expires_at, active, access_count, programmes(name, fiscal_year, entity)')
      .eq('token', token)
      .maybeSingle()

    if (!access || !access.active) return json({ error: 'INVALID_TOKEN' }, 401)
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return json({ error: 'TOKEN_EXPIRED' }, 401)
    }

    const pid = access.programme_id

    // Record usage so a leaked link is detectable.
    await admin.from('sox_portal_access').update({
      last_used_at: new Date().toISOString(),
      access_count: (access.access_count ?? 0) + 1,
    }).eq('id', access.id)

    const [findings, deficiencies, remediation, rcm] = await Promise.all([
      admin.from('sox_findings')
        .select('control_id, domain, title, classification, severity')
        .eq('programme_id', pid).eq('is_draft', false),
      admin.from('sox_deficiency_log')
        .select('ref, classification, status, audit_comm_req, public_disc_req')
        .eq('programme_id', pid),
      admin.from('sox_remediation')
        .select('action, owner_role, target_date, status')
        .eq('programme_id', pid),
      admin.from('sox_rcm')
        .select('control_id, domain, control_title, status')
        .eq('programme_id', pid),
    ])

    return json({
      programme:    access.programmes,
      findings:     findings.data ?? [],
      deficiencies: deficiencies.data ?? [],
      remediation:  remediation.data ?? [],
      rcm:          rcm.data ?? [],
    })
  } catch (e) {
    return json({ error: 'SERVER_ERROR', detail: String(e) }, 500)
  }
})
