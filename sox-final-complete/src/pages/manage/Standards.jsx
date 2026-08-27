import { useEffect, useState } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { getStandardsAck, upsertStandardsAck } from '../../lib/supabase'
import { useProgramme } from '../../context/ProgrammeContext'
import { useToast } from '../../context/ToastContext'
import { PCAOB_STANDARDS } from '../../constants'
import PageHeader from '../../components/PageHeader'

export default function Standards() {
  const { programmeId, isAuditor } = useProgramme()
  const { toast } = useToast()
  const [acks, setAcks] = useState({})

  const load = () => getStandardsAck(programmeId).then(d=>{
    const map={}; (d||[]).forEach(a=>{ map[a.standard_id]=a }); setAcks(map)
  })
  useEffect(()=>{ if(programmeId) load() },[programmeId])

  const toggle = async (std) => {
    if (!isAuditor) return
    const current = acks[std.id]
    await upsertStandardsAck({ programme_id:programmeId, standard_id:std.id, acknowledged:!current?.acknowledged, ack_date:!current?.acknowledged?new Date().toISOString().slice(0,10):null })
    toast({type:'success',title:!current?.acknowledged?'Acknowledged':'Unacknowledged'})
    load()
  }

  const statusColor = s => s==='active'?'badge-green':s==='upcoming'?'badge-blue':s==='critical'?'badge-red':'badge-gray'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader eyebrow={<><BookOpen size={12}/>Manage · Standards</>} title="PCAOB standards tracker"
        subtitle="2024–2026 standards affecting ITGC and ICFR audits. Acknowledge each per engagement." />
      <div className="space-y-3">
        {PCAOB_STANDARDS.map(std => {
          const ack = acks[std.id]
          return (
            <div key={std.id} className={`card flex items-start gap-4 ${ack?.acknowledged?'border-green-200 dark:border-green-900':''}`}>
              <button onClick={()=>toggle(std)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${ack?.acknowledged?'bg-green-500 border-green-500 text-white':'border-gray-300 dark:border-gray-600 hover:border-brand-500'}`}>
                {ack?.acknowledged&&<Check size={12}/>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{std.title}</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`badge ${statusColor(std.status)}`}>{std.status}</span>
                    {ack?.acknowledged&&<span className="badge badge-green">✓ Ack {ack.ack_date}</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{std.note}</p>
                <p className="text-xs text-gray-400 mt-0.5">Effective: {std.effective}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
