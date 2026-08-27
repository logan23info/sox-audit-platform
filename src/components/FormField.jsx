export function Field({ label, children, hint }) {
  return <div className="mb-4"><label className="label">{label}</label>{children}{hint&&<p className="text-xs text-gray-400 mt-1">{hint}</p>}</div>
}
export function Input({ ...p }) { return <input className="input" {...p}/> }
export function Select({ options, ...p }) {
  return <select className="select" {...p}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
}
export function Textarea({ ...p }) { return <textarea className="input min-h-[80px] resize-y" {...p}/> }
