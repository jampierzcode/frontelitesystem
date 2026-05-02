import React, { useState } from "react";
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Tag,
  Divider,
  Space,
} from "antd";

const PARENTESCO_OPTIONS = [
  { value: "Madre", label: "Madre" },
  { value: "Padre", label: "Padre" },
  { value: "Tutor", label: "Tutor" },
  { value: "Hermano/a", label: "Hermano/a" },
  { value: "Tío/a", label: "Tío/a" },
  { value: "Abuelo/a", label: "Abuelo/a" },
  { value: "Otro", label: "Otro" },
];

/**
 * Maneja la lista de apoderados de un estudiante.
 * Controlled component: recibe `value` (array) y `onChange` con la lista actualizada.
 *
 * Cada item: { apoderadoId?, dni, nombre, apellido, whatsapp, email, parentesco, esPrincipal }
 * - Si trae apoderadoId, el backend reusará ese apoderado.
 * - Si no, lo crea nuevo.
 */
const ApoderadosManager = ({ value = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [form] = Form.useForm();

  const reset = () => {
    setEditingIndex(null);
    form.resetFields();
    form.setFieldsValue({ esPrincipal: false });
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    form.setFieldsValue(value[idx]);
  };

  const handleSubmit = async () => {
    try {
      const v = await form.validateFields();
      let next = [...value];

      if (editingIndex !== null) {
        next[editingIndex] = { ...next[editingIndex], ...v };
      } else {
        next.push(v);
      }

      // Si es_principal=true en este, todos los demás pasan a false
      if (v.esPrincipal) {
        next = next.map((a, i) => ({
          ...a,
          esPrincipal:
            i === (editingIndex !== null ? editingIndex : next.length - 1),
        }));
      }

      onChange?.(next);
      reset();
    } catch {
      // validación falló
    }
  };

  const handleRemove = (idx) => {
    const next = value.filter((_, i) => i !== idx);
    onChange?.(next);
    if (editingIndex === idx) reset();
  };

  const columns = [
    {
      title: "Nombre",
      key: "nombre",
      render: (_, r) =>
        `${r.nombre || ""} ${r.apellido || ""}`.trim() || "—",
    },
    { title: "DNI", dataIndex: "dni", key: "dni", render: (v) => v || "—" },
    { title: "WhatsApp", dataIndex: "whatsapp", key: "whatsapp" },
    {
      title: "Parentesco",
      dataIndex: "parentesco",
      key: "parentesco",
      render: (v) => v || "—",
    },
    {
      title: "Principal",
      dataIndex: "esPrincipal",
      key: "esPrincipal",
      width: 90,
      render: (v) => (v ? <Tag color="gold">Principal</Tag> : null),
    },
    {
      title: "",
      key: "acciones",
      width: 140,
      render: (_, r, idx) => (
        <Space>
          <Button size="small" onClick={() => startEdit(idx)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Quitar este apoderado?"
            onConfirm={() => handleRemove(idx)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger>
              Quitar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={value}
        columns={columns}
        rowKey={(_, idx) => `apo-${idx}`}
        pagination={false}
        size="small"
        locale={{ emptyText: "Sin apoderados — agrega uno abajo" }}
      />

      <Divider plain>
        {editingIndex !== null ? "Editar apoderado" : "Agregar apoderado"}
      </Divider>

      <Form layout="vertical" form={form} initialValues={{ esPrincipal: false }}>
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Nombre requerido" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Apellido" name="apellido">
            <Input />
          </Form.Item>
          <Form.Item
            label="WhatsApp"
            name="whatsapp"
            rules={[{ required: true, message: "WhatsApp requerido" }]}
          >
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item label="DNI" name="dni">
            <Input maxLength={15} />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input type="email" />
          </Form.Item>
          <Form.Item label="Parentesco" name="parentesco">
            <Select allowClear options={PARENTESCO_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="Principal"
            name="esPrincipal"
            valuePropName="checked"
            extra="A quién contactar primero"
          >
            <Switch />
          </Form.Item>
        </div>
        <div className="flex gap-2 justify-end">
          {editingIndex !== null && (
            <Button onClick={reset}>Cancelar edición</Button>
          )}
          <Button type="primary" className="bg-primary" onClick={handleSubmit}>
            {editingIndex !== null ? "Guardar cambios" : "Agregar a la lista"}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ApoderadosManager;
