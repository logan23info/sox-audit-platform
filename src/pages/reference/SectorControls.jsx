import { Layers } from 'lucide-react'
import { useState } from 'react'
import { SECTORS } from '../../constants'
import PageHeader from '../../components/PageHeader'
const SECTOR_DETAIL = {
  financial_services: [{control:'Trade surveillance logs',basis:'FFIEC'},{control:'Algo trading change controls',basis:'OCC'},{control:'Reg reporting system ITGC',basis:'FDIC / Fed'}],
  pharma: [{control:'21 CFR Part 11 electronic records',basis:'FDA'},{control:'Audit trail for GxP systems',basis:'FDA'},{control:'System validation documentation (IQ/OQ/PQ)',basis:'FDA'}],
  manufacturing: [{control:'Production system SoD (MRP vs quality)',basis:'IATF 16949'},{control:'Engineering change controls',basis:'IATF'},{control:'Supplier portal access controls',basis:'VDA'}],
  tech_saas: [{control:'Multi-tenant data isolation controls',basis:'SOC 2 CC6.1'},{control:'API key governance',basis:'ISO 27001 A.8.24'},{control:'Feature flag change management',basis:'SOC 2 CC8.1'}],
  healthcare: [{control:'ePHI access controls',basis:'HIPAA §164.312'},{control:'Audit logs for PHI access',basis:'HIPAA'},{control:'Business associate agreement controls',basis:'HITECH'}],
  retail: [{control:'PCI DSS cardholder data system ITGC',basis:'PCI DSS v4.0'},{control:'POS system change controls',basis:'PCI DSS'},{control:'Revenue system IPE validation',basis:'AS 1105.10A'}],
  energy: [{control:'NERC CIP cyber asset identification',basis:'NERC CIP-002'},{control:'Electronic security perimeter access',basis:'NERC CIP-005'},{control:'System security management',basis:'NERC CIP-007'}],
  general: [{control:'Standard ITGC — see RCM',basis:'AS 2201'}],
}
export default function SectorControls() {
  const [sector, setSector] = useState('financial_services')
  const detail = SECTOR_DETAIL[sector]||[]
  const meta = SECTORS.find(s=>s.id===sector)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Layers size={12}/>Reference · Sector controls</>} title="Sector-specific control requirements"
        subtitle="Additional ITGC controls required by sector-specific regulations. Overlay on base RCM." />
      <div className="flex gap-2 flex-wrap mb-5">
        {SECTORS.filter(s=>s.id!=='general').map(s=><button key={s.id} onClick={()=>setSector(s.id)} className={`btn btn-sm ${sector===s.id?'btn-primary':'btn-outline'}`}>{s.label}</button>)}
      </div>
      {meta&&<div className="flex gap-2 flex-wrap mb-4">{meta.standards.map(s=><span key={s} className="badge badge-blue">{s}</span>)}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="data-table">
          <thead><tr><th>Additional control requirement</th><th>Standard basis</th></tr></thead>
          <tbody>{detail.map((r,i)=><tr key={i}><td className="text-gray-900 dark:text-white">{r.control}</td><td><span className="mono text-xs">{r.basis}</span></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
