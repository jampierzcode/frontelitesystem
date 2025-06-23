import React, { useState } from "react";
import * as XLSX from "xlsx";

const SqlGenerator = () => {
  const [records, setRecords] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { raw: false });
      setRecords(data);
    };

    reader.readAsBinaryString(file);
  };

  const downloadSQL = (filename, content) => {
    const blob = new Blob([content], { type: "text/sql" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const generateScripts = () => {
    let script1 = "-- UPDATE recepcionado\n";
    let script2 = "-- SELECT solicitantes no encontrados\n";
    let script3 = "-- INSERT en almacen\n";
    let script4 = "-- UPDATE en almacen (fecha +2 días)\n";
    let script5 = "-- INSERT entregado\n";

    records.forEach((row) => {
      const { id_solicitante, fecha_despacho, fecha_reparto } = row;

      const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        const parsed = new Date(dateStr);
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} 09:30:00`;
      };

      const despachoFormatted = formatDateTime(fecha_despacho);
      const repartoFormatted = formatDateTime(fecha_reparto);

      // 1. UPDATE recepcionado
      script1 += `
UPDATE pedidos_status ps
JOIN pedidos p ON p.id = ps.pedido_id
SET ps.created_at = '${despachoFormatted}'
WHERE p.id_solicitante = '${id_solicitante}'
  AND ps.status = 'recepcionado';\n`;

      // 2. SELECT solicitantes no encontrados
      script2 += `
SELECT '${id_solicitante}' AS id_solicitante
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM pedidos p WHERE p.id_solicitante = '${id_solicitante}'
);\n`;

      // 3. INSERT en almacen si no existe
      script3 += `
INSERT INTO pedidos_status (pedido_id, status, created_at)
SELECT p.id, 'en almacen', '${fecha_despacho}'
FROM pedidos p
WHERE p.id_solicitante = '${id_solicitante}'
  AND NOT EXISTS (
    SELECT 1 FROM pedidos_status ps
    WHERE ps.pedido_id = p.id AND ps.status = 'en almacen'
);\n`;

      // 4. UPDATE en almacen con fecha + 2 días
      script4 += `
UPDATE pedidos_status ps
JOIN pedidos p ON p.id = ps.pedido_id
SET ps.created_at = DATE_ADD('${despachoFormatted}', INTERVAL 2 DAY)
WHERE p.id_solicitante = '${id_solicitante}'
  AND ps.status = 'en almacen';\n`;

      // 5. INSERT entregado si no existe
      script5 += `
INSERT INTO pedidos_status (pedido_id, status, created_at)
SELECT p.id, 'entregado', '${repartoFormatted}'
FROM pedidos p
WHERE p.id_solicitante = '${id_solicitante}'
  AND NOT EXISTS (
    SELECT 1 FROM pedidos_status ps
    WHERE ps.pedido_id = p.id AND ps.status = 'entregado'
);\n`;
    });

    // Descargas
    downloadSQL("update_recepcionado.sql", script1);
    downloadSQL("select_no_encontrados.sql", script2);
    downloadSQL("insert_en_almacen.sql", script3);
    downloadSQL("update_en_almacen.sql", script4);
    downloadSQL("insert_entregado.sql", script5);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Generador de scripts SQL desde Excel
      </h2>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        className="mb-4"
      />
      {records.length > 0 && (
        <button
          onClick={generateScripts}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generar Archivos SQL
        </button>
      )}
    </div>
  );
};

export default SqlGenerator;
