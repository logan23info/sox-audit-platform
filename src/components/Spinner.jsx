export default function Spinner({ full }) {
  if (full) return (
    <div className="flex items-center justify-center min-h-screen bg-surface-2 dark:bg-gray-950">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
}
