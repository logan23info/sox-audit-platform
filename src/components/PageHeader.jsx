export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="section-title text-2xl">{title}</h1>
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
