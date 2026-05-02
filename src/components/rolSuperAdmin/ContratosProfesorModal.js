import React, { useEffect, useState } from "react";
import {
  Modal,
  Table,
  Button,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  message,
  Popconfirm,
  Tag,
  Space,
  Divider,
  Upload,
} from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import apiAcademy from "../auth/apiAcademy";

const TIPO_OPTIONS = [
  { value: "planilla", label: "Planilla" },
  { value: "honorarios", label: "Recibo por honorarios" },
  { value: "locacion", label: "Locación de servicios" },
];

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "finalizado", label: "Finalizado" },
  { value: "cancelado", label: "Cancelado" },
];

const MONEDA_OPTIONS = [
  { value: "PEN", label: "S/ (PEN)" },
  { value: "USD", label: "$ (USD)" },
];

const ESTADO_COLOR = {
  activo: "green",
  finalizado: "default",
  cancelado: "red",
};

const ContratosProfesorModal = ({ open, profesor, onClose }) => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  const fetchContratos = async () => {
    if (!profesor?.id) return;
    setLoading(true);
    try {
      const res = await apiAcademy.get("/contratos", {
        params: { profesor_id: profesor.id },
      });
      setContratos(res.data.data || []);
    } catch {
      message.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContratos();
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profesor?.id]);

  const resetForm = () => {
    setEditing(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({
      moneda: "PEN",
      estado: "activo",
      tipo: "planilla",
    });
  };

  const startEdit = (record) => {
    setEditing(record);
    setFileList(
      record.archivoNombre
        ? [
            {
              uid: "-existing",
              name: record.archivoNombre,
              status: "done",
            },
          ]
        : []
    );
    form.setFieldsValue({
      tipo: record.tipo,
      fechas: [
        dayjs(record.fechaInicio),
        record.fechaFin ? dayjs(record.fechaFin) : null,
      ],
      sueldoMensual: record.sueldoMensual,
      tarifaHora: record.tarifaHora,
      horasSemanales: record.horasSemanales,
      moneda: record.moneda,
      estado: record.estado,
      notas: record.notas,
    });
  };

  const buildFormData = (values, file) => {
    const fd = new FormData();
    if (!editing) fd.append("profesorId", String(profesor.id));
    fd.append("tipo", values.tipo);
    if (values.fechas?.[0])
      fd.append("fechaInicio", values.fechas[0].format("YYYY-MM-DD"));
    if (values.fechas?.[1])
      fd.append("fechaFin", values.fechas[1].format("YYYY-MM-DD"));
    if (values.sueldoMensual !== undefined && values.sueldoMensual !== null)
      fd.append("sueldoMensual", String(values.sueldoMensual));
    if (values.tarifaHora !== undefined && values.tarifaHora !== null)
      fd.append("tarifaHora", String(values.tarifaHora));
    if (values.horasSemanales !== undefined && values.horasSemanales !== null)
      fd.append("horasSemanales", String(values.horasSemanales));
    fd.append("moneda", values.moneda);
    fd.append("estado", values.estado);
    if (values.notas) fd.append("notas", values.notas);
    if (file) fd.append("archivo", file);
    return fd;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Solo subir si el primer archivo es nuevo (tiene originFileObj)
      const newFile = fileList[0]?.originFileObj || null;
      const fd = buildFormData(values, newFile);

      if (editing) {
        await apiAcademy.put(`/contratos/${editing.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        message.success("Contrato actualizado");
      } else {
        await apiAcademy.post("/contratos", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        message.success("Contrato creado");
      }
      resetForm();
      fetchContratos();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar contrato";
      message.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/contratos/${id}`);
      message.success("Contrato eliminado");
      fetchContratos();
    } catch {
      message.error("Error al eliminar");
    }
  };

  const handleDownload = async (record) => {
    try {
      const res = await apiAcademy.get(`/contratos/${record.id}/archivo`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = record.archivoNombre || `contrato_${record.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("No se pudo descargar el archivo");
    }
  };

  const formatMoney = (val, moneda) => {
    if (val === null || val === undefined) return "-";
    const symbol = moneda === "USD" ? "$" : "S/";
    return `${symbol} ${Number(val).toFixed(2)}`;
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      render: (t) =>
        TIPO_OPTIONS.find((o) => o.value === t)?.label || t,
    },
    {
      title: "Vigencia",
      key: "vigencia",
      render: (_, r) =>
        `${dayjs(r.fechaInicio).format("DD/MM/YYYY")} → ${
          r.fechaFin ? dayjs(r.fechaFin).format("DD/MM/YYYY") : "indefinido"
        }`,
    },
    {
      title: "Sueldo / Tarifa",
      key: "monto",
      render: (_, r) => (
        <div className="text-xs">
          {r.sueldoMensual && (
            <div>Mensual: {formatMoney(r.sueldoMensual, r.moneda)}</div>
          )}
          {r.tarifaHora && (
            <div>Hora: {formatMoney(r.tarifaHora, r.moneda)}</div>
          )}
          {r.horasSemanales && <div>{r.horasSemanales} h/sem</div>}
        </div>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (e) => (
        <Tag color={ESTADO_COLOR[e] || "default"}>{e}</Tag>
      ),
      width: 100,
    },
    {
      title: "Archivo",
      key: "archivo",
      render: (_, r) =>
        r.archivoNombre ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(r)}
          >
            {r.archivoNombre.length > 18
              ? r.archivoNombre.slice(0, 16) + "…"
              : r.archivoNombre}
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">Sin archivo</span>
        ),
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
            title="¿Eliminar este contrato?"
            description="También se borrará el archivo asociado."
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

  return (
    <Modal
      title={
        profesor
          ? `Contratos — ${profesor.person?.nombre || ""} ${
              profesor.person?.apellido || ""
            }`
          : "Contratos"
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={1100}
      destroyOnClose
    >
      <Table
        dataSource={contratos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
      />

      <Divider>{editing ? "Editar contrato" : "Nuevo contrato"}</Divider>

      <Form layout="vertical" form={form}>
        <div className="grid grid-cols-3 gap-x-4">
          <Form.Item
            label="Tipo"
            name="tipo"
            rules={[{ required: true, message: "Tipo requerido" }]}
          >
            <Select options={TIPO_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="Vigencia (inicio - fin)"
            name="fechas"
            rules={[
              {
                validator: (_, val) => {
                  if (!val || !val[0]) return Promise.reject("Fecha inicio requerida");
                  return Promise.resolve();
                },
              },
            ]}
          >
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              className="w-full"
              allowEmpty={[false, true]}
              placeholder={["Inicio", "Fin (opcional)"]}
            />
          </Form.Item>
          <Form.Item
            label="Estado"
            name="estado"
            rules={[{ required: true }]}
          >
            <Select options={ESTADO_OPTIONS} />
          </Form.Item>
          <Form.Item label="Sueldo mensual" name="sueldoMensual">
            <InputNumber min={0} step={50} className="w-full" />
          </Form.Item>
          <Form.Item label="Tarifa por hora" name="tarifaHora">
            <InputNumber min={0} step={5} className="w-full" />
          </Form.Item>
          <Form.Item label="Horas semanales" name="horasSemanales">
            <InputNumber min={0} max={60} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Moneda"
            name="moneda"
            rules={[{ required: true }]}
          >
            <Select options={MONEDA_OPTIONS} />
          </Form.Item>
          <Form.Item label="Archivo (PDF, imagen, doc)" className="col-span-2">
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
            </Upload>
          </Form.Item>
        </div>
        <Form.Item label="Notas" name="notas">
          <Input.TextArea rows={2} />
        </Form.Item>
        <div className="flex gap-2 justify-end">
          {editing && <Button onClick={resetForm}>Cancelar edición</Button>}
          <Button
            type="primary"
            className="bg-primary"
            onClick={handleSubmit}
          >
            {editing ? "Guardar cambios" : "Crear contrato"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ContratosProfesorModal;
