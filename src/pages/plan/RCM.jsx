import { useEffect, useState } from 'react'
import { Plus, Shield, Download } from 'lucide-react'
import { getRCM, upsertRCM, deleteRCM } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { DOMAINS, CONTROL_TYPES, ASSERTIONS, RISK_RATINGS, FREQUENCIES } from '../../constants'
import PageHeader from '../../components/PageHeader'
import RecordTable from '../../components/RecordTable'
import Modal from '../../components/Modal'
import { Field, Input, Select, Textarea } from '../../components/FormField'

// Base RCM controls seeded from SOX reference site KB
const BASE_CONTROLS = [
  {control_id:'LA-01',domain:'LA',control_title:'User provisioning',risk:'Unauthorized access granted',risk_rating:'High',control_type:'Preventive',frequency:'Per event',assertion:['Authorization'],evidence_req:'Access request + approver sign-off',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'LA-02',domain:'LA',control_title:'Periodic access review',risk:'Inappropriate access retained',risk_rating:'High',control_type:'Detective',frequency:'quarterly',assertion:['Existence'],evidence_req:'Certified access review report + IPE validation',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'LA-03',domain:'LA',control_title:'User deprovisioning',risk:'Terminated users retain access',risk_rating:'High',control_type:'Preventive',frequency:'Per event',assertion:['Authorization'],evidence_req:'HR termination list vs system user list — within SLA',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'LA-04',domain:'LA',control_title:'Privileged access controls',risk:'Unrestricted system access',risk_rating:'High',control_type:'Preventive',frequency:'quarterly',assertion:['Authorization'],evidence_req:'Privileged account list + justification + MFA config',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'LA-05',domain:'LA',control_title:'SoD enforcement',risk:'Single user can execute and conceal fraud',risk_rating:'High',control_type:'Preventive',frequency:'quarterly',assertion:['Authorization'],evidence_req:'SoD conflict matrix + mitigation evidence',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CM-01',domain:'CM',control_title:'Change authorization',risk:'Unauthorized changes to production',risk_rating:'High',control_type:'Preventive',frequency:'Per event',assertion:['Authorization'],evidence_req:'Change ticket with pre-deployment approval timestamp',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CM-02',domain:'CM',control_title:'UAT sign-off',risk:'Untested changes affect financial data',risk_rating:'High',control_type:'Preventive',frequency:'Per event',assertion:['Accuracy'],evidence_req:'Business user UAT sign-off dated before go-live',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CM-03',domain:'CM',control_title:'Emergency change controls',risk:'CM bypass via emergency classification',risk_rating:'High',control_type:'Detective',frequency:'monthly',assertion:['Authorization'],evidence_req:'Emergency change rate report + retrospective approvals',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CM-04',domain:'CM',control_title:'Dev/prod separation',risk:'Developer deploys unauthorized code',risk_rating:'High',control_type:'Preventive',frequency:'quarterly',assertion:['Authorization'],evidence_req:'Developer list vs prod access list — zero overlap',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CO-01',domain:'CO',control_title:'Batch job monitoring',risk:'Failed jobs produce incomplete financial data',risk_rating:'High',control_type:'Detective',frequency:'daily',assertion:['Completeness'],evidence_req:'Job execution logs + incident tickets for failures',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CO-02',domain:'CO',control_title:'Backup controls',risk:'Data loss / inability to recover',risk_rating:'High',control_type:'Detective',frequency:'daily',assertion:['Completeness'],evidence_req:'Backup job logs + annual restore test results',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'CO-03',domain:'CO',control_title:'DR plan testing',risk:'Business continuity failure',risk_rating:'Medium',control_type:'Detective',frequency:'annual',assertion:['Completeness'],evidence_req:'DR test results with RTO/RPO validation + sign-off',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'PD-01',domain:'PD',control_title:'SDLC phase gate approvals',risk:'Inadequate system design deployed',risk_rating:'High',control_type:'Preventive',frequency:'Per project',assertion:['Authorization'],evidence_req:'Phase gate sign-offs with named approver and date',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'PD-02',domain:'PD',control_title:'Data migration reconciliation',risk:'Incomplete/inaccurate data migrated',risk_rating:'High',control_type:'Detective',frequency:'Per project',assertion:['Completeness','Accuracy'],evidence_req:'Pre/post count reconciliation + balance agreement + business sign-off',pcaob_ref:'AS 2201 Para .36, AS 2110.29'},
  {control_id:'JE-01',domain:'JE',control_title:'JE population IPE validation',risk:'Incomplete JE population tested',risk_rating:'High',control_type:'Detective',frequency:'Per period',assertion:['Completeness'],evidence_req:'JE extract reconciled to trial balance + parameter doc',pcaob_ref:'AS 2110.61, AS 2201 Para .14'},
  {control_id:'JE-02',domain:'JE',control_title:'After-hours JE review',risk:'Fraudulent JEs posted outside business hours',risk_rating:'High',control_type:'Detective',frequency:'Per period',assertion:['Authorization'],evidence_req:'After-hours JE sample with supporting docs + approver ≠ preparer',pcaob_ref:'AS 2110.61, AS 2201 Para .14'},
]

const BLANK = { control_id:'', domain:'LA', control_title:'', risk:'', risk_rating:'High', control_type:'Preventive', frequency:'monthly', assertion:[], evidence_req:'', owner_role:'', pcaob_ref:'', is_key_control:true }

