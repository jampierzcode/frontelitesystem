import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Tag,
} from "antd";
import apiAcademy from "../../components/auth/apiAcademy";

const Cursos = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form] = Form.useForm();

  const fetchCursos = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/cursos");
      setCursos(res.data.data || []);
    } catch (err) {
      message.error("Error al cargar cursos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  const openCreate = () => {
    setIsEdit(false);
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setIsEdit(true);
    setCurrent(record);
    form.setFieldsValue({
      nombre: record.nombre,
      descripcion: record.descripcion,
      activo: !!record.activo,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && current) {
        await apiAcademy.put(`/cursos/${current.id}`, values);
        message.success("Curso actualizado");
      } else {
        await apiAcademy.post("/cursos", values);
        message.success("Curso creado");
      }
      setIsModalOpen(false);
      fetchCursos();
    } catch (err) {
      message.error("Error al guardar curso");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/cursos/${id}`);
      message.success("Curso eliminado");
      fetchCursos();
    } catch (err) {
      message.error("Error al eliminar curso");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "Nombre", dataIndex: "nombre", key: "nombre" },
    { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      width: 90,
      render: (v) =>
        v ? <Tag color="green">Sí</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            className="bg-primary text-white"
            onClick={() => openEdit(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar este curso?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button danger size="small">
              Eliminar
            </Button>
          </Popconfirm>
        </div>
      ),
      width: 220,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Cursos</h2>
        <Button className="bg-primary text-white" onClick={openCreate}>
          Crear Curso
        </Button>
      </div>

      <Table
        dataSource={Array.isArray(cursos) ? cursos : []}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={isEdit ? "Editar Curso" : "Crear Curso"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Nombre requerido" }]}
          >
            <Input placeholder="Matemáticas, Lenguaje, RV..." />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Cursos;
