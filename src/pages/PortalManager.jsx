import { useEffect, useState } from 'react'
import { Link2, Plus, Copy, Trash2, Eye } from 'lucide-react'
import { getPortalTokens, createPortalToken, revokePortalToken } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import { Field, Input } from '../components/FormField'

const BLANK = { label:'Management team', expires_at:'' }

export default function PortalManager() {
  const { programmeId, isLead } = useProgramme()
  const { user } = useAuth()
  const { toast } = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getPortalTokens(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const create = async () => {
    setSaving(true)
    await createPortalToken({ programme_id:programmeId, label:form.label, expires_at:form.expires_at||null, created_by:user.id })
    toast({type:'success',title:'Portal link created'}); setModal(false); setForm(BLANK); load()
    setSaving(false)
  }

  const copyLink = (token) => {
    const url = `${window.location.origin}/portal?token=${token}`
    navigator.clipboard.writeText(url)
    toast({type:'success',title:'Link copied to clipboard'})
  }

  const revoke = async (id) => {
    if (!confirm('Revoke this portal link? Auditee will lose access.')) return
    await revokePortalToken(id)
    toast({type:'success',title:'Link revoked'}); load()
  }

  const cols = [
    {key:'label',label:'Label'},
    {key:'active',label:'Status',render:r=><span className={`badge ${r.active?'badge-green':'badge-gray'}`}>{r.active?'Active':'Revoked'}</span>},
    {key:'expires_at',label:'Expires',render:r=>r.expires_at?new Date(r.expires_at).toLocaleDateString():'Never'},
    {key:'created_at',label:'Created',render:r=>new Date(r.created_at).toLocaleDateString()},
    {key:'actions',label:'',render:r=>r.active&&(
      <div className="flex gap-1">
        <button onClick={e=>{e.stopPropagation();copyLink(r.token)}} className="btn btn-ghost btn-sm p-1" title="Copy link"><Copy size={13}/></button>
        <a href={`/portal?token=${r.token}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm p-1" title="Preview"><Eye size={13}/></a>
        <button onClick={e=>{e.stopPropagation();revoke(r.id)}} className="btn btn-ghost btn-sm p-1 text-red-400" title="Revoke"><Trash2 size={13}/></button>
      </div>
    )},
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Link2 size={12}/>Client Portal</>} title="Management portal links"
        subtitle="Generate read-only links for management/auditee to view findings and deficiencies."
        actions={isLead&&<button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={15}/>Create link</button>} />
      <div className="alert-info mb-4"><span className="text-sm">Portal links give read-only access to signed-off findings, deficiency log, and remediation status. No editing capability. Revoke when engagement closes.</span></div>
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} emptyMsg="No portal links created yet."/>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Create portal link">
        <Field label="Label" hint="Who is this link for?"><Input placeholder="CFO team / Audit committee" value={form.label} onChange={set('label')} maxLength={80}/></Field>
        <Field label="Expiry date (optional)" hint="Leave blank for no expiry"><Input type="date" value={form.expires_at||''} onChange={set('expires_at')}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={create} disabled={saving}>Create link</button></div>
      </Modal>
    </div>
  )
}
