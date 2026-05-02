import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TimePicker,
  Button,
  Switch,
  Select,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Popconfirm,
  Tag,
  Space,
  Divider,
  Alert,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TIPO_EXC_OPTIONS = [
  { value: "cerrado_total", label: "Cerrado todo el día" },
  { value: "horario_especial", label: "Horario especial" },
];

export default function Schedules() {
  const [sedes, setSedes] = useState([]);
  const [sedeFiltro, setSedeFiltro] = useState(null); // null = global / todas
  const [schedules, setSchedules] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [estadoActual, setEstadoActual] = useState(null);
  const [loadingSched, setLoadingSched] = useState(false);
  const [loadingExc, setLoadingExc] = useState(false);

  // Modal de excepciones
  const [excModalOpen, setExcModalOpen] = useState(false);
  const [editingExc, setEditingExc] = useState(null);
  const [excForm] = Form.useForm();

  const fetchSedes = async () => {
    try {
      const res = await apiAcademy.get("/sedes");
      setSedes(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchSchedules = async () => {
    setLoadingSched(true);
    try {
      const res = await apiAcademy.get("/schedules", {
        params: sedeFiltro ? { sede_id: sedeFiltro } : {},
      });
      setSchedules(res.data.data || []);
    } catch {
      message.error("Error al cargar horarios");
    } finally {
      setLoadingSched(false);
    }
  };

  const fetchExcepciones = async () => {
    setLoadingExc(true);
    try {
      const res = await apiAcademy.get("/excepciones-horario", {
        params: sedeFiltro ? { sede_id: sedeFiltro } : {},
      });
      setExcepciones(res.data.data || []);
    } catch {
      message.error("Error al cargar excepciones");
    } finally {
      setLoadingExc(false);
    }
  };

  const fetchEstado = async () => {
    try {
      const res = await apiAcademy.get("/horarios/operativo-actual", {
        params: sedeFiltro ? { sede_id: sedeFiltro } : {},
      });
      setEstadoActual(res.data.data);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchExcepciones();
    fetchEstado();
    // eslint-disable-next-line
  }, [sedeFiltro]);

  // Combina los schedules existentes con placeholders para los 7 días
  const filasSemana = useMemo(() => {
    const map = new Map(schedules.map((s) => [s.dia, s]));
    return DIAS.map((dia) => {
      const existente = map.get(dia);
      return existente
        ? existente
        : {
            id: null,
            dia,
            horaInicio: "09:00:00",
            horaFin: "18:00:00",
            activo: false,
            sedeId: sedeFiltro || null,
            __placeholder: true,
          };
    });
  }, [schedules, sedeFiltro]);

  const updateLocal = (dia, patch) => {
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.dia === dia);
      if (idx === -1) {
        // Si era placeholder, sumarlo a la lista local
        const nueva = filasSemana.find((f) => f.dia === dia);
        return [...prev, { ...nueva, ...patch }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const guardarFila = async (fila) => {
    try {
      const payload = {
        dia: fila.dia,
        horaInicio: fila.horaInicio,
        horaFin: fila.horaFin,
        activo: !!fila.activo,
        sedeId: sedeFiltro || null,
      };
      if (fila.id) {
        await apiAcademy.put(`/schedules/${fila.id}`, payload);
      } else {
        await apiAcademy.post("/schedules", payload);
      }
      message.success(`${fila.dia} guardado`);
      fetchSchedules();
      fetchEstado();
    } catch {
      message.error("Error al guardar");
    }
  };

  const eliminarFila = async (fila) => {
    if (!fila.id) return;
    try {
      await apiAcademy.delete(`/schedules/${fila.id}`);
      message.success("Eliminado");
      fetchSchedules();
      fetchEstado();
    } catch {
      message.error("Error al eliminar");
    }
  };

  const columnsSemana = [
    { title: "Día", dataIndex: "dia", width: 110 },
    {
      title: "Hora inicio",
      width: 140,
      render: (_, r) => (
        <TimePicker
          value={r.horaInicio ? dayjs(r.horaInicio, "HH:mm:ss") : null}
          format="HH:mm"
          minuteStep={5}
          allowClear={false}
          onChange={(t) =>
            updateLocal(r.dia, {
              horaInicio: t ? t.format("HH:mm:ss") : null,
            })
          }
        />
      ),
    },
    {
      title: "Hora fin",
      width: 140,
      render: (_, r) => (
        <TimePicker
          value={r.horaFin ? dayjs(r.horaFin, "HH:mm:ss") : null}
          format="HH:mm"
          minuteStep={5}
          allowClear={false}
          onChange={(t) =>
            updateLocal(r.dia, { horaFin: t ? t.format("HH:mm:ss") : null })
          }
        />
      ),
    },
    {
      title: "Activo",
      width: 90,
      render: (_, r) => (
        <Switch
          checked={!!r.activo}
          onChange={(v) => updateLocal(r.dia, { activo: v })}
        />
      ),
    },
    {
      title: "",
      width: 220,
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            className="bg-primary"
            onClick={() => guardarFila(r)}
          >
            Guardar
          </Button>
          {r.id && (
            <Popconfirm
              title="¿Eliminar este horario?"
              onConfirm={() => eliminarFila(r)}
            >
              <Button danger size="small">
                Eliminar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ---- Excepciones ----

  const openCrearExcepcion = () => {
    setEditingExc(null);
    excForm.resetFields();
    excForm.setFieldsValue({ tipo: "cerrado_total" });
    setExcModalOpen(true);
  };

  const openEditarExcepcion = (record) => {
    setEditingExc(record);
    excForm.setFieldsValue({
      fecha: dayjs(record.fecha),
      tipo: record.tipo,
      horario:
        record.horaInicio && record.horaFin
          ? [
              dayjs(record.horaInicio, "HH:mm:ss"),
              dayjs(record.horaFin, "HH:mm:ss"),
            ]
          : null,
      motivo: record.motivo,
    });
    setExcModalOpen(true);
  };

  const guardarExcepcion = async () => {
    try {
      const v = await excForm.validateFields();
      const payload = {
        sedeId: sedeFiltro || null,
        fecha: v.fecha.format("YYYY-MM-DD"),
        tipo: v.tipo,
        horaInicio:
          v.tipo === "horario_especial" && v.horario
            ? v.horario[0].format("HH:mm:ss")
            : null,
        horaFin:
          v.tipo === "horario_especial" && v.horario
            ? v.horario[1].format("HH:mm:ss")
            : null,
        motivo: v.motivo || null,
      };
      if (editingExc) {
        await apiAcademy.put(`/excepciones-horario/${editingExc.id}`, payload);
      } else {
        await apiAcademy.post("/excepciones-horario", payload);
      }
      message.success("Excepción guardada");
      setExcModalOpen(false);
      fetchExcepciones();
      fetchEstado();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar excepción";
      message.error(msg);
    }
  };

  const eliminarExcepcion = async (record) => {
    try {
      await apiAcademy.delete(`/excepciones-horario/${record.id}`);
      message.success("Excepción eliminada");
      fetchExcepciones();
      fetchEstado();
    } catch {
      message.error("Error al eliminar excepción");
    }
  };

  const columnsExc = [
    {
      title: "Fecha",
      dataIndex: "fecha",
      render: (v) => dayjs(v).format("DD/MM/YYYY (ddd)"),
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      render: (v) =>
        v === "cerrado_total" ? (
          <Tag color="red">Cerrado total</Tag>
        ) : (
          <Tag color="orange">Horario especial</Tag>
        ),
    },
    {
      title: "Horario",
      render: (_, r) =>
        r.tipo === "horario_especial"
          ? `${r.horaInicio?.slice(0, 5)} - ${r.horaFin?.slice(0, 5)}`
          : "—",
    },
    { title: "Motivo", dataIndex: "motivo", render: (v) => v || "—" },
    {
      title: "",
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEditarExcepcion(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar?"
            onConfirm={() => eliminarExcepcion(r)}
          >
            <Button danger size="small">
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Horarios de la academia</h2>
          <p className="text-sm text-gray-500">
            Define cuándo opera la academia. Las excepciones tienen prioridad
            sobre el horario regular.
          </p>
        </div>
        <Select
          placeholder="Todas las sedes (global)"
          allowClear
          style={{ width: 240 }}
          value={sedeFiltro}
          onChange={(v) => setSedeFiltro(v ?? null)}
          options={sedes.map((s) => ({
            value: s.id,
            label: s.name_referential || s.nameReferential,
          }))}
        />
      </div>

      {estadoActual && (
        <Alert
          className="mb-4"
          type={estadoActual.abierto ? "success" : "warning"}
          showIcon
          message={
            estadoActual.abierto
              ? `Academia ABIERTA ahora (${estadoActual.fuente})`
              : `Academia CERRADA ahora (${estadoActual.fuente})`
          }
          description={
            <div className="text-xs">
              {estadoActual.horarioVigente && (
                <span>
                  Horario vigente: {estadoActual.horarioVigente.horaInicio?.slice(0, 5)}{" "}
                  - {estadoActual.horarioVigente.horaFin?.slice(0, 5)}.{" "}
                </span>
              )}
              {estadoActual.motivo && <span>Motivo: {estadoActual.motivo}</span>}
            </div>
          }
        />
      )}

      <Divider orientation="left">Horario regular semanal</Divider>
      <Table
        dataSource={filasSemana}
        columns={columnsSemana}
        rowKey="dia"
        pagination={false}
        loading={loadingSched}
        size="small"
        rowClassName={(r) => (r.__placeholder ? "opacity-60" : "")}
      />

      <Divider orientation="left" className="mt-8">
        Excepciones
      </Divider>
      <div className="flex justify-end mb-2">
        <Button
          type="primary"
          className="bg-primary"
          onClick={openCrearExcepcion}
        >
          Agregar excepción
        </Button>
      </div>
      <Table
        dataSource={excepciones}
        columns={columnsExc}
        rowKey="id"
        pagination={false}
        loading={loadingExc}
        size="small"
        locale={{ emptyText: "Sin excepciones registradas" }}
      />

      <Modal
        title={editingExc ? "Editar excepción" : "Nueva excepción"}
        open={excModalOpen}
        onOk={guardarExcepcion}
        onCancel={() => setExcModalOpen(false)}
        okButtonProps={{ className: "bg-primary text-white" }}
        destroyOnClose
      >
        <Form layout="vertical" form={excForm}>
          <Form.Item
            label="Fecha"
            name="fecha"
            rules={[{ required: true, message: "Fecha requerida" }]}
          >
            <DatePicker format="DD/MM/YYYY" className="w-full" />
          </Form.Item>
          <Form.Item
            label="Tipo"
            name="tipo"
            rules={[{ required: true }]}
          >
            <Select
              options={TIPO_EXC_OPTIONS}
              onChange={(v) => {
                if (v === "cerrado_total") {
                  excForm.setFieldsValue({ horario: null });
                }
              }}
            />
          </Form.Item>
          <Form.Item
            shouldUpdate={(p, n) => p.tipo !== n.tipo}
            noStyle
          >
            {({ getFieldValue }) =>
              getFieldValue("tipo") === "horario_especial" ? (
                <Form.Item
                  label="Horario especial"
                  name="horario"
                  rules={[
                    {
                      validator: (_, val) => {
                        if (!val || !val[0] || !val[1])
                          return Promise.reject("Horario requerido");
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <TimePicker.RangePicker
                    format="HH:mm"
                    minuteStep={5}
                    className="w-full"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="Motivo" name="motivo">
            <Input.TextArea rows={2} placeholder="Día festivo, evento, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
