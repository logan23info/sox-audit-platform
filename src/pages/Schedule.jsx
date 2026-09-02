import { useEffect, useState } from 'react'
import { Calendar, Plus, CheckCircle } from 'lucide-react'
import { getMilestones, upsertMilestone, deleteMilestone } from '../lib/supabase'
import { useProgramme } from '../context/ProgrammeContext'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import RecordTable from '../components/RecordTable'
import Modal from '../components/Modal'
import { Field, Input, Select, Textarea } from '../components/FormField'

const MILESTONE_TYPES = ['Planning','Fieldwork','Review','Reporting','Follow-up']
const STATUSES = ['Pending','In Progress','Complete','Overdue','Deferred']

const BASE_MILESTONES = [
  { title:'Engagement letter signed', milestone_type:'Planning', status:'Pending' },
  { title:'Risk assessment complete', milestone_type:'Planning', status:'Pending' },
  { title:'Scoping worksheet approved', milestone_type:'Planning', status:'Pending' },
  { title:'RCM finalised and approved', milestone_type:'Planning', status:'Pending' },
  { title:'Workpaper shells set up', milestone_type:'Planning', status:'Pending' },
  { title:'IPE validation complete', milestone_type:'Fieldwork', status:'Pending' },
  { title:'TOC testing complete', milestone_type:'Fieldwork', status:'Pending' },
  { title:'JE testing complete', milestone_type:'Fieldwork', status:'Pending' },
  { title:'Findings drafted and reviewed', milestone_type:'Fieldwork', status:'Pending' },
  { title:'Deficiency log finalised', milestone_type:'Review', status:'Pending' },
  { title:'Management response obtained', milestone_type:'Review', status:'Pending' },
  { title:'QC review complete', milestone_type:'Review', status:'Pending' },
  { title:'Draft report issued', milestone_type:'Reporting', status:'Pending' },
  { title:'Final report issued', milestone_type:'Reporting', status:'Pending' },
  { title:'§302/§404 assertions signed', milestone_type:'Reporting', status:'Pending' },
  { title:'Remediation plan agreed', milestone_type:'Follow-up', status:'Pending' },
]

const BLANK = { title:'', milestone_type:'Planning', due_date:'', completed_date:'', status:'Pending', owner:'', notes:'' }

const statusColor = s => s==='Complete'?'badge-green':s==='In Progress'?'badge-blue':s==='Overdue'?'badge-red':s==='Deferred'?'badge-gray':'badge-amber'

export default function Schedule() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]     = useState([])
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const load = () => getMilestones(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r}); setModal(true) }

  const save = async () => {
    if (!form.title) { toast({type:'warning',title:'Title required'}); return }
    setSaving(true)
    await upsertMilestone({...form, programme_id:programmeId})
    toast({type:'success',title:'Milestone saved'}); setModal(false); load()
    setSaving(false)
  }

  const markComplete = async (r) => {
    await upsertMilestone({...r, status:'Complete', completed_date:new Date().toISOString().slice(0,10)})
    toast({type:'success',title:'Marked complete'}); load()
  }

  const seed = async () => {
    if (rows.length>0 && !window.confirm('Seed standard milestones?')) return
    setSeeding(true)
    await Promise.all(BASE_MILESTONES.map(m=>upsertMilestone({...m, programme_id:programmeId})))
    toast({type:'success',title:'Standard milestones seeded'}); load()
    setSeeding(false)
  }

  const today = new Date().toISOString().slice(0,10)
  const visible = filter==='ALL'?rows:rows.filter(r=>r.milestone_type===filter)
  const complete = rows.filter(r=>r.status==='Complete').length
  const overdue  = rows.filter(r=>r.due_date&&r.due_date<today&&r.status!=='Complete').length

  const cols = [
    {key:'milestone_type',label:'Phase',render:r=><span className="badge badge-blue text-xs">{r.milestone_type}</span>},
    {key:'title',label:'Milestone'},
    {key:'owner',label:'Owner',render:r=><span className="text-xs text-gray-500">{r.owner||'—'}</span>},
    {key:'due_date',label:'Due',render:r=>r.due_date?<span className={`text-xs ${r.due_date<today&&r.status!=='Complete'?'text-red-500 font-semibold':''}`}>{r.due_date}</span>:'—'},
    {key:'status',label:'Status',render:r=><span className={`badge ${statusColor(r.status)}`}>{r.status}</span>},
    {key:'complete',label:'',render:r=>r.status!=='Complete'&&<button onClick={e=>{e.stopPropagation();markComplete(r)}} className="btn btn-ghost btn-sm p-1 text-green-500" title="Mark complete"><CheckCircle size={14}/></button>},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Calendar size={12}/>Schedule</>} title="Audit schedule & milestones"
        subtitle={`${complete}/${rows.length} complete · ${overdue} overdue`}
        actions={isAuditor&&<div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={seed} disabled={seeding}>Seed milestones</button>
          <button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add milestone</button>
        </div>} />

      {overdue>0&&<div className="alert-danger mb-4"><span className="text-sm font-medium">{overdue} milestone{overdue>1?'s':''} overdue — review and update status.</span></div>}

      {/* Progress bar */}
      {rows.length>0&&(
        <div className="card mb-4 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Overall progress</span>
            <span className="font-bold text-brand-600">{Math.round((complete/rows.length)*100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full transition-all" style={{width:`${Math.round((complete/rows.length)*100)}%`}}/>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            {MILESTONE_TYPES.map(t=>{
              const tc = rows.filter(r=>r.milestone_type===t&&r.status==='Complete').length
              const tt = rows.filter(r=>r.milestone_type===t).length
              return tt>0&&<span key={t}>{t}: {tc}/{tt}</span>
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 flex-wrap">
        {['ALL',...MILESTONE_TYPES].map(t=>(
          <button key={t} onClick={()=>setFilter(t)} className={`btn btn-sm ${filter===t?'btn-primary':'btn-outline'}`}>{t}</button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={visible} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteMilestone(id).then(load):null} emptyMsg="No milestones. Seed standard milestones or add manually."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Milestone">
        <Field label="Title"><Input value={form.title} onChange={set('title')} placeholder="Risk assessment complete" maxLength={150}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phase"><Select value={form.milestone_type} onChange={set('milestone_type')} options={MILESTONE_TYPES}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={STATUSES}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><Input type="date" value={form.due_date||''} onChange={set('due_date')}/></Field>
          <Field label="Completed date"><Input type="date" value={form.completed_date||''} onChange={set('completed_date')}/></Field>
        </div>
        <Field label="Owner"><Input placeholder="Audit manager / IT Lead" value={form.owner||''} onChange={set('owner')} maxLength={80}/></Field>
        <Field label="Notes"><Textarea value={form.notes||''} onChange={set('notes')} maxLength={300}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
