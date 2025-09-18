// src/pages/Personas.js
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
  notification,
} from "antd";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

const Personas = () => {
  const [personas, setPersonas] = useState([]);
  const [filteredPersonas, setFilteredPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [sedes, setSedes] = useState([]);

  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/persons");
      // tu API devuelve res.data.data
      const data = res.data.data || [];
      setPersonas(data);
      setFilteredPersonas(data);
    } catch (error) {
      notification.error({ message: "Error al cargar personas" });
    }
    setLoading(false);
  };

  const fetchSedes = async () => {
    try {
      const res = await apiAcademy.get("/sedes");
      setSedes(res.data.data || []);
    } catch (err) {
      // no crítico
    }
  };

  useEffect(() => {
    fetchPersonas();
    fetchSedes();
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
    // map fields to form keys (person tiene sede_id)
    form.setFieldsValue({
      dni: person.dni,
      nombre: person.nombre,
      apellido: person.apellido,
      whatsapp: person.whatsapp,
      email: person.email,
      tipo: person.tipo,
      sedeId: person.sedeId || null,
    });
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

      if (isEdit && currentPerson) {
        await apiAcademy.put(`/persons/${currentPerson.id}`, values);
        notification.success({ message: "Persona actualizada" });
      } else {
        await apiAcademy.post("/persons", values);
        notification.success({ message: "Persona creada" });
      }

      setIsModalOpen(false);
      fetchPersonas();
    } catch (error) {
      notification.error({ message: "Error al guardar persona" });
    }
  };

  // filtros externos
  const handleFilter = () => {
    const values = filterForm.getFieldsValue();
    let data = [...personas];

    if (values.nombre) {
      data = data.filter((p) =>
        `${p.nombre} ${p.apellido}`
          .toLowerCase()
          .includes(values.nombre.toLowerCase())
      );
    }
    if (values.dni) {
      data = data.filter((p) => (p.dni || "").includes(values.dni));
    }
    if (values.tipo) {
      data = data.filter((p) => p.tipo === values.tipo);
    }
    setFilteredPersonas(data);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setFilteredPersonas(personas);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (_, record) => (
        <div>
          <div className="font-semibold">
            {record.nombre} {record.apellido}
          </div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    { title: "DNI", dataIndex: "dni", key: "dni" },
    { title: "WhatsApp", dataIndex: "whatsapp", key: "whatsapp" },
    { title: "Tipo", dataIndex: "tipo", key: "tipo" },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            className="bg-primary text-white"
            onClick={() => openEditModal(record)}
          >
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
      width: 180,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestión de Personas</h2>
        <Button className="bg-primary text-white" onClick={openCreateModal}>
          Crear Persona
        </Button>
      </div>

      <Form
        form={filterForm}
        layout="inline"
        className="mb-4 flex flex-wrap gap-2"
      >
        <Form.Item name="nombre">
          <Input placeholder="Buscar por nombre o apellido" allowClear />
        </Form.Item>
        <Form.Item name="dni">
          <Input placeholder="Buscar por DNI" allowClear />
        </Form.Item>
        <Form.Item name="tipo">
          <Select
            placeholder="Filtrar por tipo"
            allowClear
            style={{ width: 180 }}
          >
            <Option value="estudiante">Estudiante</Option>
            <Option value="profesor">Profesor</Option>
            <Option value="secretaria">Secretaria</Option>
            <Option value="admin">Admin</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button className="bg-primary text-white" onClick={handleFilter}>
            Filtrar
          </Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={handleClearFilters}>Limpiar</Button>
        </Form.Item>
      </Form>

      <Table
        className="rounded-lg"
        dataSource={filteredPersonas}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={isEdit ? "Editar Persona" : "Crear Persona"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="DNI" name="dni">
            <Input />
          </Form.Item>

          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Apellido" name="apellido">
            <Input />
          </Form.Item>

          <Form.Item
            label="WhatsApp"
            name="whatsapp"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>

          <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}>
            <Select placeholder="Selecciona un tipo">
              <Option value="estudiante">Estudiante</Option>
              <Option value="profesor">Profesor</Option>
              <Option value="secretaria">Secretaria</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Sede" name="sedeId">
            <Select allowClear placeholder="Selecciona sede">
              {sedes.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.nameReferential}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Personas;
