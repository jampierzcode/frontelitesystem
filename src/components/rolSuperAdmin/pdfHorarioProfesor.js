import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ORDEN_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function generarPdfHorarioProfesor(profesor, clases) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const nombreCompleto = `${profesor.person?.nombre || ""} ${
    profesor.person?.apellido || ""
  }`.trim();

  // Encabezado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Horario Semanal", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Profesor: ${nombreCompleto}`, 14, 28);

  let y = 34;
  if (profesor.carrera) {
    doc.text(`Carrera/Especialidad: ${profesor.carrera}`, 14, y);
    y += 6;
  }
  if (profesor.person?.sede?.name_referential) {
    doc.text(`Sede: ${profesor.person.sede.name_referential}`, 14, y);
    y += 6;
  }
  if (profesor.person?.dni) {
    doc.text(`DNI: ${profesor.person.dni}`, 14, y);
    y += 6;
  }
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generado: ${new Date().toLocaleString("es-PE")}`,
    pageWidth - 14,
    y,
    { align: "right" }
  );
  doc.setTextColor(0);

  // Ordenar clases: día (orden semana) → hora_inicio
  const ordenadas = [...clases].sort((a, b) => {
    const da = ORDEN_DIAS.indexOf(a.dia);
    const db = ORDEN_DIAS.indexOf(b.dia);
    if (da !== db) return da - db;
    return (a.horaInicio || "").localeCompare(b.horaInicio || "");
  });

  const body = ordenadas.map((c) => [
    c.dia,
    `${(c.horaInicio || "").slice(0, 5)} - ${(c.horaFin || "").slice(0, 5)}`,
    c.curso?.nombre || "-",
    c.ciclo?.nombre || "—",
    c.activo ? "Sí" : "No",
  ]);

  autoTable(doc, {
    head: [["Día", "Hora", "Curso", "Ciclo", "Activo"]],
    body,
    startY: y + 6,
    theme: "grid",
    headStyles: {
      fillColor: [10, 48, 188], // primary del proyecto
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Resalta filas inactivas
      if (data.section === "body") {
        const row = ordenadas[data.row.index];
        if (row && !row.activo) {
          data.cell.styles.textColor = [150, 150, 150];
        }
      }
    },
  });

  const fileName = `horario_${(nombreCompleto || "profesor")
    .toLowerCase()
    .replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
