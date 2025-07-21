import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Popconfirm,
} from "antd";
import axios from "axios";
import apiAcademy from "../auth/apiAcademy";

export default function ConfiguracionPagos() {
  const [costos, setCostos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCosto, setEditingCosto] = useState(null);

  const [form] = Form.useForm();

  const fetchCostos = async () => {
    try {
      const res = await apiAcademy.get("/costos-pagos");
      setCostos(res.data.data);
    } catch (err) {
      message.error("Error al obtener los costos de pago");
    }
  };

  useEffect(() => {
    fetchCostos();
  }, []);

  const openModal = (costo = null) => {
    setEditingCosto(costo);
    if (costo) {
      form.setFieldsValue(costo);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingCosto) {
        await apiAcademy.put(`/costos-pagos/${editingCosto.id}`, values);
        message.success("Costo actualizado");
      } else {
        await apiAcademy.post("/costos-pagos", values);
        message.success("Costo creado");
      }

      setIsModalOpen(false);
      fetchCostos();
    } catch (err) {
      message.error("Error al guardar el costo");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/costos-pagos/${id}`);
      message.success("Costo eliminado");
      fetchCostos();
    } catch (err) {
      message.error("Error al eliminar el costo");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Configuración de Costos de Pago
        </h2>
        <Button type="primary" onClick={() => openModal()}>
          Nuevo Costo
        </Button>
      </div>

      <Table
        dataSource={costos}
        rowKey="id"
        columns={[
          { title: "Nombre", dataIndex: "nombre" },
          {
            title: "Precio (S/)",
            dataIndex: "precio",
            render: (precio) => `S/ ${precio}`,
          },
          {
            title: "Acciones",
            render: (_, record) => (
              <div className="flex gap-2">
                <Button size="small" onClick={() => openModal(record)}>
                  Editar
                </Button>
                <Popconfirm
                  title="¿Seguro que deseas eliminar?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button size="small" danger>
                    Eliminar
                  </Button>
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingCosto ? "Editar Costo" : "Nuevo Costo"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nombre del Costo"
            name="nombre"
            rules={[{ required: true, message: "Ingrese un nombre" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Precio (S/)"
            name="precio"
            rules={[{ required: true, message: "Ingrese un precio" }]}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
