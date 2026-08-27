import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext({})
export const useToast = () => useContext(ToastContext)

const ICONS = { success: CheckCircle, warning: AlertTriangle, error: XCircle, info: Info }
const STYLES = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  error:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  info:    'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ title, description, type = 'info', duration = 4000 }) => {
    const id = Date.now()
    setToasts(t => [...t, { id, title, description, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-lg text-sm ${STYLES[t.type]}`}>
              <Icon size={16} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {t.title && <div className="font-semibold">{t.title}</div>}
                {t.description && <div className="opacity-80 mt-0.5">{t.description}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
