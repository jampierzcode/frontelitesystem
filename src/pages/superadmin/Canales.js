import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Space,
} from "antd";
import apiAcademy from "../../components/auth/apiAcademy";

export default function Canales() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // Modal de carreras
  const [carreraOpen, setCarreraOpen] = useState(false);
  const [canalActivo, setCanalActivo] = useState(null);
  const [carreraForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/canales");
      setItems(res.data.data || []);
    } catch {
      message.error("Error al cargar canales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCrear = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ activo: true, orden: items.length + 1, color: "#2563eb" });
    setOpen(true);
  };

  const openEditar = (record) => {
    setEditing(record);
    form.setFieldsValue({
      nombre: record.nombre,
      area: record.area,
      descripcion: record.descripcion,
      color: record.color,
      activo: !!record.activo,
      orden: record.orden,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = { ...v, activo: !!v.activo, orden: Number(v.orden) || 0 };
      if (editing) await apiAcademy.put(`/canales/${editing.id}`, payload);
      else await apiAcademy.post("/canales", payload);
      message.success("Canal guardado");
      setOpen(false);
      fetchData();
    } catch (err) {
      if (!err?.errorFields)
        message.error(err?.response?.data?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/canales/${id}`);
      message.success("Canal eliminado");
      fetchData();
    } catch {
      message.error("No se pudo eliminar el canal");
    }
  };

  // ---- Carreras ----
  const abrirCarreras = (canal) => {
    setCanalActivo(canal);
    carreraForm.resetFields();
    setCarreraOpen(true);
  };

  const agregarCarrera = async () => {
    try {
      const v = await carreraForm.validateFields();
      await apiAcademy.post("/carreras", {
        nombre: v.nombre,
        canalId: canalActivo.id,
        activo: true,
      });
      carreraForm.resetFields();
      message.success("Carrera agregada");
      await fetchData();
      // refrescar canalActivo con datos nuevos
      const res = await apiAcademy.get("/canales");
      const fresh = (res.data.data || []).find((c) => c.id === canalActivo.id);
      setCanalActivo(fresh);
      setItems(res.data.data || []);
    } catch (err) {
      if (!err?.errorFields)
        message.error(err?.response?.data?.message || "Error al agregar carrera");
    }
  };

  const eliminarCarrera = async (id) => {
    try {
      await apiAcademy.delete(`/carreras/${id}`);
      const res = await apiAcademy.get("/canales");
      const fresh = (res.data.data || []).find((c) => c.id === canalActivo.id);
      setCanalActivo(fresh);
      setItems(res.data.data || []);
      message.success("Carrera eliminada");
    } catch {
      message.error("No se pudo eliminar la carrera");
    }
  };

  const columns = [
    { title: "Orden", dataIndex: "orden", width: 70 },
    {
      title: "Canal",
      dataIndex: "nombre",
      render: (v, r) => (
        <Space>
          <span
            style={{
              background: r.color || "#999",
              width: 12,
              height: 12,
              borderRadius: 99,
              display: "inline-block",
            }}
          />
          <b>{v}</b>
        </Space>
      ),
    },
    { title: "Área", dataIndex: "area" },
    {
      title: "Carreras",
      key: "carreras",
      render: (_, r) => (
        <Button size="small" onClick={() => abrirCarreras(r)}>
          {r.carreras?.length || 0} carreras
        </Button>
      ),
      width: 130,
    },
    {
      title: "Activo",
      dataIndex: "activo",
      render: (v) => (v ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
      width: 90,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEditar(r)}>
            Editar
          </Button>
          <Popconfirm title="¿Eliminar canal?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </div>
      ),
      width: 180,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Canales</h2>
          <p className="text-sm text-gray-500">
            Agrupan a los estudiantes por área/carrera. El horario de clases se
            arma por canal. Cada carrera pertenece a un canal.
          </p>
        </div>
        <Button type="primary" className="bg-primary" onClick={openCrear}>
          Nuevo canal
        </Button>
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      {/* Modal canal */}
      <Modal
        open={open}
        title={editing ? "Editar canal" : "Nuevo canal"}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        okButtonProps={{ className: "bg-primary text-white" }}
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Nombre requerido" }]}
          >
            <Input placeholder="Canal 1, Canal 2..." />
          </Form.Item>
          <Form.Item label="Área" name="area">
            <Input placeholder="Ciencias de la Salud / Biomédicas" />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Input type="color" style={{ width: 60, padding: 2 }} />
          </Form.Item>
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Orden" name="orden">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal carreras */}
      <Modal
        open={carreraOpen}
        title={`Carreras de ${canalActivo?.nombre || ""}`}
        onCancel={() => setCarreraOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="inline" form={carreraForm} className="mb-3">
          <Form.Item
            name="nombre"
            rules={[{ required: true, message: "Nombre" }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Nombre de la carrera" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" className="bg-primary" onClick={agregarCarrera}>
              Agregar
            </Button>
          </Form.Item>
        </Form>
        <ul className="divide-y">
          {(canalActivo?.carreras || []).map((c) => (
            <li key={c.id} className="flex justify-between items-center py-2">
              <span>{c.nombre}</span>
              <Popconfirm
                title="¿Eliminar carrera?"
                onConfirm={() => eliminarCarrera(c.id)}
              >
                <Button size="small" danger>
                  Eliminar
                </Button>
              </Popconfirm>
            </li>
          ))}
          {(canalActivo?.carreras || []).length === 0 && (
            <li className="py-2 text-gray-400 text-sm">Sin carreras aún.</li>
          )}
        </ul>
      </Modal>
    </div>
  );
}
