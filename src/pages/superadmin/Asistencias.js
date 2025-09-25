import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Card,
  Statistic,
  message,
  Row,
  Col,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";
import { EditOutlined, PlusOutlined, QrcodeOutlined } from "@ant-design/icons";
import QrReader from "../../components/QrReader";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [form] = Form.useForm();

  const hoy = [dayjs().startOf("day"), dayjs().endOf("day")];
  const [filtroFecha, setFiltroFecha] = useState(hoy);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [resumen, setResumen] = useState({
    totalEstudiantes: 0,
    asistieron: 0,
    porcentaje: 0,
    estados: {},
  });

  const [estudiantes, setEstudiantes] = useState([]);
  // --- NUEVO: estado para editar ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [selectedAsistencia, setSelectedAsistencia] = useState(null);

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  useEffect(() => {
    fetchAsistencias();
    // eslint-disable-next-line
  }, [filtroFecha, filtroEstado]);

  const fetchEstudiantes = async () => {
    try {
      const res = await apiAcademy("/estudiantes");
      setEstudiantes(res.data.data);
      setResumen((r) => ({ ...r, totalEstudiantes: res.data.data.length }));
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAsistencias = async () => {
    setLoading(true);
    try {
      let params = {};
      if (filtroFecha && filtroFecha.length === 2) {
        params.fechaInicio = filtroFecha[0].format("YYYY-MM-DD");
        params.fechaFin = filtroFecha[1].format("YYYY-MM-DD");
      }

      if (filtroEstado) {
        params.estado = filtroEstado;
      }

      const res = await apiAcademy.get("/asistencias", { params });
      setAsistencias(res.data.data);
      calcularResumen(res.data.data);
    } catch (error) {
      console.error(error);
      message.error("Error cargando asistencias");
    } finally {
      setLoading(false);
    }
  };

  const calcularResumen = (data) => {
    const asistieron = data.filter((a) => a.estado === "presente").length;
    const totalHoy = resumen.totalEstudiantes || 0;
    const porcentaje =
      totalHoy > 0 ? ((asistieron / totalHoy) * 100).toFixed(1) : 0;

    // conteo por estado
    const estados = data.reduce((acc, cur) => {
      acc[cur.estado] = (acc[cur.estado] || 0) + 1;
      return acc;
    }, {});

    setResumen((r) => ({
      ...r,
      asistieron,
      porcentaje,
      estados,
    }));
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        estudianteId: values.estudianteId,
        fecha: values.fecha.format("YYYY-MM-DD"),
        horaEntrada: values.horaEntrada
          ? values.horaEntrada.format("YYYY-MM-DD HH:mm:ss")
          : null,
        horaSalida: values.horaSalida
          ? values.horaSalida.format("YYYY-MM-DD HH:mm:ss")
          : null,
        estado: values.estado,
      };

      await apiAcademy.post("/asistencias", payload);
      message.success("Asistencia registrada");
      setModalOpen(false);
      fetchAsistencias();
      form.resetFields();
    } catch (error) {
      console.error(error);
      message.error("Error al guardar asistencia");
    }
  };
  // --- EDITAR ASISTENCIA ---
  const openEditModal = (record) => {
    setSelectedAsistencia(record);
    editForm.setFieldsValue({
      estudianteId: record.estudianteId,
      fecha: dayjs(record.fecha),
      horaEntrada: record.horaEntrada ? dayjs(record.horaEntrada) : null,
      horaSalida: record.horaSalida ? dayjs(record.horaSalida) : null,
      estado: record.estado,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        estudianteId: values.estudianteId,
        fecha: values.fecha.format("YYYY-MM-DD"),
        horaEntrada: values.horaEntrada
          ? values.horaEntrada.format("YYYY-MM-DD HH:mm:ss")
          : null,
        horaSalida: values.horaSalida
          ? values.horaSalida.format("YYYY-MM-DD HH:mm:ss")
          : null,
        estado: values.estado,
      };

      await apiAcademy.put(`/asistencias/${selectedAsistencia.id}`, payload);
      message.success("Asistencia actualizada");
      setEditModalOpen(false);
      fetchAsistencias();
      editForm.resetFields();
    } catch (error) {
      console.error(error);
      message.error("Error al actualizar asistencia");
    }
  };

  const columns = [
    {
      title: "Estudiante",
      dataIndex: ["estudiante", "person", "nombre"],
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
    },
    {
      title: "Hora Entrada",
      dataIndex: "horaEntrada",
      render: (text) => (text ? dayjs(text).format("HH:mm") : "-"),
    },
    {
      title: "Hora Salida",
      dataIndex: "horaSalida",
      render: (text) => (text ? dayjs(text).format("HH:mm") : "-"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
    },
    {
      title: "Acciones",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => openEditModal(record)}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <RangePicker
          value={[filtroFecha[0], filtroFecha[1]]}
          onChange={(val) => setFiltroFecha(val)}
          format="YYYY-MM-DD"
        />
        <Select
          placeholder="Filtrar por estado"
          value={filtroEstado}
          onChange={(val) => setFiltroEstado(val)}
          style={{ width: 200 }}
          allowClear
        >
          <Option value="presente">Presente</Option>
          <Option value="tardanza">Tardanza</Option>
          <Option value="falta">Falta</Option>
          <Option value="justificada">Justificada</Option>
        </Select>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          Nueva Asistencia
        </Button>
        <Button
          type="default"
          icon={<QrcodeOutlined />}
          onClick={() => setQrModalOpen(true)}
        >
          Escanear QR
        </Button>
      </div>

      {/* Resumen */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Estudiantes"
              value={resumen.totalEstudiantes}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Asistieron Hoy" value={resumen.asistieron} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="% Asistencia Hoy"
              value={resumen.porcentaje}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Otros Estados"
              valueRender={() => (
                <div>
                  {Object.entries(resumen.estados).map(([estado, cantidad]) => (
                    <div key={estado}>
                      {estado}: {cantidad}
                    </div>
                  ))}
                </div>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla */}
      <Table
        rowKey="id"
        dataSource={asistencias}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal Crear */}
      <Modal
        open={modalOpen}
        title="Registrar Asistencia"
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Estudiante ID"
            name="estudianteId"
            rules={[{ required: true, message: "Seleccione un estudiante" }]}
          >
            <Select placeholder="Seleccione un estudiante">
              {estudiantes.length > 0 &&
                estudiantes.map((e) => (
                  <Option key={e.id} value={e.id}>
                    {e.person.nombre} ({e.person.dni})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Fecha"
            name="fecha"
            initialValue={dayjs()}
            rules={[{ required: true, message: "Seleccione la fecha" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Hora Entrada" name="horaEntrada">
            <TimePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Hora Salida" name="horaSalida">
            <TimePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Estado"
            name="estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select>
              <Option value="presente">Presente</Option>
              <Option value="tardanza">Tardanza</Option>
              <Option value="falta">Falta</Option>
              <Option value="justificada">Justificada</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={editModalOpen}
        title="Editar Asistencia"
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEdit}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            label="Estudiante"
            name="estudianteId"
            rules={[{ required: true, message: "Seleccione un estudiante" }]}
          >
            <Select placeholder="Seleccione un estudiante">
              {estudiantes.map((e) => (
                <Option key={e.id} value={e.id}>
                  {e.person.nombre} ({e.person.dni})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Fecha"
            name="fecha"
            rules={[{ required: true, message: "Seleccione la fecha" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Hora Entrada" name="horaEntrada">
            <TimePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Hora Salida" name="horaSalida">
            <TimePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Estado"
            name="estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select>
              <Option value="presente">Presente</Option>
              <Option value="tardanza">Tardanza</Option>
              <Option value="falta">Falta</Option>
              <Option value="justificada">Justificada</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal QR */}

      <QrReader
        asistencias={asistencias}
        fetchAsistencias={fetchAsistencias}
        estudiantes={estudiantes}
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
