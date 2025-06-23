import React, { useState } from "react";
import * as XLSX from "xlsx";

const ExcelUpload = () => {
  const [sql, setSql] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsedData = jsonData.map((row) => ({
        id_solicitante: row.id_solicitante,
        departamento: row.departamento,
        provincia: row.provincia,
        distrito: row.distrito,
      }));

      generateSQL(parsedData);
    };

    reader.readAsBinaryString(file);
  };

  const generateSQL = (array) => {
    const queries = array
      .filter((item) => item.id_solicitante)
      .map(
        ({ id_solicitante, departamento, provincia, distrito }) => `
UPDATE pedidos 
SET departamento = '${departamento}', 
    provincia = '${provincia}', 
    distrito = '${distrito}' 
WHERE id_solicitante = ${id_solicitante};`
      )
      .join("\n");

    setSql(queries);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Subir archivo Excel</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      {sql && (
        <>
          <h3 className="text-lg font-semibold mt-6">SQL Generado:</h3>
          <textarea
            value={sql}
            readOnly
            className="w-full h-96 p-2 mt-2 border border-gray-300 rounded"
          />
        </>
      )}
    </div>
  );
};

export default ExcelUpload;
