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
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";
import { PlusOutlined } from "@ant-design/icons";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [filtroFecha, setFiltroFecha] = useState([]);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [resumen, setResumen] = useState({
    total: 0,
    asistieron: 0,
    porcentaje: 0,
  });

  useEffect(() => {
    fetchAsistencias();
  }, [filtroFecha, filtroEstado]);

  const fetchAsistencias = async () => {
    setLoading(true);
    try {
      let params = {};

      if (filtroFecha && filtroFecha.length === 2) {
        params.fechaInicio = filtroFecha[0].format("YYYY-MM-DD");
        params.fechaFin = filtroFecha[1].format("YYYY-MM-DD");
      } else if (filtroFecha && filtroFecha.length === 1) {
        params.fechaInicio = filtroFecha[0].format("YYYY-MM-DD");
        params.fechaFin = filtroFecha[0].format("YYYY-MM-DD");
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
    const total = data.length;
    const asistieron = data.filter((a) => a.estado === "presente").length;
    const porcentaje = total > 0 ? ((asistieron / total) * 100).toFixed(1) : 0;
    setResumen({ total, asistieron, porcentaje });
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
  const [estudiantes, setEstudiantes] = useState([]);

  const fetchEstudiantes = async () => {
    try {
      const res = await apiAcademy("/estudiantes");
      console.log(res);
      setEstudiantes(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchEstudiantes();
  }, []);

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
          value={[
            filtroFecha[0] ? filtroFecha[0] : null,
            filtroFecha[1] ? filtroFecha[1] : null,
          ]}
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
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Statistic title="Total Estudiantes" value={resumen.total} />
        </Card>
        <Card>
          <Statistic title="Asistieron" value={resumen.asistieron} />
        </Card>
        <Card>
          <Statistic
            title="% Asistencia"
            value={resumen.porcentaje}
            suffix="%"
          />
        </Card>
      </div>

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
              {/* Aquí deberías mapear estudiantes desde tu API */}
              {estudiantes.length > 0 &&
                estudiantes.map((e, index) => {
                  return (
                    <Option key={index} value={e.id}>
                      {e.person.nombre} {e.person.dni}
                    </Option>
                  );
                })}
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
    </div>
  );
}
