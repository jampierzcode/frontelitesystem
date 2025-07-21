import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  message,
  Popconfirm,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

export default function Ciclos() {
  const [ciclos, setCiclos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState(null);

  const [form] = Form.useForm();

  const fetchCiclos = async () => {
    try {
      const res = await apiAcademy.get("/ciclos");
      setCiclos(res.data.data);
    } catch (err) {
      message.error("Error al obtener ciclos");
    }
  };

  useEffect(() => {
    fetchCiclos();
  }, []);

  const openModal = (ciclo = null) => {
    setEditingCiclo(ciclo);
    if (ciclo) {
      form.setFieldsValue({
        ...ciclo,
        fechaInicio: dayjs(ciclo.fechaInicio),
        fechaFin: dayjs(ciclo.fechaFin),
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.fechaInicio = values.fechaInicio.format("YYYY-MM-DD");
      values.fechaFin = values.fechaFin.format("YYYY-MM-DD");

      if (editingCiclo) {
        await apiAcademy.put(`/ciclos/${editingCiclo.id}`, values);
        message.success("Ciclo actualizado");
      } else {
        await apiAcademy.post("/ciclos", values);
        message.success("Ciclo creado");
      }

      setIsModalOpen(false);
      fetchCiclos();
    } catch (err) {
      message.error("Error al guardar ciclo");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/ciclos/${id}`);
      message.success("Ciclo eliminado");
      fetchCiclos();
    } catch (err) {
      message.error("Error al eliminar ciclo");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Gestión de Ciclos</h2>
        <Button type="primary" onClick={() => openModal()}>
          Nuevo Ciclo
        </Button>
      </div>

      <Table
        dataSource={ciclos}
        rowKey="id"
        columns={[
          { title: "Nombre", dataIndex: "nombre" },
          { title: "Fecha Inicio", dataIndex: "fechaInicio" },
          { title: "Fecha Fin", dataIndex: "fechaFin" },
          { title: "Estado", dataIndex: "status" },
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
        title={editingCiclo ? "Editar Ciclo" : "Nuevo Ciclo"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: "Ingrese un nombre" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Fecha de Inicio"
            name="fechaInicio"
            rules={[{ required: true, message: "Seleccione fecha de inicio" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            label="Fecha de Fin"
            name="fechaFin"
            rules={[{ required: true, message: "Seleccione fecha de fin" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            label="Estado"
            name="status"
            rules={[{ required: true, message: "Seleccione estado" }]}
          >
            <Select>
              <Option value="1">Activo</Option>
              <Option value="0">Inactivo</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
