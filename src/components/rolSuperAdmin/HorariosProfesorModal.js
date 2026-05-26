import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Table,
  Button,
  Form,
  Select,
  TimePicker,
  Switch,
  Input,
  message,
  Popconfirm,
  Tag,
  Space,
  Divider,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../auth/apiAcademy";
import { generarPdfHorarioProfesor } from "./pdfHorarioProfesor";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TIME_FORMAT = "HH:mm";

const HorariosProfesorModal = ({ open, profesor, onClose }) => {
  const [clases, setClases] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [canales, setCanales] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const cursosDelProfesor = useMemo(
    () => profesor?.cursos || [],
    [profesor]
  );

  const fetchClases = async () => {
    if (!profesor?.id) return;
    setLoading(true);
    try {
      const res = await apiAcademy.get("/clases-profesor", {
        params: { profesor_id: profesor.id },
      });
      setClases(res.data.data || []);
    } catch {
      message.error("Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchCiclos = async () => {
    try {
      const res = await apiAcademy.get("/ciclos");
      setCiclos(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchCanales = async () => {
    try {
      const res = await apiAcademy.get("/canales");
      setCanales(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchTurnos = async () => {
    try {
      const res = await apiAcademy.get("/turnos");
      setTurnos(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (open) {
      fetchClases();
      fetchCiclos();
      fetchCanales();
      fetchTurnos();
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profesor?.id]);

  const resetForm = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
  };

  const startEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      cursoId: record.cursoId,
      cicloId: record.cicloId,
      canalId: record.canalId,
      turnoId: record.turnoId,
      aula: record.aula,
      codigoAula: record.codigoAula,
      dia: record.dia,
      horario: [
        dayjs(record.horaInicio, TIME_FORMAT),
        dayjs(record.horaFin, TIME_FORMAT),
      ],
      activo: !!record.activo,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [horaInicioDayjs, horaFinDayjs] = values.horario || [];
      const payload = {
        profesorId: profesor.id,
        cursoId: values.cursoId,
        cicloId: values.cicloId || null,
        canalId: values.canalId || null,
        turnoId: values.turnoId || null,
        aula: values.aula || null,
        codigoAula: values.codigoAula || null,
        dia: values.dia,
        horaInicio: horaInicioDayjs.format(TIME_FORMAT),
        horaFin: horaFinDayjs.format(TIME_FORMAT),
        activo: values.activo,
      };
      if (editing) {
        await apiAcademy.put(`/clases-profesor/${editing.id}`, payload);
        message.success("Horario actualizado");
      } else {
        await apiAcademy.post("/clases-profesor", payload);
        message.success("Horario agregado");
      }
      resetForm();
      fetchClases();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar horario";
      message.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/clases-profesor/${id}`);
      message.success("Horario eliminado");
      fetchClases();
    } catch {
      message.error("Error al eliminar horario");
    }
  };

  const columns = [
    {
      title: "Día",
      dataIndex: "dia",
      key: "dia",
      sorter: (a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia),
      defaultSortOrder: "ascend",
    },
    {
      title: "Hora",
      key: "hora",
      render: (_, r) => `${r.horaInicio?.slice(0, 5)} - ${r.horaFin?.slice(0, 5)}`,
    },
    {
      title: "Curso",
      key: "curso",
      render: (_, r) => r.curso?.nombre || "-",
    },
    {
      title: "Ciclo",
      key: "ciclo",
      render: (_, r) => r.ciclo?.nombre || <Tag>Sin ciclo</Tag>,
    },
    {
      title: "Canal",
      key: "canal",
      render: (_, r) =>
        r.canal?.nombre ? <Tag color="blue">{r.canal.nombre}</Tag> : <Tag>—</Tag>,
    },
    {
      title: "Aula",
      key: "aula",
      render: (_, r) =>
        r.aula || r.codigoAula
          ? `${r.aula || ""}${r.codigoAula ? ` (${r.codigoAula})` : ""}`
          : "—",
    },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      render: (v) =>
        v ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>,
      width: 80,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => startEdit(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar este horario?"
            onConfirm={() => handleDelete(r.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDownloadPdf = () => {
    if (!profesor) return;
    if (clases.length === 0) {
      message.info("Este profesor no tiene horarios para imprimir");
      return;
    }
    generarPdfHorarioProfesor(profesor, clases);
  };

  return (
    <Modal
      title={
        profesor
          ? `Horarios — ${profesor.person?.nombre || ""} ${
              profesor.person?.apellido || ""
            }`
          : "Horarios"
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="pdf" onClick={handleDownloadPdf}>
          Descargar PDF semanal
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={950}
      destroyOnClose
    >
      {cursosDelProfesor.length === 0 && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          Este profesor no tiene cursos asignados. Agrega cursos en su ficha
          antes de definir horarios.
        </div>
      )}

      <Table
        dataSource={clases}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
      />

      <Divider>{editing ? "Editar horario" : "Agregar horario"}</Divider>

      <Form layout="vertical" form={form}>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            label="Día"
            name="dia"
            rules={[{ required: true, message: "Día requerido" }]}
          >
            <Select
              placeholder="Selecciona día"
              options={DIAS.map((d) => ({ value: d, label: d }))}
            />
          </Form.Item>
          <Form.Item
            label="Horario (inicio - fin)"
            name="horario"
            rules={[{ required: true, message: "Horario requerido" }]}
          >
            <TimePicker.RangePicker
              format={TIME_FORMAT}
              minuteStep={5}
              className="w-full"
            />
          </Form.Item>
          <Form.Item
            label="Curso"
            name="cursoId"
            rules={[{ required: true, message: "Curso requerido" }]}
          >
            <Select
              placeholder="Selecciona curso"
              disabled={cursosDelProfesor.length === 0}
              options={cursosDelProfesor.map((c) => ({
                value: c.id,
                label: c.nombre,
              }))}
            />
          </Form.Item>
          <Form.Item label="Ciclo" name="cicloId">
            <Select
              allowClear
              placeholder="Sin ciclo / selecciona"
              options={ciclos.map((c) => ({ value: c.id, label: c.nombre }))}
            />
          </Form.Item>
          <Form.Item label="Canal" name="canalId">
            <Select
              allowClear
              placeholder="Canal (grupo del estudiante)"
              options={canales.map((c) => ({
                value: c.id,
                label: c.area ? `${c.nombre} — ${c.area}` : c.nombre,
              }))}
            />
          </Form.Item>
          <Form.Item label="Turno" name="turnoId">
            <Select
              allowClear
              placeholder="Turno"
              options={turnos
                .filter((t) => t.activo)
                .map((t) => ({ value: t.id, label: t.nombre }))}
            />
          </Form.Item>
          <Form.Item label="Aula" name="aula">
            <Input placeholder="Ej: 101, Laboratorio B" />
          </Form.Item>
          <Form.Item label="Código de aula" name="codigoAula">
            <Input placeholder="Ej: A-101" />
          </Form.Item>
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
        <div className="flex gap-2 justify-end">
          {editing && (
            <Button onClick={resetForm}>Cancelar edición</Button>
          )}
          <Button
            type="primary"
            className="bg-primary"
            onClick={handleSubmit}
          >
            {editing ? "Guardar cambios" : "Agregar"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default HorariosProfesorModal;
