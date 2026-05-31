import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Table,
  Button,
  Form,
  Select,
  InputNumber,
  Input,
  Image,
  message,
  Tag,
  Progress,
} from "antd";
import { UploadOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import apiAcademy from "../auth/apiAcademy";
import VoucherPicker from "../VoucherPicker";

async function subirVoucherArchivo(file) {
  const fd = new FormData();
  fd.append("file", file);
  const up = await apiAcademy.post("/uploads/voucher", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { url: up.data?.data?.url || null, key: up.data?.data?.key || null };
}

const ESTADO_COLOR = {
  pendiente: "default",
  parcial: "orange",
  pagada: "green",
};

const CronogramaMatriculaModal = ({ open, matricula, onClose }) => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagoCuota, setPagoCuota] = useState(null);
  const [submittingPago, setSubmittingPago] = useState(false);
  const [pagoVoucherFile, setPagoVoucherFile] = useState(null);
  const [voucherCuota, setVoucherCuota] = useState(null); // cuota cuyo voucher se muestra
  const [subirVoucher, setSubirVoucher] = useState(null); // { cuota, pago } al que adjuntar voucher
  const [subirVoucherFile, setSubirVoucherFile] = useState(null);
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [pagoForm] = Form.useForm();

  const fetchCuotas = async () => {
    if (!matricula?.id) return;
    setLoading(true);
    try {
      const res = await apiAcademy.get("/cuotas", {
        params: { matricula_id: matricula.id },
      });
      setCuotas(res.data.data || []);
    } catch {
      message.error("Error al cargar cronograma");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchCuotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matricula?.id]);

  const totales = useMemo(() => {
    const esperado = cuotas.reduce((s, c) => s + Number(c.montoEsperado), 0);
    const pagado = cuotas.reduce((s, c) => s + Number(c.montoPagado), 0);
    const pct = esperado > 0 ? Math.round((pagado / esperado) * 100) : 0;
    return { esperado, pagado, saldo: esperado - pagado, pct };
  }, [cuotas]);

  const openPagoModal = (cuota) => {
    setPagoCuota(cuota);
    setPagoVoucherFile(null);
    const saldo = Number(cuota.montoEsperado) - Number(cuota.montoPagado);
    pagoForm.resetFields();
    pagoForm.setFieldsValue({
      monto: saldo > 0 ? saldo : 0,
      metodo: "efectivo",
    });
  };

  const closePagoModal = () => {
    setPagoCuota(null);
    setPagoVoucherFile(null);
    pagoForm.resetFields();
  };

  const openSubirVoucher = (cuota, pago) => {
    setSubirVoucher({ cuota, pago });
    setSubirVoucherFile(null);
  };

  const handleSubirVoucher = async () => {
    if (!subirVoucher || !subirVoucherFile || submittingVoucher) return;
    setSubmittingVoucher(true);
    try {
      const { url, key } = await subirVoucherArchivo(subirVoucherFile);
      await apiAcademy.put(`/pagos/${subirVoucher.pago.id}`, {
        imagenVoucherUrl: url,
        imagenVoucherKey: key,
      });
      message.success("Voucher adjuntado");
      setSubirVoucher(null);
      setSubirVoucherFile(null);
      fetchCuotas();
    } catch {
      message.error("Error al adjuntar voucher");
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const handlePago = async () => {
    if (submittingPago) return;
    setSubmittingPago(true);
    try {
      const values = await pagoForm.validateFields();

      let urlVoucher = null;
      let keyVoucher = null;
      if (pagoVoucherFile) {
        const subido = await subirVoucherArchivo(pagoVoucherFile);
        urlVoucher = subido.url;
        keyVoucher = subido.key;
      }

      await apiAcademy.post("/pagos", {
        matriculaId: matricula.id,
        cuotaId: pagoCuota.id,
        tipo: pagoCuota.tipo,
        metodo: values.metodo,
        monto: values.monto,
        codigoOperacion: values.codigoOperacion || null,
        imagenVoucherUrl: urlVoucher,
        imagenVoucherKey: keyVoucher,
        estado: "validado",
      });

      message.success("Pago registrado");
      closePagoModal();
      fetchCuotas();
    } catch (err) {
      message.error("Error al registrar pago");
    } finally {
      setSubmittingPago(false);
    }
  };

  const columns = [
    {
      title: "#",
      dataIndex: "numeroCuota",
      key: "numeroCuota",
      width: 50,
    },
    {
      title: "Tipo",
      key: "tipo",
      render: (_, c) =>
        c.tipo === "matricula" ? (
          <Tag color="purple">Matrícula</Tag>
        ) : (
          <Tag color="blue">
            Mensualidad{" "}
            {c.mesReferencia
              ? dayjs(c.mesReferencia).format("MMM YYYY")
              : ""}
          </Tag>
        ),
    },
    {
      title: "Vence",
      dataIndex: "fechaVencimiento",
      key: "fechaVencimiento",
      render: (v) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "Esperado",
      dataIndex: "montoEsperado",
      key: "montoEsperado",
      align: "right",
      render: (v) => `S/ ${Number(v).toFixed(2)}`,
    },
    {
      title: "Pagado",
      dataIndex: "montoPagado",
      key: "montoPagado",
      align: "right",
      render: (v) => `S/ ${Number(v).toFixed(2)}`,
    },
    {
      title: "Saldo",
      key: "saldo",
      align: "right",
      render: (_, c) =>
        `S/ ${(Number(c.montoEsperado) - Number(c.montoPagado)).toFixed(2)}`,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (e) => <Tag color={ESTADO_COLOR[e]}>{e}</Tag>,
    },
    {
      title: "Voucher",
      key: "voucher",
      width: 110,
      render: (_, c) => {
        const pagoConVoucher = (c.pagos || []).find(
          (p) => p.estado === "validado" && p.imagenVoucherUrl
        );
        if (pagoConVoucher) {
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setVoucherCuota({ cuota: c, pago: pagoConVoucher })
              }
            >
              Ver
            </Button>
          );
        }
        // Cuota ya pagada pero sin voucher adjunto → permitir subirlo
        const pagoValidado = (c.pagos || []).find(
          (p) => p.estado === "validado"
        );
        if (pagoValidado) {
          return (
            <Button
              size="small"
              icon={<UploadOutlined />}
              onClick={() => openSubirVoucher(c, pagoValidado)}
            >
              Subir
            </Button>
          );
        }
        return <span className="text-gray-400 text-xs">—</span>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 110,
      render: (_, c) =>
        c.estado !== "pagada" ? (
          <Button
            size="small"
            type="primary"
            className="bg-primary"
            onClick={() => openPagoModal(c)}
          >
            Pagar
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
  ];

  return (
    <>
      <Modal
        title={
          matricula
            ? `Cronograma — ${matricula.estudiante?.person?.nombre || ""} ${
                matricula.estudiante?.person?.apellido || ""
              } (${matricula.ciclo?.nombre || ""})`
            : "Cronograma"
        }
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>
            Cerrar
          </Button>,
        ]}
        width={1000}
        destroyOnClose
      >
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500">Total esperado</div>
            <div className="text-lg font-semibold">
              S/ {totales.esperado.toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <div className="text-xs text-green-700">Pagado</div>
            <div className="text-lg font-semibold text-green-700">
              S/ {totales.pagado.toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded">
            <div className="text-xs text-orange-700">Saldo pendiente</div>
            <div className="text-lg font-semibold text-orange-700">
              S/ {totales.saldo.toFixed(2)}
            </div>
          </div>
        </div>
        <Progress percent={totales.pct} className="mb-4" />

        <Table
          dataSource={cuotas}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
        />
      </Modal>

      <Modal
        title={
          pagoCuota
            ? `Pagar cuota #${pagoCuota.numeroCuota} — ${pagoCuota.tipo}`
            : "Pagar"
        }
        open={!!pagoCuota}
        onCancel={closePagoModal}
        onOk={handlePago}
        okText="Registrar pago"
        okButtonProps={{
          className: "bg-primary text-white",
          loading: submittingPago,
        }}
      >
        <Form layout="vertical" form={pagoForm}>
          <Form.Item
            label="Monto"
            name="monto"
            rules={[{ required: true, message: "Monto requerido" }]}
            extra={
              pagoCuota
                ? `Saldo de la cuota: S/ ${(
                    Number(pagoCuota.montoEsperado) -
                    Number(pagoCuota.montoPagado)
                  ).toFixed(2)}`
                : ""
            }
          >
            <InputNumber min={0.01} step={10} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Método"
            name="metodo"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "efectivo", label: "Efectivo" },
                { value: "yape", label: "Yape" },
                { value: "plin", label: "Plin" },
                { value: "tarjeta", label: "Tarjeta" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Código de operación" name="codigoOperacion">
            <Input />
          </Form.Item>
          <Form.Item label="Voucher">
            <VoucherPicker
              value={pagoVoucherFile}
              onChange={setPagoVoucherFile}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal preview voucher con zoom */}
      <Modal
        open={!!voucherCuota}
        onCancel={() => setVoucherCuota(null)}
        title={
          voucherCuota
            ? `Voucher cuota #${voucherCuota.cuota.numeroCuota} — ${voucherCuota.cuota.tipo}`
            : "Voucher"
        }
        footer={[
          <Button key="cerrar" onClick={() => setVoucherCuota(null)}>
            Cerrar
          </Button>,
        ]}
        width={620}
      >
        {voucherCuota?.pago?.imagenVoucherUrl ? (
          /\.pdf(\?|$)/i.test(voucherCuota.pago.imagenVoucherUrl) ? (
            <a
              href={voucherCuota.pago.imagenVoucherUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              📄 Abrir PDF en pestaña nueva
            </a>
          ) : (
            <div className="text-center">
              <Image
                src={voucherCuota.pago.imagenVoucherUrl}
                alt="Voucher"
                style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }}
                preview={{ mask: "Click para zoom" }}
              />
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <div>
                  Pagado: S/ {Number(voucherCuota.pago.monto).toFixed(2)} via{" "}
                  {voucherCuota.pago.metodo}
                </div>
                {voucherCuota.pago.codigoOperacion && (
                  <div>Código: {voucherCuota.pago.codigoOperacion}</div>
                )}
                <div>
                  Fecha: {dayjs(voucherCuota.pago.createdAt).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-gray-400 text-center py-8">Sin voucher</div>
        )}
      </Modal>

      {/* Modal subir voucher a un pago ya validado que no tenía comprobante */}
      <Modal
        title={
          subirVoucher
            ? `Subir voucher — cuota #${subirVoucher.cuota.numeroCuota} (${subirVoucher.cuota.tipo})`
            : "Subir voucher"
        }
        open={!!subirVoucher}
        onCancel={() => {
          setSubirVoucher(null);
          setSubirVoucherFile(null);
        }}
        onOk={handleSubirVoucher}
        okText="Guardar voucher"
        okButtonProps={{
          className: "bg-primary text-white",
          loading: submittingVoucher,
          disabled: !subirVoucherFile,
        }}
      >
        <p className="text-sm text-gray-600 mb-3">
          Este pago ya está registrado pero no tiene comprobante. Sube el voucher
          o toma una foto para adjuntarlo.
        </p>
        <VoucherPicker
          value={subirVoucherFile}
          onChange={setSubirVoucherFile}
        />
      </Modal>
    </>
  );
};

export default CronogramaMatriculaModal;
