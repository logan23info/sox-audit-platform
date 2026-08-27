import { BookOpen } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
const CROSSWALK = [
  {domain:'Logical Access',coso:'CC6.1–CC6.8',cobit:'DSS05.03–05.04',pcaob:'Para .26, .A5',iia:'Std. 2120',sec:'Rule 13a-15'},
  {domain:'Change Management',coso:'CC7.1–CC7.2',cobit:'BAI06.01–06.04',pcaob:'Para .28, .A8',iia:'Std. 2130',sec:'SEC FR-77'},
  {domain:'Computer Operations',coso:'CC7.3–CC7.5',cobit:'DSS01.01–01.05',pcaob:'Para .27, .A7',iia:'Std. 2100',sec:'Rule 15d-15'},
  {domain:'Program Development',coso:'CC8.1',cobit:'BAI02–BAI04',pcaob:'Para .29, .A9',iia:'Std. 2110',sec:'SEC FRR 48'},
  {domain:'AI / Automated controls',coso:'CC7.1, CC8.1',cobit:'BAI09, DSS05',pcaob:'Para .26–.29, AS 2110',iia:'GTAG AI',sec:'SEC AI Guidance 2025'},
]
export default function Frameworks() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><BookOpen size={12}/>Reference · Frameworks</>} title="Framework crosswalk"
        subtitle="ITGC domains mapped to COSO 2013, COBIT 2019, PCAOB AS 2201, IIA Standards, and SEC rules." />
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="data-table">
          <thead><tr><th>ITGC Domain</th><th>COSO 2013</th><th>COBIT 2019</th><th>PCAOB AS 2201</th><th>IIA Standards</th><th>SEC</th></tr></thead>
          <tbody>{CROSSWALK.map(r=>(
            <tr key={r.domain}>
              <td className="font-medium text-gray-900 dark:text-white">{r.domain}</td>
              <td><span className="mono">{r.coso}</span></td>
              <td><span className="mono">{r.cobit}</span></td>
              <td><span className="mono">{r.pcaob}</span></td>
              <td><span className="mono">{r.iia}</span></td>
              <td><span className="mono text-xs">{r.sec}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[{t:'PCAOB',u:'https://pcaobus.org'},{t:'COSO',u:'https://www.coso.org'},{t:'COBIT',u:'https://www.isaca.org/resources/cobit'},{t:'IIA',u:'https://www.theiia.org'},{t:'SEC',u:'https://www.sec.gov'},{t:'NIST CSF',u:'https://www.nist.gov/cyberframework'}].map(l=>(
          <a key={l.t} href={l.u} target="_blank" rel="noopener" className="card card-hover text-center py-4 text-brand-600 font-semibold">{l.t} ↗</a>
        ))}
      </div>
    </div>
  )
}
