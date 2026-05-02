import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  TimePicker,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Tag,
} from "antd";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

export default function Turnos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/turnos");
      setItems(res.data.data || []);
    } catch {
      message.error("Error al cargar turnos");
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
    form.setFieldsValue({ activo: true, orden: items.length });
    setOpen(true);
  };

  const openEditar = (record) => {
    setEditing(record);
    form.setFieldsValue({
      nombre: record.nombre,
      horario: [
        record.horaInicio ? dayjs(record.horaInicio, "HH:mm:ss") : null,
        record.horaFin ? dayjs(record.horaFin, "HH:mm:ss") : null,
      ],
      activo: !!record.activo,
      orden: record.orden,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const payload = {
        nombre: v.nombre,
        horaInicio: v.horario?.[0]?.format("HH:mm:ss"),
        horaFin: v.horario?.[1]?.format("HH:mm:ss"),
        activo: !!v.activo,
        orden: Number(v.orden) || 0,
      };
      if (editing) {
        await apiAcademy.put(`/turnos/${editing.id}`, payload);
      } else {
        await apiAcademy.post("/turnos", payload);
      }
      message.success("Turno guardado");
      setOpen(false);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar";
      if (!err?.errorFields) message.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/turnos/${id}`);
      message.success("Turno eliminado");
      fetchData();
    } catch {
      message.error("No se pudo eliminar (posiblemente tiene matrículas asociadas)");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Nombre", dataIndex: "nombre" },
    {
      title: "Hora inicio",
      dataIndex: "horaInicio",
      render: (v) => v?.slice(0, 5),
    },
    {
      title: "Hora fin",
      dataIndex: "horaFin",
      render: (v) => v?.slice(0, 5),
    },
    {
      title: "Activo",
      dataIndex: "activo",
      render: (v) => (v ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
    },
    { title: "Orden", dataIndex: "orden" },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEditar(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar turno?"
            onConfirm={() => handleDelete(r.id)}
          >
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
          <h2 className="text-xl font-bold">Turnos</h2>
          <p className="text-sm text-gray-500">
            Define los horarios en los que opera la academia. Cada matrícula
            elige uno de los turnos activos.
          </p>
        </div>
        <Button type="primary" className="bg-primary" onClick={openCrear}>
          Nuevo turno
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
        open={open}
        title={editing ? "Editar turno" : "Nuevo turno"}
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
            <Input placeholder="MAÑANA, TARDE, NOCHE..." maxLength={50} />
          </Form.Item>
          <Form.Item
            label="Horario (inicio - fin)"
            name="horario"
            rules={[
              {
                validator: (_, val) => {
                  if (!val || !val[0] || !val[1])
                    return Promise.reject("Selecciona horario");
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
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Orden" name="orden">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
