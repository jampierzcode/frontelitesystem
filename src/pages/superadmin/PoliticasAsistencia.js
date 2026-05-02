import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
} from "antd";
import apiAcademy from "../../components/auth/apiAcademy";

export default function PoliticasAsistencia() {
  const [items, setItems] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pol, sed] = await Promise.all([
        apiAcademy.get("/politicas-asistencia"),
        apiAcademy.get("/sedes"),
      ]);
      setItems(pol.data.data || []);
      setSedes(sed.data.data || []);
    } catch {
      message.error("Error al cargar políticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCrear = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      toleranciaMinutosTardanza: 15,
      permiteMarcarFueraHorario: false,
    });
    setOpen(true);
  };

  const openEditar = (record) => {
    setEditing(record);
    form.setFieldsValue({
      sedeId: record.sedeId,
      toleranciaMinutosTardanza: record.toleranciaMinutosTardanza,
      permiteMarcarFueraHorario: !!record.permiteMarcarFueraHorario,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        sedeId: v.sedeId || null,
        toleranciaMinutosTardanza: v.toleranciaMinutosTardanza,
        permiteMarcarFueraHorario: !!v.permiteMarcarFueraHorario,
      };
      if (editing) {
        await apiAcademy.put(`/politicas-asistencia/${editing.id}`, payload);
        message.success("Política actualizada");
      } else {
        await apiAcademy.post("/politicas-asistencia", payload);
        message.success("Política creada");
      }
      setOpen(false);
      fetchAll();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Error al guardar (¿ya existe una?)";
      message.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/politicas-asistencia/${id}`);
      message.success("Política eliminada");
      fetchAll();
    } catch {
      message.error("Error al eliminar");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    {
      title: "Sede",
      key: "sede",
      render: (_, r) =>
        r.sede ? r.sede.name_referential : <Tag>Global</Tag>,
    },
    {
      title: "Tolerancia tardanza (min)",
      dataIndex: "toleranciaMinutosTardanza",
    },
    {
      title: "Permite fuera de horario",
      dataIndex: "permiteMarcarFueraHorario",
      render: (v) => (v ? <Tag color="orange">Sí</Tag> : <Tag>No</Tag>),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEditar(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar esta política?"
            onConfirm={() => handleDelete(r.id)}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </div>
      ),
      width: 200,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Políticas de asistencia</h2>
          <p className="text-sm text-gray-500">
            Configura tolerancia de tardanza y si se permite marcar asistencia
            fuera del horario operativo. Una política por sede (o una global
            sin sede).
          </p>
        </div>
        <Button className="bg-primary text-white" onClick={openCrear}>
          Nueva política
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

      <Modal
        title={editing ? "Editar política" : "Nueva política"}
        open={open}
        onOk={handleSave}
        onCancel={() => setOpen(false)}
        okButtonProps={{ className: "bg-primary text-white" }}
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Sede (vacío = política global)"
            name="sedeId"
            extra="Si no eliges sede, esta política aplica como fallback global"
          >
            <Select
              allowClear
              placeholder="Global / todas las sedes"
              options={sedes.map((s) => ({
                value: s.id,
                label: s.name_referential || s.nameReferential,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Tolerancia de tardanza (minutos)"
            name="toleranciaMinutosTardanza"
            rules={[{ required: true, message: "Requerido" }]}
            extra="Minutos después del inicio del horario para considerar tardanza"
          >
            <InputNumber min={0} max={120} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Permitir marcar fuera del horario"
            name="permiteMarcarFueraHorario"
            valuePropName="checked"
            extra="Si está activo, se puede registrar asistencia aunque la academia esté cerrada"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
