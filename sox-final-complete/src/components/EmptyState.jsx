export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-gray-300 dark:text-gray-600 mb-4" />}
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
