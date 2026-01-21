import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable' // <--- IMPORTACIÓN CORREGIDA

export const generateEvaluationReport = (docenteName, evaluacion, resultados, usuarios) => {
  const doc = new jsPDF()
  const fecha = new Date().toLocaleDateString()

  // --- COLORES CORPORATIVOS ---
  const colorPrimario = [130, 66, 131] // Morado (#824283)
  const colorTexto = [60, 60, 60]

  // --- ENCABEZADO ---
  doc.setFillColor(...colorPrimario)
  doc.rect(0, 0, 210, 40, 'F') 

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text("Colegio San Juan Bautista", 14, 20)
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text("Reporte de Evaluación", 14, 30)

  // --- DETALLES DE LA EVALUACIÓN ---
  doc.setTextColor(...colorTexto)
  doc.setFontSize(10)
  
  // Izquierda
  doc.setFont('helvetica', 'bold')
  doc.text("Evaluación:", 14, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(evaluacion.titulo, 35, 50)

  doc.setFont('helvetica', 'bold')
  doc.text("Docente:", 14, 55)
  doc.setFont('helvetica', 'normal')
  doc.text(docenteName, 35, 55)

  // Derecha
  doc.setFont('helvetica', 'bold')
  doc.text("Fecha Emisión:", 140, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(fecha, 170, 50)

  doc.setFont('helvetica', 'bold')
  doc.text("Grado ID:", 140, 55)
  doc.setFont('helvetica', 'normal')
  doc.text(String(evaluacion.id_grado), 170, 55)

  doc.setDrawColor(200)
  doc.line(14, 60, 196, 60)

  // --- PROCESAMIENTO DE DATOS ---
  const tableRows = []
  
  // 1. Filtrar resultados SOLO para esta evaluación específica
  const notasDeEstaEvaluacion = resultados.filter(r => 
    r.id_evaluacion === evaluacion.id || r.id_evaluacion === evaluacion.id_evaluacion
  )

  // 2. Mapear datos
  notasDeEstaEvaluacion.forEach(res => {
    const estudiante = usuarios.find(u => u.id === res.id_estudiante || u.id_usuario === res.id_estudiante)

    tableRows.push([
      estudiante?.cedula || 'S/C',
      estudiante ? `${estudiante.apellido}, ${estudiante.nombre}` : 'Usuario Eliminado',
      new Date(res.fecha_completado).toLocaleDateString(),
      res.nota_final >= 10 ? 'Aprobado' : 'Reprobado', 
      `${res.nota_final} / 20`
    ])
  })

  // 3. Ordenar por Apellido
  tableRows.sort((a, b) => a[1].localeCompare(b[1]))

  if (tableRows.length === 0) {
    doc.setFontSize(12)
    doc.setTextColor(200, 0, 0)
    doc.text("No hay estudiantes que hayan presentado esta evaluación aún.", 14, 70)
    doc.save(`Reporte_Vacio_${evaluacion.titulo}.pdf`)
    return
  }

  // --- GENERACIÓN DE TABLA ---
  // USO CORRECTO DE AUTOTABLE (Función importada)
  autoTable(doc, {
    startY: 65,
    head: [['Cédula', 'Estudiante', 'Fecha Entrega', 'Estado', 'Nota']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: colorPrimario,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center' }, 
      1: { cellWidth: 80 }, 
      2: { halign: 'center' },
      3: { fontStyle: 'bold', halign: 'center' }, 
      4: { halign: 'center', fontStyle: 'bold' }  
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'Reprobado') {
          data.cell.styles.textColor = [220, 53, 69] 
        } else {
          data.cell.styles.textColor = [25, 135, 84] 
        }
      }
    }
  })

  // --- PIE DE PÁGINA ---
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' })
    doc.text("Plataforma Educativa CSJB", 14, 285)
  }

  doc.save(`Notas_${evaluacion.titulo.replace(/\s+/g, '_')}.pdf`)
}