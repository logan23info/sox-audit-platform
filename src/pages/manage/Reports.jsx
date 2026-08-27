import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { getReports, upsertReport, deleteReport, getDeficiencies, getFindings } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

const BLANK = { title:'', report_type:'ITGC Audit Report', period:'', executive_summary:'', scope_section:'', findings_section:'', conclusion:'', status:'Draft' }
const REPORT_TYPES = ['ITGC Audit Report','Management Letter','Deficiency Report','Executive Summary','Interim Report']

export default function Reports() {
  const { programmeId, programme, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [rows, setRows]     = useState([])
  const [findings, setFindings] = useState([])
  const [defs, setDefs]     = useState([])
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => getReports(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId){ load(); getFindings(programmeId).then(d=>setFindings(d||[])); getDeficiencies(programmeId).then(d=>setDefs(d||[])) } },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const autoFillFindings = () => {
    const lines = findings.map(f=>`• ${f.control_id||''} — ${f.title}: ${f.classification||'Pending classification'}`).join('\n')
    setForm(f=>({...f,findings_section:lines||'No findings recorded.'}))
  }

  const open = (r=BLANK) => { setForm({...BLANK,...r, period:r.period||programme?.fiscal_year||''}); setModal(true) }
  const save = async () => {
    if (!form.title) { toast({type:'warning',title:'Title required'}); return }
    setSaving(true)
    await upsertReport({...form, programme_id:programmeId})
    toast({type:'success',title:'Report saved'}); setModal(false); load()
    setSaving(false)
  }

  const mwCount = defs.filter(d=>d.classification==='MW'&&d.status==='Open').length
  const cols = [
    {key:'title',label:'Report title'},{key:'report_type',label:'Type'},{key:'period',label:'Period'},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Final'?'badge-green':r.status==='Under Review'?'badge-blue':'badge-gray'}`}>{r.status}</span>},
    {key:'updated_at',label:'Updated',render:r=>r.updated_at?new Date(r.updated_at).toLocaleDateString():'—'},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><FileText size={12}/>Manage · Reports</>} title="Audit report builder"
        subtitle={`${rows.length} reports · ${mwCount} MW · ${defs.filter(d=>d.classification==='SD').length} SD`}
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New report</button>} />
      {mwCount>0&&<div className="alert-danger mb-4"><span className="text-sm font-medium">{mwCount} open material weakness — 10-K Item 9A public disclosure required. Do not issue clean opinion.</span></div>}
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteReport(id).then(load):null} emptyMsg="No reports yet."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Audit report" size="max-w-3xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Report title"><Input value={form.title} onChange={set('title')} placeholder="FY2026 SOX ITGC Audit Report" maxLength={150}/></Field>
          <Field label="Report type"><Select value={form.report_type} onChange={set('report_type')} options={REPORT_TYPES}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period covered"><Input value={form.period} onChange={set('period')} maxLength={40}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Draft','Under Review','Final']}/></Field>
        </div>
        <Field label="Executive summary"><Textarea value={form.executive_summary} onChange={set('executive_summary')} placeholder="We have completed our assessment of IT General Controls for FY2026…" maxLength={1000}/></Field>
        <Field label="Scope section"><Textarea value={form.scope_section} onChange={set('scope_section')} placeholder="Our procedures covered the four ITGC domains across [N] in-scope systems…" maxLength={1000}/></Field>
        <Field label="Findings section">
          <div className="flex justify-end mb-1"><button className="btn btn-ghost btn-sm text-xs" onClick={autoFillFindings}>Auto-fill from finding register</button></div>
          <Textarea value={form.findings_section} onChange={set('findings_section')} maxLength={3000} className="min-h-[120px]"/>
        </Field>
        <Field label="Conclusion"><Textarea value={form.conclusion} onChange={set('conclusion')} placeholder="Based on our procedures, ITGC controls operated [effectively / with the following exceptions]…" maxLength={1000}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
