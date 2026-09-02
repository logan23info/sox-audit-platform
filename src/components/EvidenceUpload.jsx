import { useEffect, useState, useRef } from 'react'
import { Paperclip, Upload, Trash2, ExternalLink, Loader } from 'lucide-react'
import { uploadEvidence, getEvidenceFiles, getEvidenceUrl, deleteEvidence } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function EvidenceUpload({ programmeId, recordId, label='Evidence files' }) {
  const { toast }   = useToast()
  const [files, setFiles]     = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const load = async () => {
    if (!programmeId || !recordId) return
    const f = await getEvidenceFiles(programmeId, recordId)
    setFiles(f)
  }
  useEffect(() => { load() }, [programmeId, recordId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX_MB = 10
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ type:'warning', title:`File too large — max ${MAX_MB}MB`, description:`${file.name} is ${(file.size/1024/1024).toFixed(1)}MB` })
      return
    }
    setUploading(true)
    const path = await uploadEvidence(file, programmeId, recordId)
    if (path) { toast({ type:'success', title:`${file.name} uploaded` }); load() }
    else toast({ type:'error', title:'Upload failed' })
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (name) => {
    if (!confirm(`Delete ${name}?`)) return
    const path = `${programmeId}/${recordId}/${name}`
    const ok = await deleteEvidence(path)
    if (ok) { toast({ type:'success', title:'Deleted' }); load() }
  }

  const openFile = async (name) => {
    const path = `${programmeId}/${recordId}/${name}`
    const url = await getEvidenceUrl(path)
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label flex items-center gap-1.5"><Paperclip size={12}/>{label}</span>
        <button className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader size={12} className="animate-spin"/>Uploading…</> : <><Upload size={12}/>Attach file</>}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg,.docx,.txt"/>
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-surface-3 text-sm">
              <span className="truncate text-gray-700 dark:text-gray-300 text-xs">{f.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openFile(f.name)} className="btn btn-ghost btn-sm p-1"><ExternalLink size={12}/></button>
                <button onClick={() => handleDelete(f.name)} className="btn btn-ghost btn-sm p-1 text-red-400"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {files.length === 0 && <p className="text-xs text-gray-400">No files attached. Supported: PDF, XLSX, CSV, PNG, JPG, DOCX (max 10MB)</p>}
    </div>
  )
}
