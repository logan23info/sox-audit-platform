import { X } from 'lucide-react'
import { useEffect } from 'react'
export default function Modal({ open, onClose, title, children, size='max-w-lg' }) {
  useEffect(()=>{ const h=(e)=>e.key==='Escape'&&onClose(); window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h) },[onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full ${size} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
