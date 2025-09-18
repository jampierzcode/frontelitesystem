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
import { PlusOutlined, QrcodeOutlined } from "@ant-design/icons";
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

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  useEffect(() => {
    fetchAsistencias();
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

  // --- LECTURA DE QR ---
  const [data, setData] = useState("No result");
  const handleScan = async (data) => {
    if (data) {
      try {
        await apiAcademy.post("/asistencias", {
          estudianteId: data, // el QR contiene el id del estudiante
          fecha: dayjs().format("YYYY-MM-DD"),
          horaEntrada: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          estado: "presente",
        });
        message.success("Asistencia registrada vía QR");
        setQrModalOpen(false);
        fetchAsistencias();
      } catch (error) {
        console.error(error);
        message.error("Error registrando asistencia con QR");
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    message.error("Error con la cámara");
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

      {/* Modal QR */}

      <QrReader
        asistencias={asistencias}
        estudiantes={estudiantes}
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
