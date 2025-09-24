import React, { useEffect, useState } from "react";
import { Table, Button, Upload, message, Select, Card } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import apiAcademy from "../../components/auth/apiAcademy";

const SubirNotas = () => {
  const [examenes, setExamenes] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [notasExcel, setNotasExcel] = useState([]);

  // 1. Traer examenes iniciados
  useEffect(() => {
    const fetchExamenes = async () => {
      try {
        const { data } = await apiAcademy.get("/examenesSimulacro", {
          params: { estado: "iniciado" },
        });
        setExamenes(data);
      } catch (err) {
        message.error("Error cargando examenes");
      }
    };
    fetchExamenes();
  }, []);

  // 2. Traer estudiantes
  useEffect(() => {
    const fetchEstudiantes = async () => {
      try {
        const { data } = await apiAcademy.get("/estudiantes");
        setEstudiantes(data.data);
      } catch (err) {
        message.error("Error cargando estudiantes");
      }
    };
    fetchEstudiantes();
  }, []);

  // 3. Leer Excel
  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Empieza desde fila 2 → Alumno ID en col 1, Puntaje en col 5
      const parsedNotas = rows
        .slice(2)
        .map((row) => {
          return {
            dni: row[1], // columna Alumno ID
            puntaje: row[5], // columna Puntaje
          };
        })
        .filter((n) => n.dni && n.puntaje);

      setNotasExcel(parsedNotas);
      message.success("Archivo leído correctamente");
    };
    reader.readAsArrayBuffer(file);
    return false; // evita auto subida
  };

  // 4. Subir notas a API
  const subirNotas = async () => {
    if (!examenSeleccionado) {
      message.warning("Selecciona un examen primero");
      return;
    }
    try {
      for (const nota of notasExcel) {
        const estudiante = estudiantes.find(
          (e) => e.person?.dni === String(nota.dni)
        );
        if (!estudiante) {
          message.warning(`No se encontró estudiante con DNI ${nota.dni}`);
          continue;
        }

        await apiAcademy.post("/notasSimulacro", {
          examen_id: examenSeleccionado,
          estudiante_id: estudiante.id,
          nota: Number(nota.puntaje),
        });
      }
      message.success("Notas subidas correctamente");
    } catch (err) {
      console.error(err);
      message.error("Error subiendo notas");
    }
  };

  return (
    <Card title="Subir Notas de Exámenes" style={{ margin: 20 }}>
      <Select
        style={{ width: 300, marginBottom: 16 }}
        placeholder="Selecciona un examen iniciado"
        onChange={(val) => setExamenSeleccionado(val)}
      >
        {examenes.map((ex) => (
          <Select.Option key={ex.id} value={ex.id}>
            {`Examen ${ex.id} - ${ex.fecha} (${ex.canal})`}
          </Select.Option>
        ))}
      </Select>

      <Upload beforeUpload={handleUpload} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Subir Excel</Button>
      </Upload>

      <Table
        rowKey="dni"
        style={{ marginTop: 20 }}
        columns={[
          { title: "DNI", dataIndex: "dni" },
          { title: "Puntaje", dataIndex: "puntaje" },
        ]}
        dataSource={notasExcel}
        pagination={false}
      />

      <Button
        type="primary"
        onClick={subirNotas}
        disabled={!notasExcel.length}
        style={{ marginTop: 20 }}
      >
        Guardar Notas en Examen
      </Button>
    </Card>
  );
};

export default SubirNotas;
