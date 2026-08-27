import { Pencil, Trash2 } from 'lucide-react'
export default function RecordTable({ cols, rows, onEdit, onDelete, emptyMsg='No records yet.' }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 py-8 text-center">{emptyMsg}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="data-table">
        <thead><tr>{cols.map(c=><th key={c.key}>{c.label}</th>)}{(onEdit||onDelete)&&<th></th>}</tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={r.id??i}>
            {cols.map(c=><td key={c.key}>{c.render?c.render(r):r[c.key]??'—'}</td>)}
            {(onEdit||onDelete)&&<td className="w-16"><div className="flex gap-1">
              {onEdit&&<button onClick={()=>onEdit(r)} className="btn btn-ghost btn-sm p-1"><Pencil size={13}/></button>}
              {onDelete&&<button onClick={()=>onDelete(r.id)} className="btn btn-ghost btn-sm p-1 text-red-400"><Trash2 size={13}/></button>}
            </div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
