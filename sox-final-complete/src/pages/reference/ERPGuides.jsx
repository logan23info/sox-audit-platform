import { Database } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
const ERP = {
  SAP: [
    {evidence:'User list with roles/profiles',source:'SUIM → Users by Role'},
    {evidence:'User last login dates',source:'SM04 / AL08 / SUIM'},
    {evidence:'Role authorizations',source:'PFCG → Role Maintenance'},
    {evidence:'SoD conflict report',source:'GRC → Access Risk Analysis'},
    {evidence:'SAP_ALL assignments',source:'SUIM → Users with Critical Auth'},
    {evidence:'Security audit log',source:'SM20 / SM19'},
    {evidence:'Transport request log (Dev→QAS→Prod)',source:'SE01 / SE09 / SE10'},
    {evidence:'Transport approval',source:'CHARM (SAP Solution Manager)'},
  ],
  Oracle: [
    {evidence:'User responsibilities',source:'FND_USER_RESP_GROUPS / Security Console'},
    {evidence:'Last login date',source:'FND_LOGINS / OAM Dashboard'},
    {evidence:'SoD conflicts',source:'Oracle GRC module reports'},
    {evidence:'Patch log',source:'AD_APPLIED_PATCHES (EBS) / Update Manager (Fusion)'},
    {evidence:'User roles (Fusion)',source:'Security Console → Manage Users → BICC extract'},
    {evidence:'Sign-in audit (Fusion)',source:'Tools → Audit Reports → User Sign-in'},
  ],
  NetSuite: [
    {evidence:'User list with roles',source:'Setup → Users/Roles → Manage Users → export CSV'},
    {evidence:'Role permissions',source:'Setup → Users/Roles → Manage Roles → Permissions tab'},
    {evidence:'Login audit trail',source:'Setup → Audit Trail → User Login Audit'},
    {evidence:'Change audit trail',source:'Setup → Audit Trail → System Notes'},
    {evidence:'SuiteScript changes',source:'Customization → SuiteScript → deployed scripts + modified dates'},
    {evidence:'User last login',source:'User record → Last Login field / SuiteAnalytics'},
  ],
}
export default function ERPGuides() {
  const [erp, setErp] = useState('SAP')
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Database size={12}/>Reference · ERP Guides</>} title="ERP-specific evidence sources"
        subtitle="Where to find ITGC evidence in SAP, Oracle EBS/Fusion, and NetSuite." />
      <div className="flex gap-2 mb-5">{Object.keys(ERP).map(e=><button key={e} onClick={()=>setErp(e)} className={`btn btn-sm ${erp===e?'btn-primary':'btn-outline'}`}>{e}</button>)}</div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="data-table">
          <thead><tr><th>Evidence needed</th><th>Where to get it</th></tr></thead>
          <tbody>{ERP[erp].map((r,i)=>(
            <tr key={i}><td className="text-gray-900 dark:text-white font-medium">{r.evidence}</td><td><span className="mono text-xs">{r.source}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
