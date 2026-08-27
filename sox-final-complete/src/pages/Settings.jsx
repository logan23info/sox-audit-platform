import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { upsertProfile } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { Field, Input } from '../components/FormField'

export default function Settings() {
  const { user, profile, setProfile } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ full_name:profile?.full_name||'', firm:profile?.firm||'', title:profile?.title||'' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const save = async () => {
    setSaving(true)
    await upsertProfile({id:user.id,...form})
    setProfile(p=>({...p,...form}))
    toast({type:'success',title:'Profile updated'})
    setSaving(false)
  }
  return (
    <div className="p-6 max-w-lg mx-auto">
      <PageHeader title="Settings" subtitle="Profile and workspace preferences"/>
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">{user?.email}</p>
        <Field label="Full name"><Input value={form.full_name} onChange={set('full_name')} maxLength={80}/></Field>
        <Field label="Firm / organisation"><Input value={form.firm} onChange={set('firm')} maxLength={80}/></Field>
        <Field label="Title"><Input placeholder="IT Audit Manager" value={form.title} onChange={set('title')} maxLength={80}/></Field>
        <div className="flex justify-end mt-2"><button className="btn btn-primary" onClick={save} disabled={saving}>Save profile</button></div>
      </div>
    </div>
  )
}
