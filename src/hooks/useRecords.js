import { useState, useEffect, useCallback } from 'react'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'

/**
 * Standard CRUD lifecycle for a programme-scoped record table.
 *
 * Replaces the ~40 lines of identical state/load/save/delete boilerplate
 * duplicated across every register page. The DB layer already surfaces
 * failures via the error bridge, so this only handles validation and flow.
 *
 *   const r = useRecords({
 *     get: getScope, upsert: upsertScope, del: deleteScope,
 *     blank: BLANK, label: 'System',
 *     required: ['system_name'],
 *   })
 *
 *   r.rows, r.loading, r.modal, r.form, r.saving
 *   r.set('field'), r.setForm, r.open(row?), r.close(), r.save(), r.remove(id), r.reload()
 */
export function useRecords({
  get,                 // (programmeId) => Promise<rows>
  upsert,              // (record) => Promise<record|null>
  del,                 // (id) => Promise<any>
  blank = {},          // empty form shape
  required = [],       // field names that must be non-empty
  label = 'Record',    // used in toasts
  beforeSave,          // optional async (form) => form | false  (false aborts)
  afterSave,           // optional async (saved) => void
  confirmDelete = true,
}) {
  const { programmeId } = useProgramme()
  const { toast } = useToast()

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(blank)
  const [saving, setSaving]   = useState(false)

  const reload = useCallback(() => {
    if (!programmeId || !get) return
    setLoading(true)
    return Promise.resolve(get(programmeId))
      .then(d => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [programmeId, get])

  useEffect(() => { reload() }, [reload])

  const set     = k => e => setForm(f => ({ ...f, [k]: e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value }))
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const open    = (row = blank) => { setForm({ ...blank, ...row }); setModal(true) }
  const close   = () => { setModal(false); setForm(blank) }

  const missing = (f) => required.find(k => {
    const v = f[k]
    return v === undefined || v === null || String(v).trim() === ''
  })

  const save = async () => {
    const gap = missing(form)
    if (gap) {
      const pretty = gap.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase())
      toast({ type: 'warning', title: `${pretty} is required`, description: `Enter a value before saving.` })
      return null
    }
    setSaving(true)
    try {
      let payload = { ...form, programme_id: programmeId }
      if (beforeSave) {
        const out = await beforeSave(payload)
        if (out === false) { setSaving(false); return null }
        if (out) payload = out
      }
      const saved = await upsert(payload)
      // null means the DB layer already reported the failure via the error bridge
      if (saved !== null) {
        toast({ type: 'success', title: `${label} saved` })
        if (afterSave) await afterSave(saved)
        close()
        await reload()
      }
      return saved
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (confirmDelete && !window.confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return
    await del(id)
    toast({ type: 'success', title: `${label} deleted` })
    await reload()
  }

  return { rows, loading, modal, form, saving, set, setField, setForm, open, close, save, remove, reload, programmeId }
}
