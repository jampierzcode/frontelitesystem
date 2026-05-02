import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Tag,
  message,
  Form,
  Input,
  Space,
  Popconfirm,
  Segmented,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import apiAcademy from "../../components/auth/apiAcademy";

const ESTADO_COLOR = {
  pendiente: "gold",
  aprobada: "green",
  rechazada: "red",
};

export default function SolicitudesMatricula() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [rechazarItem, setRechazarItem] = useState(null);
  const [rechazarForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/solicitudes-matricula");
      setItems(res.data.data || []);
    } catch {
      message.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const conteos = useMemo(() => {
    const total = items.length;
    const pendientes = items.filter((i) => i.estado === "pendiente").length;
    const aprobadas = items.filter((i) => i.estado === "aprobada").length;
    const rechazadas = items.filter((i) => i.estado === "rechazada").length;
    return { total, pendientes, aprobadas, rechazadas };
  }, [items]);

  const filtered = useMemo(() => {
    if (filtroEstado === "todos") return items;
    return items.filter((i) => i.estado === filtroEstado);
  }, [items, filtroEstado]);

  const handleRechazar = async () => {
    try {
      const v = rechazarForm.getFieldsValue();
      await apiAcademy.post(
        `/solicitudes-matricula/${rechazarItem.id}/rechazar`,
        { notas: v.notas }
      );
      message.success("Solicitud rechazada");
      setRechazarItem(null);
      rechazarForm.resetFields();
      fetchData();
    } catch {
      message.error("Error al rechazar");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    {
      title: "Solicitante",
      key: "solicitante",
      render: (_, r) => (
        <div>
          <div className="font-medium">
            {r.nombre} {r.apellido || ""}
          </div>
          <div className="text-xs text-gray-500">{r.whatsapp}</div>
        </div>
      ),
    },
    { title: "DNI", dataIndex: "dni", render: (v) => v || "—" },
    { title: "Email", dataIndex: "email", render: (v) => v || "—" },
    {
      title: "Ciclo",
      key: "ciclo",
      render: (_, r) => r.ciclo?.nombre || "—",
    },
    {
      title: "Modalidad",
      key: "modalidad",
      render: (_, r) => `${r.modalidad} - ${r.turno?.nombre || "—"}`,
    },
    {
      title: "Vouchers",
      key: "vouchers",
      render: (_, r) => {
        const m = !!(r.comprobanteMatriculaUrl || r.comprobanteMatriculaKey);
        const me = !!(
          r.comprobanteMensualidadUrl || r.comprobanteMensualidadKey
        );
        if (!m && !me) return <span className="text-gray-400">—</span>;
        return (
          <Space size={4}>
            {m && <Tag color="purple">Mat</Tag>}
            {me && <Tag color="blue">Mens</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      render: (e) => <Tag color={ESTADO_COLOR[e]}>{e}</Tag>,
    },
    {
      title: "Recibida",
      dataIndex: "createdAt",
      render: (v) => dayjs(v).format("DD/MM HH:mm"),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 220,
      render: (_, r) => (
        <Space wrap>
          <Button
            size="small"
            type="primary"
            className="bg-primary"
            onClick={() => navigate(`/solicitudes-matricula/${r.id}`)}
          >
            Ver detalle
          </Button>
          {r.estado === "pendiente" && (
            <Popconfirm
              title="¿Rechazar?"
              onConfirm={() => {
                setRechazarItem(r);
                rechazarForm.resetFields();
              }}
            >
              <Button size="small" danger>
                Rechazar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Solicitudes de matrícula</h2>
        <p className="text-sm text-gray-500">
          Solicitudes recibidas desde el sitio público de matrícula
        </p>
      </div>

      <div className="mb-4">
        <Segmented
          value={filtroEstado}
          onChange={setFiltroEstado}
          options={[
            { value: "todos", label: `Todas (${conteos.total})` },
            {
              value: "pendiente",
              label: `Pendientes (${conteos.pendientes})`,
            },
            { value: "aprobada", label: `Aprobadas (${conteos.aprobadas})` },
            {
              value: "rechazada",
              label: `Rechazadas (${conteos.rechazadas})`,
            },
          ]}
        />
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={!!rechazarItem}
        title="Rechazar solicitud"
        onCancel={() => setRechazarItem(null)}
        onOk={handleRechazar}
        okText="Confirmar rechazo"
        okButtonProps={{ danger: true }}
      >
        <Form layout="vertical" form={rechazarForm}>
          <Form.Item label="Motivo del rechazo (opcional)" name="notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
