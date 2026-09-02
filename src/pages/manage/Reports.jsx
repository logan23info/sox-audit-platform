import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { getReports, upsertReport, deleteReport, getDeficiencies, getFindings, getRCM } from '../../lib/supabase'
import { exportXLSX, exportPDF } from '../../lib/exportUtils'
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
  const [rows, setRows]         = useState([])
  const [findings, setFindings] = useState([])
  const [defs, setDefs]         = useState([])
  const [rcm, setRcm]           = useState([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(BLANK)
  const [saving, setSaving]     = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = () => getReports(programmeId).then(d => setRows(d || []))
  useEffect(() => {
    if (!programmeId) return
    load()
    getFindings(programmeId).then(d => setFindings(d || []))
    getDeficiencies(programmeId).then(d => setDefs(d || []))
    getRCM(programmeId).then(d => setRcm(d || []))
  }, [programmeId])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const open = (r = BLANK) => { setForm({ ...BLANK, ...r, period: r.period || programme?.fiscal_year || '' }); setModal(true) }
  const save = async () => {
    if (!form.title) { toast({ type:'warning', title:'Title required' }); return }
    setSaving(true)
    await upsertReport({ ...form, programme_id: programmeId })
    toast({ type:'success', title:'Report saved' }); setModal(false); load()
    setSaving(false)
  }
  const autoFill = () => {
    const lines = findings.map(f => `${f.control_id||''} - ${f.title}: ${f.classification||'Pending'}`).join('\n')
    setForm(f => ({ ...f, findings_section: lines || 'No findings recorded.' }))
  }
  const doExportXLSX = async (r) => {
    setExporting(true)
    try {
      exportXLSX({
        filename: `${programme?.name||'SOX'}_${r.title}_${r.period||''}`.replace(/\s+/g,'_'),
        sheets: [
          { name:'Summary', data:[{Field:'Report',Value:r.title},{Field:'Period',Value:r.period},{Field:'Status',Value:r.status},{Field:'Summary',Value:r.executive_summary},{Field:'Conclusion',Value:r.conclusion}] },
          { name:'Findings', data:findings.map(f=>({'Control ID':f.control_id,Domain:f.domain,Title:f.title,Classification:f.classification,Severity:f.severity,'Root Cause':f.root_cause,Draft:f.is_draft?'Yes':'No'})) },
          { name:'Deficiency Log', data:defs.map(d=>({Ref:d.ref,Classification:d.classification,'Audit Comm.':d.audit_comm_req?'Required':'No','Public Disc.':d.public_disc_req?'Required':'No',Status:d.status})) },
          { name:'RCM', data:rcm.map(c=>({'Control ID':c.control_id,Domain:c.domain,Title:c.control_title,Risk:c.risk_rating,Type:c.control_type,Frequency:c.frequency,Status:c.status})) },
        ]
      })
      toast({ type:'success', title:'XLSX downloaded' })
    } catch(e) { toast({ type:'error', title:'Export failed', description:e.message }) }
    setExporting(false)
  }
  const doExportPDF = async (r) => {
    setExporting(true)
    try {
      const mw = defs.filter(d=>d.classification==='MW').length
      const sd = defs.filter(d=>d.classification==='SD').length
      exportPDF({
        filename: `${programme?.name||'SOX'}_${r.title}`.replace(/\s+/g,'_'),
        title: r.title,
        subtitle: `${programme?.name||''} · FY${r.period||''} · ${r.status} · ${new Date().toLocaleDateString()}`,
        sections: [
          { heading:'Executive Summary', text:r.executive_summary||'Not provided.' },
          { heading:'Scope', text:r.scope_section||'Not provided.' },
          { heading:`Findings (${findings.length} · ${mw} MW · ${sd} SD)`, columns:['Control ID','Domain','Title','Classification','Severity','Draft'], rows:findings.map(f=>[f.control_id||'—',f.domain||'—',f.title,f.classification||'—',f.severity||'—',f.is_draft?'Yes':'No']) },
          { heading:`Deficiency Log (${defs.length})`, columns:['Ref','Classification','Audit Comm.','Public Disc.','Status'], rows:defs.map(d=>[d.ref,d.classification,d.audit_comm_req?'Required':'No',d.public_disc_req?'Required':'No',d.status]) },
          { heading:'Conclusion', text:r.conclusion||'Not provided.' },
        ]
      })
      toast({ type:'success', title:'PDF downloaded' })
    } catch(e) { toast({ type:'error', title:'Export failed', description:e.message }) }
    setExporting(false)
  }

  const mwCount = defs.filter(d=>d.classification==='MW'&&d.status==='Open').length
  const cols = [
    {key:'title',label:'Report title'},{key:'report_type',label:'Type'},{key:'period',label:'Period'},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Final'?'badge-green':r.status==='Under Review'?'badge-blue':'badge-gray'}`}>{r.status}</span>},
    {key:'export',label:'Export',render:r=>(
      <div className="flex gap-1">
        <button onClick={e=>{e.stopPropagation();doExportXLSX(r)}} className="btn btn-outline btn-sm" disabled={exporting}>XLSX</button>
        <button onClick={e=>{e.stopPropagation();doExportPDF(r)}} className="btn btn-outline btn-sm" disabled={exporting}>PDF</button>
      </div>
    )},
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><FileText size={12}/>Manage · Reports</>} title="Audit report builder"
        subtitle={`${rows.length} reports · ${mwCount} MW`}
        actions={isAuditor&&<button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>New report</button>} />
      {mwCount>0&&<div className="alert-danger mb-4"><span className="text-sm font-medium">{mwCount} open MW — 10-K Item 9A disclosure required.</span></div>}
      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={rows} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteReport(id).then(load):null} emptyMsg="No reports yet."/>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Audit report" size="max-w-3xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title"><Input value={form.title} onChange={set('title')} placeholder="FY2026 SOX ITGC Audit Report" maxLength={150}/></Field>
          <Field label="Type"><Select value={form.report_type} onChange={set('report_type')} options={REPORT_TYPES}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period"><Input value={form.period} onChange={set('period')} maxLength={40}/></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')} options={['Draft','Under Review','Final']}/></Field>
        </div>
        <Field label="Executive summary"><Textarea value={form.executive_summary} onChange={set('executive_summary')} maxLength={1000}/></Field>
        <Field label="Scope section"><Textarea value={form.scope_section} onChange={set('scope_section')} maxLength={1000}/></Field>
        <Field label="Findings section">
          <div className="flex justify-end mb-1"><button className="btn btn-ghost btn-sm text-xs" onClick={autoFill}>Auto-fill from register</button></div>
          <Textarea value={form.findings_section} onChange={set('findings_section')} maxLength={3000} className="min-h-[100px]"/>
        </Field>
        <Field label="Conclusion"><Textarea value={form.conclusion} onChange={set('conclusion')} maxLength={1000}/></Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
