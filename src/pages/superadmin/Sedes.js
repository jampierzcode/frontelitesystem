// src/pages/Sedes.js
import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, message, Popconfirm } from "antd";
import apiAcademy from "../../components/auth/apiAcademy";

const Sedes = () => {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form] = Form.useForm();

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/sedes");
      // Asumimos formato res.data.data
      setSedes(res.data.data || []);
    } catch (err) {
      message.error("Error al cargar sedes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const openCreate = () => {
    setIsEdit(false);
    setCurrent(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setIsEdit(true);
    setCurrent(record);
    form.setFieldsValue({
      name_referential: record.name_referential,
      direction: record.direction,
      department: record.department,
      province: record.province,
      district: record.district,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && current) {
        await apiAcademy.put(`/sedes/${current.id}`, values);
        message.success("Sede actualizada");
      } else {
        await apiAcademy.post("/sedes", values);
        message.success("Sede creada");
      }
      setIsModalOpen(false);
      fetchSedes();
    } catch (err) {
      message.error("Error al guardar sede");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/sedes/${id}`);
      message.success("Sede eliminada");
      fetchSedes();
    } catch (err) {
      message.error("Error al eliminar sede");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "Nombre", dataIndex: "nameReferential", key: "nameReferential" },
    { title: "Dirección", dataIndex: "direction", key: "direction" },
    { title: "Departamento", dataIndex: "department", key: "department" },
    { title: "Provincia", dataIndex: "province", key: "province" },
    { title: "Distrito", dataIndex: "district", key: "district" },
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
            title="¿Estás seguro de eliminar esta sede?"
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
        <h2 className="text-xl font-bold">Sedes</h2>
        <Button className="bg-primary text-white" onClick={openCreate}>
          Crear Sede
        </Button>
      </div>

      <Table
        dataSource={Array.isArray(sedes) ? sedes : []}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={isEdit ? "Editar Sede" : "Crear Sede"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Nombre"
            name="name_referential"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Dirección"
            name="direction"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Departamento" name="department">
            <Input />
          </Form.Item>
          <Form.Item label="Provincia" name="province">
            <Input />
          </Form.Item>
          <Form.Item label="Distrito" name="district">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Sedes;
