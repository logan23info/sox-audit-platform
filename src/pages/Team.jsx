import { useEffect, useState } from 'react'
import { Users, Plus, Trash2 } from 'lucide-react'
import { getMembers, addMember, removeMember, updateMemberRole, findUserByEmail } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MEMBER_ROLES } from '../constants'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { Field, Input, Select } from '../components/FormField'

export default function Team() {
  const { programmeId, isLead } = useProgramme()
  const { user }   = useAuth()
  const { toast }  = useToast()
  const [members, setMembers] = useState([])
  const [modal, setModal]     = useState(false)
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('Auditor')
  const [saving, setSaving]   = useState(false)

  const load = () => getMembers(programmeId).then(d => setMembers(d || [])).catch(() => setMembers([]))
  useEffect(() => { if (programmeId) load() }, [programmeId])

  const invite = async () => {
    if (!email) { toast({ type:'warning', title:'Email required' }); return }
    setSaving(true)
    const profile = await findUserByEmail(email)

    // Generic response either way — a failed lookup must not confirm whether
    // an account exists on the platform (prevents email enumeration).
    if (!profile) {
      toast({
        type: 'info',
        title: 'Invitation processed',
        description: 'If an account exists for that address it now has access. Ask them to sign up first if they cannot see the engagement.',
      })
      setModal(false); setEmail(''); setSaving(false); return
    }
    if (members.find(m => m.user_id === profile.id)) {
      toast({ type:'warning', title:'Already a member of this engagement' })
      setSaving(false); return
    }
    const added = await addMember({ programme_id: programmeId, user_id: profile.id, invited_by: user.id, role })
    if (added !== null) {
      toast({ type:'success', title:`${profile.full_name || 'Member'} added as ${role}` })
      setModal(false); setEmail(''); load()
    }
    setSaving(false)
  }

  const changeRole = async (id, newRole) => {
    await updateMemberRole(id, newRole)
    toast({ type:'success', title:'Role updated' })
    load()
  }

  const remove = async (id, memberId) => {
    if (memberId === user.id) { toast({ type:'warning', title:"Can't remove yourself" }); return }
    if (!confirm('Remove this member? They will lose access immediately.')) return
    await removeMember(id)
    toast({ type:'success', title:'Member removed' })
    load()
  }

  const roleColor = r => r === 'Lead' ? 'badge-red' : r === 'Auditor' ? 'badge-blue' : 'badge-gray'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader eyebrow={<><Users size={12}/>Team</>} title="Engagement team"
        subtitle="Manage access to this engagement. Lead can invite and remove members."
        actions={isLead && <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15}/>Invite member</button>} />

      <div className="alert-info mb-4"><span className="text-sm">Members must have an existing account. Share the platform URL for them to sign up first.</span></div>

      <div className="card divide-y divide-gray-100 dark:divide-gray-800 p-0">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400">
                {(m.profiles?.full_name || m.profiles?.email || m.user_id || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{m.profiles?.full_name || '—'}</div>
                <div className="text-xs text-gray-400">{m.profiles?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLead && m.user_id !== user.id ? (
                <select className="select text-xs py-1 w-28" value={m.role} onChange={e => changeRole(m.id, e.target.value)}>
                  {MEMBER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className={`badge ${roleColor(m.role)}`}>{m.role}</span>
              )}
              {isLead && m.user_id !== user.id && (
                <button onClick={() => remove(m.id, m.user_id)} className="btn btn-ghost btn-sm p-1 text-red-400"><Trash2 size={14}/></button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No members yet.</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Invite member">
        <Field label="Email address" hint="Must match the email they used to sign up.">
          <Input type="email" placeholder="auditor@firm.com" value={email} onChange={e => setEmail(e.target.value)} maxLength={150}/>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={e => setRole(e.target.value)} options={MEMBER_ROLES.map(r => ({ value:r, label:r }))}/>
        </Field>
        <div className="text-xs text-gray-400 mb-4">
          <strong>Lead</strong> — full access including invite/remove · <strong>Auditor</strong> — create/edit records · <strong>Reviewer</strong> — read only
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={invite} disabled={saving}>Add member</button>
        </div>
      </Modal>
    </div>
  )
}
