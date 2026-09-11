import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Loader } from 'lucide-react'
import Modal from './Modal'
import { useToast } from '../context/ToastContext'

// Flexible header matching — case and spacing insensitive
const norm = s => String(s||'').toLowerCase().replace(/[\s_\-\.]/g,'')

const FIELD_ALIASES = {
  control_id:    ['controlid','controlref','ref','reference','id','controlnumber','ctrlid'],
  domain:        ['domain','category','itgcdomain','area','controlarea','section'],
  control_title: ['controltitle','title','control','controlname','controldescription','description','requirement'],
  objective:     ['objective','controlobjective','purpose'],
  risk:          ['risk','riskdescription','riskstatement'],
  risk_rating:   ['riskrating','rating','risklevel','severity'],
  control_type:  ['controltype','type','preventivedetective'],
  frequency:     ['frequency','freq','controlfrequency'],
  owner_role:    ['ownerrole','owner','controlowner','responsible'],
  evidence_req:  ['evidencereq','evidence','evidencerequired','testevidence'],
  status:        ['status','teststatus','conclusion','compliance'],
  pcaob_ref:     ['pcaobref','standard','standardref','reference2','pcaob'],
}

const DOMAIN_MAP = {
  la:'LA', logicalaccess:'LA', access:'LA', 'a':'LA',
  cm:'CM', changemanagement:'CM', change:'CM',
  co:'CO', computeroperations:'CO', operations:'CO', ops:'CO',
  pd:'PD', programdevelopment:'PD', development:'PD', sdlc:'PD',
  je:'JE', journalentry:'JE', journalentries:'JE',
}

const STATUS_MAP = {
  effective:'Effective', fullycompliant:'Effective', pass:'Effective', compliant:'Effective',
  ineffective:'Ineffective', notcompliant:'Ineffective', fail:'Ineffective', failed:'Ineffective',
  inprogress:'In Progress', partiallycompliant:'In Progress', partial:'In Progress',
  nottested:'Not Tested', notassessed:'Not Tested', pending:'Not Tested',
  notapplicable:'Not Applicable', na:'Not Applicable',
}

const RATING_MAP = { high:'High', medium:'Medium', med:'Medium', low:'Low', critical:'High' }
const TYPE_MAP   = { preventive:'Preventive', preventative:'Preventive', detective:'Detective', corrective:'Corrective' }
const FREQ_MAP   = { daily:'daily', weekly:'weekly', monthly:'monthly', quarterly:'quarterly', annual:'annual', annually:'annual', yearly:'annual', perevent:'daily', adhoc:'monthly' }

const mapValue = (val, map, fallback) => map[norm(val)] || fallback

