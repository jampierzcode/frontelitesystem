import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from "antd";
import axios from "axios";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

const Personas = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(null);

  const [form] = Form.useForm();

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/persons");
      setPersonas(res.data.data);
    } catch (error) {
      message.error("Error al cargar personas");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const openCreateModal = () => {
    setIsEdit(false);
    setCurrentPerson(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (person) => {
    setIsEdit(true);
    setCurrentPerson(person);
    form.setFieldsValue(person);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/persons/${id}`);
      message.success("Persona eliminada correctamente");
      fetchPersonas();
    } catch (error) {
      message.error("Error al eliminar persona");
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (isEdit) {
        await apiAcademy.put(`/persons/${currentPerson.id}`, values);
        message.success("Persona actualizada");
      } else {
        await apiAcademy.post("/persons", values);
        message.success("Persona creada");
      }

      setIsModalOpen(false);
      fetchPersonas();
    } catch (error) {
      message.error("Error al guardar persona");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "DNI", dataIndex: "dni", key: "dni" },
    { title: "Nombre", dataIndex: "nombre", key: "nombre" },
    { title: "Apellido", dataIndex: "apellido", key: "apellido" },
    { title: "WhatsApp", dataIndex: "whatsapp", key: "whatsapp" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Tipo", dataIndex: "tipo", key: "tipo" },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Seguro que quieres eliminar?"
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
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Gestión de Personas</h2>
      <Button type="primary" onClick={openCreateModal} className="mb-4">
        Crear Persona
      </Button>

      <Table
        dataSource={personas}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={isEdit ? "Editar Persona" : "Crear Persona"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="DNI" name="dni">
            <Input />
          </Form.Item>

          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Campo requerido" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Apellido" name="apellido">
            <Input />
          </Form.Item>

          <Form.Item
            label="WhatsApp"
            name="whatsapp"
            rules={[{ required: true, message: "Campo requerido" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>

          <Form.Item
            label="Tipo"
            name="tipo"
            rules={[{ required: true, message: "Campo requerido" }]}
          >
            <Select placeholder="Selecciona un tipo">
              <Option value="estudiante">Estudiante</Option>
              <Option value="profesor">Profesor</Option>
              <Option value="secretaria">Secretaria</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Personas;
