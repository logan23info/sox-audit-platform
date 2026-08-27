import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, ArrowRight, Trash2 } from 'lucide-react'
import { getProgrammes, createProgramme, deleteProgramme } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { SECTORS, PROGRAMME_STATUSES } from '../constants'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/FormField'
import Spinner from '../components/Spinner'

const BLANK = { name:'', entity:'', fiscal_year: new Date().getFullYear()+'', sector:'general', status:'Planning', description:'' }

export default function Programmes() {
  const { user }               = useAuth()
  const { selectProgramme }    = useProgramme()
  const { toast }              = useToast()
  const navigate               = useNavigate()
  const [list, setList]        = useState([])
  const [loading, setLoading]  = useState(true)
  const [modal, setModal]      = useState(false)
  const [form, setForm]        = useState(BLANK)
  const [saving, setSaving]    = useState(false)

  const load = () => getProgrammes().then(d => { setList(d||[]); setLoading(false) })
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name) { toast({ type:'warning', title:'Name required' }); return }
    setSaving(true)
    const p = await createProgramme({ ...form, user_id: user.id })
    if (p) { toast({ type:'success', title:'Engagement created' }); setModal(false); setForm(BLANK); load() }
    else toast({ type:'error', title:'Failed to create' })
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Delete this engagement and all its data?')) return
    await deleteProgramme(id)
    if (id === localStorage.getItem('sox_programme_id')) selectProgramme(null)
    load()
  }

  const activate = (p) => { selectProgramme(p.id); navigate('/dashboard') }

  if (loading) return <Spinner full />
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Layers size={12}/>Engagements</>} title="SOX Engagements"
        subtitle="Each engagement is one SOX audit programme with its own scope, controls, and team."
        actions={<button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={15}/>New engagement</button>} />

      {list.length === 0 && !loading && (
        <div className="card text-center py-12 border-dashed">
          <Layers size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-gray-500 mb-4">No engagements yet. Create your first SOX audit programme.</p>
          <button className="btn btn-primary" onClick={()=>setModal(true)}>Create engagement</button>
        </div>
      )}

      <div className="grid gap-3">
        {list.map(p => (
          <div key={p.id} className="card card-hover flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                <span className="badge badge-blue">{p.fiscal_year}</span>
                <span className={`badge ${p.status==='Complete'?'badge-green':p.status==='In Progress'?'badge-amber':'badge-gray'}`}>{p.status}</span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{p.entity} · {SECTORS.find(s=>s.id===p.sector)?.label??p.sector}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={()=>remove(p.id)} className="btn btn-ghost btn-sm p-1.5 text-red-400"><Trash2 size={14}/></button>
              <button onClick={()=>activate(p)} className="btn btn-primary btn-sm">Open <ArrowRight size={13}/></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="New SOX engagement">
        <Field label="Engagement name"><Input placeholder="FY2026 SOX Audit — Acme Corp" value={form.name} onChange={set('name')} maxLength={100}/></Field>
        <Field label="Legal entity"><Input placeholder="Acme Corporation Inc." value={form.entity} onChange={set('entity')} maxLength={100}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fiscal year"><Input value={form.fiscal_year} onChange={set('fiscal_year')} maxLength={10}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={PROGRAMME_STATUSES}/></Field>
        </div>
        <Field label="Sector"><Select value={form.sector} onChange={set('sector')} options={SECTORS.map(s=>({value:s.id,label:s.label}))}/></Field>
        <Field label="Description"><Textarea placeholder="Scope, objectives, notes…" value={form.description} onChange={set('description')} maxLength={500}/></Field>
        <div className="flex justify-end gap-2 mt-2">
          <button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>Create engagement</button>
        </div>
      </Modal>
    </div>
  )
}