export default function ImportModal({ open, onClose, onImport, programmeId }) {
  const { toast } = useToast()
  const [parsing, setParsing]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [rows, setRows]         = useState([])
  const [log, setLog]           = useState([])
  const [fileName, setFileName] = useState('')
  const inputRef = useRef(null)

  const reset = () => { setRows([]); setLog([]); setFileName('') }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) { toast({type:'warning',title:'File too large — max 5MB'}); return }
    setParsing(true); setFileName(file.name); setLog([])
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf, { type:'array' })
      // Auto-detect sheet — prefer one named like "RCM"/"Controls"/"Requirements"
      const preferred = wb.SheetNames.find(n=>/rcm|control|requirement|matrix/i.test(n)) || wb.SheetNames[0]
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[preferred], { defval:'' })
      if (!raw.length) { setLog([{type:'error',msg:'No data rows found in the sheet.'}]); setParsing(false); return }

      // Build header map
      const headers = Object.keys(raw[0])
      const headerMap = {}
      Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
        const match = headers.find(h => aliases.includes(norm(h)))
        if (match) headerMap[field] = match
      })

      const newLog = [{ type:'info', msg:`Sheet "${preferred}" — ${raw.length} rows, ${headers.length} columns detected.` }]
      const mappedFields = Object.keys(headerMap)
      newLog.push({ type:'info', msg:`Mapped fields: ${mappedFields.join(', ') || 'none'}` })

      if (!headerMap.control_title && !headerMap.control_id) {
        newLog.push({ type:'error', msg:'Could not find a control ID or control title column. Check your headers.' })
        setLog(newLog); setParsing(false); return
      }

      const seen = new Set()
      const parsed = []
      raw.forEach((r,i) => {
        const get = f => headerMap[f] ? String(r[headerMap[f]]||'').trim() : ''
        const control_id    = get('control_id')
        const control_title = get('control_title')
        if (!control_id && !control_title) return   // skip blank rows silently
        if (!control_title) { newLog.push({type:'warn',msg:`Row ${i+2}: no control title — skipped.`}); return }
        const key = control_id || control_title
        if (seen.has(norm(key))) { newLog.push({type:'warn',msg:`Row ${i+2}: duplicate "${key}" — skipped.`}); return }
        seen.add(norm(key))

        const rawDomain = get('domain')
        const domain = mapValue(rawDomain, DOMAIN_MAP, null)
        if (rawDomain && !domain) newLog.push({type:'warn',msg:`Row ${i+2}: domain "${rawDomain}" not recognised — defaulted to LA.`})

        parsed.push({
          control_id:    control_id || `IMP-${String(parsed.length+1).padStart(3,'0')}`,
          domain:        domain || 'LA',
          control_title: control_title.slice(0,120),
          objective:     get('objective').slice(0,300) || null,
          risk:          get('risk').slice(0,300) || null,
          risk_rating:   mapValue(get('risk_rating'), RATING_MAP, 'Medium'),
          control_type:  mapValue(get('control_type'), TYPE_MAP, 'Preventive'),
          frequency:     mapValue(get('frequency'), FREQ_MAP, 'monthly'),
          owner_role:    get('owner_role').slice(0,60) || null,
          evidence_req:  get('evidence_req').slice(0,300) || null,
          status:        mapValue(get('status'), STATUS_MAP, 'Not Tested'),
          pcaob_ref:     get('pcaob_ref').slice(0,40) || null,
          is_key_control:true,
        })
      })

      newLog.push({ type: parsed.length?'success':'error', msg:`${parsed.length} control(s) ready to import.` })
      setRows(parsed); setLog(newLog)
    } catch(err) {
      setLog([{type:'error',msg:`Parse failed: ${err.message}`}])
    }
    setParsing(false)
    e.target.value = ''
  }

  const doImport = async () => {
    if (!rows.length) return
    setImporting(true)
    try {
      // Batch in chunks of 25 to avoid rate limits
      const chunks = []
      for (let i=0;i<rows.length;i+=25) chunks.push(rows.slice(i,i+25))
      let ok = 0
      for (const chunk of chunks) {
        const results = await Promise.all(chunk.map(r => onImport({ ...r, programme_id: programmeId })))
        ok += results.filter(Boolean).length
      }
      toast({ type:'success', title:`${ok} control(s) imported`, description: ok<rows.length ? `${rows.length-ok} skipped (duplicates or errors)` : undefined })
      reset(); onClose(true)
    } catch(e) {
      toast({ type:'error', title:'Import failed', description:e.message })
    }
    setImporting(false)
  }

  const logIcon = t => t==='error'?<X size={12} className="text-red-500"/>
    : t==='warn'?<AlertTriangle size={12} className="text-amber-500"/>
    : t==='success'?<CheckCircle size={12} className="text-green-500"/>
    : <FileSpreadsheet size={12} className="text-blue-500"/>

  return (
    <Modal open={open} onClose={()=>{reset();onClose(false)}} title="Import RCM from spreadsheet" size="max-w-2xl">
      {!rows.length && (
        <>
          <div onClick={()=>inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-dark-surface-3 transition-all">
            {parsing ? <Loader size={32} className="mx-auto text-brand-600 animate-spin mb-3"/> : <Upload size={32} className="mx-auto text-gray-400 mb-3"/>}
            <div className="font-medium text-sm text-gray-700 dark:text-gray-300">{parsing?'Parsing…':'Drop your RCM spreadsheet here'}</div>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls or .csv — click to browse (max 5MB)</p>
          </div>
          <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFile}/>

          <div className="mt-5">
            <div className="label mb-2">Expected columns</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
              Headers are matched flexibly — case, spacing, and punctuation are ignored. The importer looks for:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                ['Control ID','required*'],['Control Title','required*'],
                ['Domain','LA / CM / CO / PD / JE'],['Risk Rating','High / Medium / Low'],
                ['Control Type','Preventive / Detective'],['Frequency','daily…annual'],
                ['Owner Role','optional'],['Evidence Required','optional'],
                ['Status','Effective / Not Tested…'],['PCAOB Ref','optional'],
              ].map(([f,h])=>(
                <div key={f} className="flex justify-between px-2 py-1 rounded bg-gray-50 dark:bg-dark-surface-3">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{f}</span>
                  <span className="text-gray-400">{h}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">* At least one of Control ID or Control Title is required. Missing IDs are auto-generated as IMP-001, IMP-002…</p>
          </div>
        </>
      )}

      {log.length>0 && (
        <div className="mt-4">
          <div className="label mb-2">Parse log — {fileName}</div>
          <div className="max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg bg-gray-50 dark:bg-dark-surface-3 border border-gray-200 dark:border-gray-700">
            {log.map((l,i)=>(
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex-shrink-0">{logIcon(l.type)}</span>
                <span className={l.type==='error'?'text-red-600':l.type==='warn'?'text-amber-600':'text-gray-600 dark:text-gray-400'}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length>0 && (
        <>
          <div className="mt-4">
            <div className="label mb-2">Preview — first 5 of {rows.length}</div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Domain</th><th>Control</th><th>Risk</th><th>Freq</th><th>Status</th></tr></thead>
                <tbody>{rows.slice(0,5).map((r,i)=>(
                  <tr key={i}>
                    <td className="mono text-xs">{r.control_id}</td>
                    <td><span className="badge badge-blue text-xs">{r.domain}</span></td>
                    <td className="text-xs max-w-xs truncate">{r.control_title}</td>
                    <td className="text-xs">{r.risk_rating}</td>
                    <td className="text-xs">{r.frequency}</td>
                    <td className="text-xs">{r.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="alert-warn mt-3"><span className="text-xs">Controls with a matching Control ID already in this engagement will be updated, not duplicated.</span></div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-outline" onClick={reset}>Choose another file</button>
            <button className="btn btn-primary" onClick={doImport} disabled={importing}>
              {importing?<><Loader size={14} className="animate-spin"/>Importing…</>:`Import ${rows.length} control(s)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
