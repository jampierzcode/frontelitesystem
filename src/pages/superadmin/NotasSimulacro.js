import React, { useEffect, useState } from "react";
import { Table, Button, InputNumber, Select, message } from "antd";
import axios from "axios";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

export default function NotasSimulacro() {
  const [simulacros, setSimulacros] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [notas, setNotas] = useState({});
  const [simulacroId, setSimulacroId] = useState(null);

  const fetchSimulacros = async () => {
    try {
      const { data } = await apiAcademy.get(
        "/examenesSimulacro?estado=iniciado"
      );
      setSimulacros(data);
    } catch {
      message.error("Error cargando simulacros");
    }
  };

  const fetchEstudiantes = async (id) => {
    try {
      //   const { data } = await apiAcademy.get(`/estudiantes?simulacroId=${id}`);
      const { data } = await apiAcademy.get(`/estudiantes`);
      setEstudiantes(data);
      const inicial = {};
      data.forEach((e) => (inicial[e.id] = null));
      setNotas(inicial);
    } catch {
      message.error("Error cargando estudiantes");
    }
  };

  const handleGuardar = async () => {
    try {
      const payload = Object.entries(notas).map(([estudianteId, nota]) => ({
        examen_id: simulacroId,
        estudiante_id: parseInt(estudianteId),
        nota,
      }));
      await apiAcademy.post("/notasSimulacro", payload);
      message.success("Notas guardadas");
    } catch {
      message.error("Error guardando notas");
    }
  };

  useEffect(() => {
    fetchSimulacros();
  }, []);

  return (
    <div>
      <h2>Subir Notas de Simulacro</h2>

      <Select
        placeholder="Selecciona simulacro iniciado"
        style={{ width: 300, marginBottom: 20 }}
        onChange={(value) => {
          setSimulacroId(value);
          fetchEstudiantes(value);
        }}
      >
        {simulacros.map((s) => (
          <Option key={s.id} value={s.id}>
            {`Simulacro #${s.id} - ${s.fecha}`}
          </Option>
        ))}
      </Select>

      {estudiantes.length > 0 && (
        <>
          <Table
            rowKey="id"
            dataSource={estudiantes}
            columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Nombre", dataIndex: "nombre" },
              {
                title: "Nota",
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    max={20}
                    value={notas[record.id]}
                    onChange={(value) =>
                      setNotas({ ...notas, [record.id]: value })
                    }
                  />
                ),
              },
            ]}
            pagination={false}
          />
          <Button
            type="primary"
            style={{ marginTop: 20 }}
            onClick={handleGuardar}
          >
            Guardar Notas
          </Button>
        </>
      )}
    </div>
  );
}
