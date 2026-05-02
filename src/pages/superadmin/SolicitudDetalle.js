import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Tag,
  Descriptions,
  Image,
  Button,
  message,
  Space,
  Form,
  InputNumber,
  Switch,
  Modal,
  Input,
  Skeleton,
  Empty,
} from "antd";
import dayjs from "dayjs";
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import apiAcademy from "../../components/auth/apiAcademy";

const ESTADO_COLOR = {
  pendiente: "gold",
  aprobada: "green",
  rechazada: "red",
};

export default function SolicitudDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aprobarOpen, setAprobarOpen] = useState(false);
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aprobarForm] = Form.useForm();
  const [rechazarForm] = Form.useForm();

  const fetchDetalle = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get(`/solicitudes-matricula/${id}`);
      setSolicitud(res.data.data);
    } catch {
      message.error("Error al cargar solicitud");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalle();
    // eslint-disable-next-line
  }, [id]);

  const tieneVoucherMat = !!(solicitud?.comprobanteMatriculaUrl || solicitud?.comprobanteMatriculaKey);
  const tieneVoucherMen = !!(solicitud?.comprobanteMensualidadUrl || solicitud?.comprobanteMensualidadKey);

  const openAprobar = () => {
    aprobarForm.resetFields();
    aprobarForm.setFieldsValue({
      registrarPagoMatricula: tieneVoucherMat,
      registrarPagoMensualidad: tieneVoucherMen,
      metodoPago: "yape",
    });
    setAprobarOpen(true);
  };

  const handleAprobar = async () => {
    try {
      const v = await aprobarForm.validateFields();
      setSubmitting(true);
      const res = await apiAcademy.post(
        `/solicitudes-matricula/${id}/aprobar`,
        {
          precioMatricula: v.precioMatricula,
          precioMensualidad: v.precioMensualidad,
          registrarPagoMatricula: v.registrarPagoMatricula,
          registrarPagoMensualidad: v.registrarPagoMensualidad,
          metodoPago: v.metodoPago,
        }
      );
      message.success(res.data.message);
      setAprobarOpen(false);
      fetchDetalle();
    } catch (err) {
      message.error(err?.response?.data?.message || "Error al aprobar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    try {
      const v = rechazarForm.getFieldsValue();
      setSubmitting(true);
      await apiAcademy.post(`/solicitudes-matricula/${id}/rechazar`, {
        notas: v.notas || null,
      });
      message.success("Solicitud rechazada");
      setRechazarOpen(false);
      fetchDetalle();
    } catch {
      message.error("Error al rechazar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton active />
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="p-4">
        <Empty description="Solicitud no encontrada" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/solicitudes-matricula")}
            style={{ paddingLeft: 0 }}
          >
            Volver a solicitudes
          </Button>
          <h2 className="text-xl font-bold mt-1">
            Solicitud SOL-{String(solicitud.id).padStart(6, "0")}
          </h2>
          <Tag color={ESTADO_COLOR[solicitud.estado]} className="mt-1">
            {solicitud.estado}
          </Tag>
        </div>
        {solicitud.estado === "pendiente" && (
          <Space>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                rechazarForm.resetFields();
                setRechazarOpen(true);
              }}
            >
              Rechazar
            </Button>
            <Button
              type="primary"
              className="bg-primary"
              icon={<CheckCircleOutlined />}
              onClick={openAprobar}
            >
              Aprobar y crear matrícula
            </Button>
          </Space>
        )}
      </div>

      <Card title="Datos del solicitante">
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Nombre">
            {solicitud.nombre} {solicitud.apellido || ""}
          </Descriptions.Item>
          <Descriptions.Item label="DNI">{solicitud.dni || "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{solicitud.email || "—"}</Descriptions.Item>
          <Descriptions.Item label="WhatsApp">{solicitud.whatsapp}</Descriptions.Item>
          <Descriptions.Item label="Recibida">
            {dayjs(solicitud.createdAt).format("DD/MM/YYYY HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="IP origen">
            {solicitud.ipOrigen || "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Solicitud de matrícula">
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Ciclo">
            {solicitud.ciclo?.nombre || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Modalidad">
            {solicitud.modalidad} — {solicitud.turno?.nombre || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Sede">
            {solicitud.sede?.name_referential || solicitud.sede?.nameReferential || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Monto referencia">
            {solicitud.montoReferencia
              ? `S/ ${Number(solicitud.montoReferencia).toFixed(2)}`
              : "—"}
          </Descriptions.Item>
          {solicitud.notasAdmin && (
            <Descriptions.Item label="Notas admin" span={2}>
              {solicitud.notasAdmin}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Comprobantes de pago">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VoucherCard
            titulo="Matrícula"
            url={solicitud.comprobanteMatriculaUrl}
            disponible={tieneVoucherMat}
          />
          <VoucherCard
            titulo="Mensualidad"
            url={solicitud.comprobanteMensualidadUrl}
            disponible={tieneVoucherMen}
          />
        </div>
      </Card>

      {solicitud.estado === "aprobada" && (
        <Card title="Resultado">
          <p>
            ✅ Matrícula creada con id{" "}
            <strong>{solicitud.matriculaId}</strong>. El estudiante quedó
            registrado con id <strong>{solicitud.estudianteId}</strong>.
          </p>
        </Card>
      )}

      {/* Modal Aprobar */}
      <Modal
        open={aprobarOpen}
        title="Aprobar solicitud"
        onOk={handleAprobar}
        onCancel={() => setAprobarOpen(false)}
        okText="Aprobar y crear matrícula"
        confirmLoading={submitting}
        okButtonProps={{ className: "bg-primary text-white" }}
        width={520}
      >
        <p className="mb-3 text-sm text-gray-600">
          Se creará persona, estudiante y matrícula con cronograma. Si hay
          vouchers subidos, se registran como pagos validados automáticamente
          contra las cuotas correspondientes.
        </p>
        <Form layout="vertical" form={aprobarForm}>
          <Form.Item
            label="Precio matrícula (vacío = del ciclo)"
            name="precioMatricula"
          >
            <InputNumber min={0} step={10} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Precio mensualidad (vacío = del ciclo)"
            name="precioMensualidad"
          >
            <InputNumber min={0} step={10} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Método de pago para registros automáticos"
            name="metodoPago"
          >
            <Input placeholder="yape, plin, efectivo, tarjeta..." />
          </Form.Item>
          <Form.Item
            label={`Registrar pago de matrícula ${tieneVoucherMat ? "(con voucher)" : "(sin voucher)"}`}
            name="registrarPagoMatricula"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label={`Registrar pago de mensualidad (1ª) ${tieneVoucherMen ? "(con voucher)" : "(sin voucher)"}`}
            name="registrarPagoMensualidad"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Rechazar */}
      <Modal
        open={rechazarOpen}
        title="Rechazar solicitud"
        onOk={handleRechazar}
        onCancel={() => setRechazarOpen(false)}
        okText="Confirmar rechazo"
        confirmLoading={submitting}
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

function VoucherCard({ titulo, url, disponible }) {
  if (!disponible) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400">
        <div className="text-sm font-semibold mb-1 text-gray-600">{titulo}</div>
        <div className="text-xs">Sin voucher subido</div>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 text-center">
        <div className="text-sm font-semibold text-yellow-800">{titulo}</div>
        <div className="text-xs text-yellow-700">URL no disponible</div>
      </div>
    );
  }

  // Detectar PDF para mostrar enlace en vez de Image
  const esPDF = /\.pdf(\?|$)/i.test(url);

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold mb-2">{titulo}</div>
      {esPDF ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          📄 Abrir PDF en pestaña nueva
        </a>
      ) : (
        <Image
          src={url}
          alt={`Voucher ${titulo}`}
          style={{ maxHeight: 280, objectFit: "contain" }}
          preview={{
            mask: "Click para zoom",
          }}
        />
      )}
    </div>
  );
}
