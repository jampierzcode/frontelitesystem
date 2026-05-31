import React, { useEffect, useState, useMemo } from "react";
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
  Tag,
  Tooltip,
  Divider,
  Popconfirm,
  Space,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";
import {
  EditOutlined,
  PlusOutlined,
  QrcodeOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import QrScannerModal from "../../components/QrScannerModal";

const { Option } = Select;
const { RangePicker } = DatePicker;

const POLL_OPERATIVO_MS = 60_000;

const ESTADO_COLOR = {
  presente: "green",
  tardanza: "orange",
  falta: "red",
  justificada: "blue",
};

export default function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [form] = Form.useForm();

  const hoy = useMemo(() => [dayjs().startOf("day"), dayjs().endOf("day")], []);
  const [filtroFecha, setFiltroFecha] = useState(hoy);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTurno, setFiltroTurno] = useState(null);

  const [turnos, setTurnos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [sinMarcar, setSinMarcar] = useState([]);
  const [seleccionadosFalta, setSeleccionadosFalta] = useState([]);

  const [estadoOperativo, setEstadoOperativo] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [selectedAsistencia, setSelectedAsistencia] = useState(null);

  // ------- fetchers -------
  const fetchEstudiantes = async () => {
    try {
      const res = await apiAcademy.get("/estudiantes");
      setEstudiantes(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchTurnos = async () => {
    try {
      const res = await apiAcademy.get("/turnos");
      setTurnos((res.data.data || []).filter((t) => t.activo));
    } catch {
      // silencioso
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
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroTurno) params.turno_id = filtroTurno;
      const res = await apiAcademy.get("/asistencias", { params });
      setAsistencias(res.data.data || []);
    } catch {
      message.error("Error al cargar asistencias");
    } finally {
      setLoading(false);
    }
  };

  const fetchSinMarcar = async () => {
    try {
      const fecha = dayjs().format("YYYY-MM-DD");
      const params = { fecha };
      if (filtroTurno) params.turno_id = filtroTurno;
      const res = await apiAcademy.get("/asistencias/sin-marcar-hoy", {
        params,
      });
      setSinMarcar(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchEstadoOperativo = async () => {
    try {
      const params = {};
      if (filtroTurno) params.turno_id = filtroTurno;
      const res = await apiAcademy.get("/horarios/operativo-actual", { params });
      setEstadoOperativo(res.data.data);
    } catch {
      setEstadoOperativo(null);
    }
  };

  useEffect(() => {
    fetchEstudiantes();
    fetchTurnos();
  }, []);

  // Recalcula sin-marcar y estado operativo cuando cambia el turno (y refresca el operativo en intervalo)
  useEffect(() => {
    fetchSinMarcar();
    fetchEstadoOperativo();
    const intervalo = setInterval(fetchEstadoOperativo, POLL_OPERATIVO_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line
  }, [filtroTurno]);

  useEffect(() => {
    fetchAsistencias();
    // eslint-disable-next-line
  }, [filtroFecha, filtroEstado, filtroTurno]);

  // ------- resumen -------
  const resumen = useMemo(() => {
    const totalEstudiantes = estudiantes.length;
    const asistieron = asistencias.filter(
      (a) => a.estado === "presente" || a.estado === "tardanza"
    ).length;
    const porcentaje = totalEstudiantes > 0
      ? ((asistieron / totalEstudiantes) * 100).toFixed(1)
      : 0;
    const estados = asistencias.reduce((acc, cur) => {
      acc[cur.estado] = (acc[cur.estado] || 0) + 1;
      return acc;
    }, {});
    return { totalEstudiantes, asistieron, porcentaje, estados };
  }, [estudiantes, asistencias]);

  // ------- crear/editar manual -------
  const handleCreate = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        estudianteId: v.estudianteId,
        fecha: v.fecha.format("YYYY-MM-DD"),
        horaEntrada: v.horaEntrada
          ? v.horaEntrada.format("HH:mm:ss")
          : null,
        horaSalida: v.horaSalida ? v.horaSalida.format("HH:mm:ss") : null,
        estado: v.estado,
      };
      await apiAcademy.post("/asistencias", payload);
      message.success("Asistencia registrada");
      setModalOpen(false);
      form.resetFields();
      fetchAsistencias();
      fetchSinMarcar();
    } catch {
      message.error("Error al guardar asistencia");
    }
  };

  const openEditModal = (record) => {
    setSelectedAsistencia(record);
    editForm.setFieldsValue({
      estudianteId: record.estudianteId,
      fecha: dayjs(record.fecha),
      horaEntrada: record.horaEntrada
        ? dayjs(record.horaEntrada, "HH:mm:ss")
        : null,
      horaSalida: record.horaSalida
        ? dayjs(record.horaSalida, "HH:mm:ss")
        : null,
      estado: record.estado,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    try {
      const v = await editForm.validateFields();
      const payload = {
        estudianteId: v.estudianteId,
        fecha: v.fecha.format("YYYY-MM-DD"),
        horaEntrada: v.horaEntrada ? v.horaEntrada.format("HH:mm:ss") : null,
        horaSalida: v.horaSalida ? v.horaSalida.format("HH:mm:ss") : null,
        estado: v.estado,
      };
      await apiAcademy.put(
        `/asistencias/${selectedAsistencia.id}`,
        payload
      );
      message.success("Asistencia actualizada");
      setEditModalOpen(false);
      fetchAsistencias();
      fetchSinMarcar();
    } catch {
      message.error("Error al actualizar asistencia");
    }
  };

  // ------- QR scan -------
  const handleQrScanned = async (estudianteId) => {
    setQrModalOpen(false);
    if (!estudianteId) return;
    try {
      const res = await apiAcademy.post("/asistencias/marcar-qr", {
        estudianteId: Number(estudianteId),
      });
      const a = res.data.data;
      const nombre = `${a?.estudiante?.person?.nombre || ""} ${a?.estudiante?.person?.apellido || ""}`.trim();
      message.success(`${nombre || "Estudiante"} → ${res.data.message}`);
      fetchAsistencias();
      fetchSinMarcar();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al marcar asistencia";
      message.warning(msg);
    }
  };

  // ------- faltas masivas -------
  const handleMarcarFaltas = async () => {
    if (seleccionadosFalta.length === 0) return;
    try {
      const res = await apiAcademy.post("/asistencias/marcar-falta-masiva", {
        estudianteIds: seleccionadosFalta,
        fecha: dayjs().format("YYYY-MM-DD"),
      });
      message.success(res.data.message);
      setSeleccionadosFalta([]);
      fetchAsistencias();
      fetchSinMarcar();
    } catch {
      message.error("Error al marcar faltas");
    }
  };

  // ------- columns -------
  const columns = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, r) =>
        `${r.estudiante?.person?.nombre || ""} ${r.estudiante?.person?.apellido || ""}`.trim(),
    },
    { title: "Fecha", dataIndex: "fecha", render: (v) => dayjs(v).format("DD/MM/YYYY") },
    {
      title: "Turno",
      key: "turno",
      render: (_, r) =>
        r.turno ? <Tag color="blue">{r.turno.nombre}</Tag> : "—",
    },
    {
      title: "Entrada",
      dataIndex: "horaEntrada",
      render: (v) => (v ? v.slice(0, 5) : "—"),
    },
    {
      title: "Salida",
      dataIndex: "horaSalida",
      render: (v) => (v ? v.slice(0, 5) : "—"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      render: (v) => <Tag color={ESTADO_COLOR[v] || "default"}>{v}</Tag>,
    },
    {
      title: "Acciones",
      render: (_, r) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => openEditModal(r)}
        >
          Editar
        </Button>
      ),
    },
  ];

  const sinMarcarColumns = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, e) =>
        `${e.person?.nombre || ""} ${e.person?.apellido || ""}`.trim(),
    },
    {
      title: "DNI",
      key: "dni",
      render: (_, e) => e.person?.dni || "—",
    },
    {
      title: "Sede",
      key: "sede",
      render: (_, e) => e.person?.sede?.name_referential || "—",
    },
  ];

  const academiaAbierta = !!estadoOperativo?.abierto;

  return (
    <div className="p-4 space-y-4">
      {/* Estado operativo + filtros + acciones */}
      {estadoOperativo && (
        <div
          className={`p-3 rounded text-sm ${
            academiaAbierta
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-orange-50 text-orange-800 border border-orange-200"
          }`}
        >
          {academiaAbierta ? "✅ Academia ABIERTA" : "⚠️ Academia CERRADA"}
          {estadoOperativo.turnoNombre && (
            <span className="ml-2 font-semibold">
              · Turno {estadoOperativo.turnoNombre}
            </span>
          )}
          {estadoOperativo.horarioVigente && (
            <span className="ml-2">
              · Horario:{" "}
              {estadoOperativo.horarioVigente.horaInicio?.slice(0, 5)} -{" "}
              {estadoOperativo.horarioVigente.horaFin?.slice(0, 5)}
            </span>
          )}
          {estadoOperativo.motivo && (
            <span className="ml-2">· {estadoOperativo.motivo}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <RangePicker
          value={filtroFecha}
          onChange={(v) => setFiltroFecha(v || hoy)}
          format="DD/MM/YYYY"
        />
        <Select
          placeholder="Estado"
          value={filtroEstado || undefined}
          onChange={(v) => setFiltroEstado(v || "")}
          style={{ width: 160 }}
          allowClear
        >
          <Option value="presente">Presente</Option>
          <Option value="tardanza">Tardanza</Option>
          <Option value="falta">Falta</Option>
          <Option value="justificada">Justificada</Option>
        </Select>
        <Select
          placeholder="Turno (todos)"
          value={filtroTurno || undefined}
          onChange={(v) => setFiltroTurno(v || null)}
          style={{ width: 160 }}
          allowClear
          options={turnos.map((t) => ({ value: t.id, label: t.nombre }))}
        />
        <Button
          type="primary"
          className="bg-primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          Nueva manual
        </Button>
        <Tooltip
          title={
            academiaAbierta
              ? "Escanear QR del estudiante"
              : "El escaneo está deshabilitado porque la academia no está abierta. Configura horarios o cambia la política."
          }
        >
          <Button
            type="default"
            icon={<QrcodeOutlined />}
            onClick={() => setQrModalOpen(true)}
            disabled={!academiaAbierta}
          >
            Escanear QR
          </Button>
        </Tooltip>
      </div>

      {/* Resumen */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Total estudiantes" value={resumen.totalEstudiantes} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Asistieron (presente + tardanza)"
              value={resumen.asistieron}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="% asistencia"
              value={resumen.porcentaje}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="text-xs text-gray-500 mb-1">Por estado</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(resumen.estados).map(([e, n]) => (
                <Tag key={e} color={ESTADO_COLOR[e]}>
                  {e}: {n}
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabla principal */}
      <Table
        rowKey="id"
        dataSource={asistencias}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Sección estudiantes sin marcar HOY */}
      <Divider orientation="left">
        <WarningOutlined className="mr-2 text-orange-500" />
        Estudiantes sin marcar hoy ({sinMarcar.length})
      </Divider>

      {sinMarcar.length === 0 ? (
        <p className="text-sm text-gray-500">
          🎉 Todos los estudiantes ya tienen registro hoy.
        </p>
      ) : (
        <>
          <Space className="mb-2">
            <Popconfirm
              title="¿Marcar como falta a los seleccionados?"
              description={`${seleccionadosFalta.length} estudiantes serán marcados con falta hoy`}
              onConfirm={handleMarcarFaltas}
              disabled={seleccionadosFalta.length === 0}
            >
              <Button
                danger
                disabled={seleccionadosFalta.length === 0}
              >
                Marcar falta a {seleccionadosFalta.length || "0"} seleccionados
              </Button>
            </Popconfirm>
            <Popconfirm
              title="¿Marcar a TODOS los pendientes como falta?"
              description={`Se marcarán ${sinMarcar.length} estudiantes`}
              onConfirm={async () => {
                const ids = sinMarcar.map((e) => e.id);
                try {
                  const res = await apiAcademy.post(
                    "/asistencias/marcar-falta-masiva",
                    { estudianteIds: ids, fecha: dayjs().format("YYYY-MM-DD") }
                  );
                  message.success(res.data.message);
                  fetchAsistencias();
                  fetchSinMarcar();
                } catch {
                  message.error("Error");
                }
              }}
            >
              <Button>Marcar TODOS los pendientes como falta</Button>
            </Popconfirm>
          </Space>
          <Table
            rowKey="id"
            dataSource={sinMarcar}
            columns={sinMarcarColumns}
            pagination={{ pageSize: 10 }}
            rowSelection={{
              selectedRowKeys: seleccionadosFalta,
              onChange: (keys) => setSeleccionadosFalta(keys),
            }}
            size="small"
          />
        </>
      )}

      {/* Modal Crear manual */}
      <Modal
        open={modalOpen}
        title="Registrar asistencia (manual)"
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Estudiante"
            name="estudianteId"
            rules={[{ required: true }]}
          >
            <Select placeholder="Selecciona estudiante" showSearch
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={estudiantes.map((e) => ({
                value: e.id,
                label: `${e.person?.nombre || ""} ${e.person?.apellido || ""} — DNI ${e.person?.dni || "—"}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Fecha"
            name="fecha"
            initialValue={dayjs()}
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Hora entrada" name="horaEntrada">
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item label="Hora salida" name="horaSalida">
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item
            label="Estado"
            name="estado"
            rules={[{ required: true }]}
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
        title="Editar asistencia"
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEdit}
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            label="Estudiante"
            name="estudianteId"
            rules={[{ required: true }]}
          >
            <Select disabled
              options={estudiantes.map((e) => ({
                value: e.id,
                label: `${e.person?.nombre || ""} ${e.person?.apellido || ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Fecha" name="fecha" rules={[{ required: true }]}>
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Hora entrada" name="horaEntrada">
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item label="Hora salida" name="horaSalida">
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item label="Estado" name="estado" rules={[{ required: true }]}>
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
      <QrScannerModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onScanned={handleQrScanned}
      />
    </div>
  );
}
