import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  TimePicker,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

export default function ExamenesSimulacro() {
  const [simulacros, setSimulacros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [notasModalOpen, setNotasModalOpen] = useState(false);
  const [notasData, setNotasData] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const openNotas = async (record) => {
    try {
      const { data } = await apiAcademy.get(`/examenesSimulacro/${record.id}`);
      setNotasData(data.notas);
      setExamenSeleccionado(record);
      setNotasModalOpen(true);
    } catch (err) {
      message.error("Error cargando notas");
    }
  };

  const canales = ["canal 1", "canal 2", "canal 3", "canal 4"];
  const estados = ["creado", "iniciado", "finalizado", "reprogramado"];

  const exportNotas = () => {
    const data = notasData.map((n) => ({
      ID: n.id,
      Nombre: `${n.estudiante?.person?.nombres} ${n.estudiante?.person?.apellidos}`,
      Nota: n.nota,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notas");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `notas_examen_${examenSeleccionado?.id}.xlsx`);
  };

  const fetchSimulacros = async () => {
    setLoading(true);
    try {
      const { data } = await apiAcademy.get("/examenesSimulacro");
      setSimulacros(data);
    } catch (error) {
      message.error("Error cargando simulacros");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        fecha: values.fecha.format("YYYY-MM-DD"),
        horaInicio: values.horaInicio
          ? values.horaInicio.format("HH:mm:ss")
          : null,
        horaFin: values.horaFin ? values.horaFin.format("HH:mm:ss") : null,
        fecha_reprogramacion: values.fecha_reprogramacion
          ? values.fecha_reprogramacion.format("YYYY-MM-DD")
          : null,
      };

      if (editing) {
        await apiAcademy.put(`/examenesSimulacro/${editing.id}`, payload);
        message.success("Simulacro actualizado");
      } else {
        await apiAcademy.post("/examenesSimulacro", payload);
        message.success("Simulacro creado");
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchSimulacros();
    } catch (error) {
      console.log(error);
      message.error("Error guardando simulacro");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/examenesSimulacro/${id}`);
      message.success("Simulacro eliminado");
      fetchSimulacros();
    } catch {
      message.error("Error eliminando simulacro");
    }
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      fecha: dayjs(record.fecha),
      hora_inicio: record.hora_inicio
        ? dayjs(record.hora_inicio, "HH:mm:ss")
        : null,
      hora_fin: record.hora_fin ? dayjs(record.hora_fin, "HH:mm:ss") : null,
      fecha_reprogramacion: record.fecha_reprogramacion
        ? dayjs(record.fecha_reprogramacion)
        : null,
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchSimulacros();
  }, []);

  const updateNota = async (notaId, nuevaNota) => {
    try {
      await apiAcademy.put(`/notasSimulacro/${notaId}`, { nota: nuevaNota });
      message.success("Nota actualizada");
      // refrescar la tabla
      setNotasData((prev) =>
        prev.map((n) => (n.id === notaId ? { ...n, nota: nuevaNota } : n))
      );
    } catch (err) {
      message.error("Error actualizando nota");
    }
  };

  return (
    <div>
      <Button type="primary" onClick={() => setIsModalOpen(true)}>
        Nuevo Simulacro
      </Button>
      <Table
        rowKey="id"
        columns={[
          { title: "ID", dataIndex: "id" },
          { title: "Estado", dataIndex: "estado" },
          { title: "Fecha", dataIndex: "fecha" },
          { title: "Hora Inicio", dataIndex: "horaInicio" },
          { title: "Hora Fin", dataIndex: "horaFin" },
          { title: "Canal", dataIndex: "canal" },
          {
            title: "Acciones",
            render: (_, record) => (
              <>
                <Button type="link" onClick={() => openNotas(record)}>
                  Ver Notas
                </Button>
                <Button type="link" onClick={() => openEdit(record)}>
                  Editar
                </Button>
                <Popconfirm
                  title="¿Eliminar simulacro?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button type="link" danger>
                    Eliminar
                  </Button>
                </Popconfirm>
              </>
            ),
          },
        ]}
        dataSource={simulacros}
        loading={loading}
        style={{ marginTop: 16 }}
      />
      <Modal
        title={`Notas del examen #${examenSeleccionado?.id}`}
        open={notasModalOpen}
        onCancel={() => setNotasModalOpen(false)}
        footer={null}
        width={800}
      >
        <Button
          type="primary"
          onClick={exportNotas}
          style={{ marginBottom: 16 }}
        >
          Exportar a Excel
        </Button>
        <Table
          rowKey="id"
          columns={[
            { title: "ID", dataIndex: "id" },
            {
              title: "Nombre",
              render: (_, r) =>
                `${r.estudiante?.person?.nombre} ${r.estudiante?.person?.apellido}`,
            },
            {
              title: "Nota",
              dataIndex: "nota",
              render: (nota, record) => (
                <Input
                  defaultValue={nota}
                  onBlur={(e) => updateNota(record.id, e.target.value)}
                  style={{ width: 80 }}
                />
              ),
            },
          ]}
          dataSource={notasData}
          pagination={false}
        />
      </Modal>

      <Modal
        title={editing ? "Editar Simulacro" : "Nuevo Simulacro"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditing(null);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
            <Select>
              {estados.map((e) => (
                <Option key={e}>{e}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="horaInicio" label="Hora Inicio">
            <TimePicker format="HH:mm" />
          </Form.Item>

          <Form.Item name="horaFin" label="Hora Fin">
            <TimePicker format="HH:mm" />
          </Form.Item>

          <Form.Item name="documento_url" label="Documento URL">
            <Input />
          </Form.Item>

          <Form.Item name="canal" label="Canal" rules={[{ required: true }]}>
            <Select>
              {canales.map((c) => (
                <Option key={c}>{c}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="fecha_reprogramacion" label="Fecha Reprogramación">
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