export default function RCM() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast }  = useToast()
  const [rows, setRows]   = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(BLANK)
  const [filter, setFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = () => getRCM(programmeId).then(d=>setRows(d||[]))
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const open = (r=BLANK) => { setForm({...BLANK,...r,assertion:r.assertion??[]}); setModal(true) }

  const save = async () => {
    if (!form.control_id||!form.control_title) { toast({type:'warning',title:'Control ID and title required'}); return }
    setSaving(true)
    await upsertRCM({...form, programme_id:programmeId})
    toast({type:'success',title:'Control saved'}); setModal(false); load()
    setSaving(false)
  }

  const seedBase = async () => {
    if (!confirm('Seed 16 base controls from SOX reference? Existing controls with same IDs will be updated.')) return
    setSeeding(true)
    await Promise.all(BASE_CONTROLS.map(c=>upsertRCM({...c,programme_id:programmeId,status:'Not Tested'})))
    toast({type:'success',title:'Base controls seeded'}); load()
    setSeeding(false)
  }

  const visible = filter==='ALL' ? rows : rows.filter(r=>r.domain===filter)

  const cols = [
    {key:'control_id',label:'ID',render:r=><span className="mono">{r.control_id}</span>},
    {key:'domain',label:'Domain',render:r=><span className={`badge badge-${r.domain==='LA'?'blue':r.domain==='CM'?'green':r.domain==='CO'?'amber':r.domain==='PD'?'purple':'red'}`}>{r.domain}</span>},
    {key:'control_title',label:'Control'},
    {key:'risk_rating',label:'Risk',render:r=><span className={`badge ${r.risk_rating==='High'?'badge-red':r.risk_rating==='Medium'?'badge-amber':'badge-green'}`}>{r.risk_rating}</span>},
    {key:'control_type',label:'Type',render:r=><span className="text-xs text-gray-500">{r.control_type}</span>},
    {key:'frequency',label:'Freq',render:r=><span className="text-xs text-gray-500">{r.frequency}</span>},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status==='Effective'?'badge-green':r.status==='Not Tested'?'badge-gray':'badge-amber'}`}>{r.status||'Not Tested'}</span>},
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader eyebrow={<><Shield size={12}/>Plan · RCM</>} title="Risk & Control Matrix"
        subtitle={`${rows.length} controls · PCAOB AS 2201 Para .26–.29`}
        actions={isAuditor&&<div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={seedBase} disabled={seeding}>Seed base controls</button>
          <button className="btn btn-primary" onClick={()=>open()}><Plus size={15}/>Add control</button>
        </div>} />

      <div className="flex gap-1 mb-4 flex-wrap">
        {['ALL',...DOMAINS.map(d=>d.id)].map(d=>(
          <button key={d} onClick={()=>setFilter(d)} className={`btn btn-sm ${filter===d?'btn-primary':'btn-outline'}`}>{d}</button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <RecordTable cols={cols} rows={visible} onEdit={isAuditor?open:null} onDelete={isAuditor?id=>deleteRCM(id).then(load):null} emptyMsg="No controls yet. Seed base controls or add manually."/>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={form.id?'Edit control':'New control'} size="max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Control ID"><Input placeholder="LA-01" value={form.control_id} onChange={set('control_id')} maxLength={20}/></Field>
          <Field label="Domain"><Select value={form.domain} onChange={set('domain')} options={DOMAINS.map(d=>({value:d.id,label:d.label}))}/></Field>
        </div>
        <Field label="Control title"><Input placeholder="Periodic access review" value={form.control_title} onChange={set('control_title')} maxLength={120}/></Field>
        <Field label="Risk / objective"><Textarea value={form.risk} onChange={set('risk')} maxLength={300}/></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Risk rating"><Select value={form.risk_rating} onChange={set('risk_rating')} options={RISK_RATINGS}/></Field>
          <Field label="Control type"><Select value={form.control_type} onChange={set('control_type')} options={CONTROL_TYPES}/></Field>
          <Field label="Frequency"><Select value={form.frequency} onChange={set('frequency')} options={FREQUENCIES}/></Field>
        </div>
        <Field label="Evidence required"><Textarea value={form.evidence_req} onChange={set('evidence_req')} maxLength={300}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner role"><Input placeholder="IT Security / Finance" value={form.owner_role} onChange={set('owner_role')} maxLength={60}/></Field>
          <Field label="PCAOB ref"><Input placeholder="AS 2201 Para .26" value={form.pcaob_ref} onChange={set('pcaob_ref')} maxLength={40}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><Select value={form.status||'Not Tested'} onChange={set('status')} options={['Not Tested','In Progress','Effective','Ineffective','Not Applicable']}/></Field>
          <Field label="Key control"><Select value={form.is_key_control?'yes':'no'} onChange={e=>setForm(f=>({...f,is_key_control:e.target.value==='yes'}))} options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]}/></Field>
        </div>
        <Field label="Assertions">
          <div className="flex gap-3 flex-wrap mt-1">{ASSERTIONS.map(a=>(
            <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={form.assertion?.includes(a)} onChange={e=>setForm(f=>({...f,assertion:e.target.checked?[...(f.assertion||[]),a]:(f.assertion||[]).filter(x=>x!==a)}))}/>
              {a}
            </label>
          ))}</div>
        </Field>
        <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>Save</button></div>
      </Modal>
    </div>
  )
}
