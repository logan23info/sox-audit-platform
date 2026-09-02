import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportXLSX = ({ sheets, filename }) => {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export const exportPDF = ({ title, subtitle, sections, filename }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 15
  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text(title, 14, y); y += 7
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100)
  doc.text(subtitle || `Generated: ${new Date().toLocaleDateString()}`, 14, y); y += 8
  doc.setDrawColor(79, 110, 247).setLineWidth(0.5).line(14, y, pageW - 14, y); y += 6
  sections.forEach(({ heading, columns, rows, text }) => {
    if (y > 170) { doc.addPage(); y = 15 }
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(30)
    doc.text(heading, 14, y); y += 5
    if (text) {
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(60)
      const lines = doc.splitTextToSize(text, pageW - 28)
      doc.text(lines, 14, y); y += lines.length * 4 + 4
    }
    if (columns && rows?.length) {
      autoTable(doc, { startY: y, head: [columns], body: rows, theme: 'striped', headStyles: { fillColor: [79, 110, 247], fontSize: 8 }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      y = doc.lastAutoTable.finalY + 8
    }
  })
  doc.save(`${filename}.pdf`)
}
