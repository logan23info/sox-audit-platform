import { Layers, Plus, Loader } from 'lucide-react'
import { useState } from 'react'
import { SECTORS } from '../../constants'
import { promoteSectorVariantToRCM } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
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
  const { programmeId, programme, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [sector, setSector] = useState(programme?.sector && programme.sector !== 'general' ? programme.sector : 'financial_services')
  const [adding, setAdding] = useState(null)

  const addToRCM = async (row, idx) => {
    if (!programmeId) { toast({type:'warning',title:'Select an engagement first'}); return }
    setAdding(idx)
    const created = await promoteSectorVariantToRCM({
      control_id:  `${sector.slice(0,3).toUpperCase()}-${String(idx+1).padStart(2,'0')}`,
      domain:      'LA',
      additional_req: row.control,
      standard_basis: row.basis,
      sector,
    }, programmeId)
    if (created) toast({type:'success',title:'Added to RCM',description:`${row.control.slice(0,50)} — review domain and frequency in the RCM.`})
    setAdding(null)
  }
  const detail = SECTOR_DETAIL[sector]||[]
  const meta = SECTORS.find(s=>s.id===sector)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><Layers size={12}/>Reference · Sector controls</>} title="Sector-specific control requirements"
        subtitle="Additional ITGC controls required by sector-specific regulations. Add any that apply directly to your RCM." />
      <div className="flex gap-2 flex-wrap mb-5">
        {SECTORS.filter(s=>s.id!=='general').map(s=><button key={s.id} onClick={()=>setSector(s.id)} className={`btn btn-sm ${sector===s.id?'btn-primary':'btn-outline'}`}>{s.label}</button>)}
      </div>
      {meta&&<div className="flex gap-2 flex-wrap mb-4">{meta.standards.map(s=><span key={s} className="badge badge-blue">{s}</span>)}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="data-table">
          <thead><tr><th>Additional control requirement</th><th>Standard basis</th>{isAuditor&&<th></th>}</tr></thead>
          <tbody>{detail.map((r,i)=>(
            <tr key={i}>
              <td className="text-gray-900 dark:text-white">{r.control}</td>
              <td><span className="mono text-xs">{r.basis}</span></td>
              {isAuditor&&<td className="w-28">
                <button className="btn btn-outline btn-sm" onClick={()=>addToRCM(r,i)} disabled={adding===i}>
                  {adding===i?<Loader size={12} className="animate-spin"/>:<Plus size={12}/>}Add to RCM
                </button>
              </td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
