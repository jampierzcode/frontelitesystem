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
  Upload,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import axios from "axios";
import apiAcademy from "../../components/auth/apiAcademy";

const { Option } = Select;

const Matriculas = () => {
  const [matriculas, setMatriculas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [pagoForm] = Form.useForm();

  const [currentMatricula, setCurrentMatricula] = useState(null);
  const [selectedModalidad, setSelectedModalidad] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, pers, ciclosRes, costosRes] = await Promise.all([
        apiAcademy.get("/matriculas"),
        apiAcademy.get("/persons"),
        apiAcademy.get("/ciclos"),
        apiAcademy.get("/costos-pagos"),
      ]);

      setMatriculas(mats.data.data);
      setPersonas(pers.data.data.filter((p) => p.tipo === "estudiante"));
      setCiclos(ciclosRes.data.data.filter((c) => c.status === 1));
      setCostos(costosRes.data.data);
    } catch (error) {
      message.error("Error al cargar datos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    form.resetFields();
    setSelectedModalidad(null);
    setIsModalOpen(true);
  };

  const handleModalidadChange = (value) => {
    setSelectedModalidad(value);

    const matriculaCosto = costos.find(
      (c) =>
        c.nombre.toLowerCase().includes("matricula") &&
        c.nombre.toLowerCase().includes(value)
    );
    const mensualidadCosto = costos.find(
      (c) =>
        c.nombre.toLowerCase().includes("mensualidad") &&
        c.nombre.toLowerCase().includes(value)
    );

    form.setFieldsValue({
      precio_matricula: matriculaCosto?.precio || 0,
      precio_mensualidad: mensualidadCosto?.precio || 0,
    });
  };

  const handleCreateMatricula = async () => {
    try {
      const values = await form.validateFields();

      // Primero actualizar o crear estudiante si no existe
      const data_estudiante = await apiAcademy.post("/estudiantes", {
        personId: values.person_id,
        nombreApoderado: values.nombre_apoderado,
        numeroApoderado: values.numero_apoderado,
      });
      console.log(data_estudiante);

      // Crear matricula
      await apiAcademy.post("/matriculas", {
        estudianteId: data_estudiante.data.data.id,
        cicloId: values.ciclo_id,
        modalidad: values.modalidad,
        turno: values.turno,
        precioMatricula: values.precio_matricula,
        precioMensualidad: values.precio_mensualidad,
        estado: "pendiente",
      });

      message.success("Matrícula creada");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      message.error("Error al crear matrícula");
    }
  };

  const openPagoModal = (matricula) => {
    setCurrentMatricula(matricula);
    pagoForm.resetFields();
    setIsPagoModalOpen(true);
  };

  const handlePago = async () => {
    try {
      const values = await pagoForm.validateFields();

      const formData = new FormData();
      formData.append("folder", "vouchers");
      formData.append("file", values.voucher[0].originFileObj);

      // Subir imagen al API externo
      const uploadRes = await axios.post(
        "https://api.academiapreuniversitariaelite.com/index.php",
        formData
      );

      const urlVoucher = uploadRes.data.files[0].url;

      await apiAcademy.post("/pagos", {
        matriculaId: currentMatricula.id,
        tipo: values.tipo,
        metodo: values.metodo,
        monto: values.monto,
        codigoOperacion: values.codigo_operacion || null,
        imagenVoucherUrl: urlVoucher,
        estado: "pendiente",
      });

      message.success("Pago generado");
      setIsPagoModalOpen(false);
      fetchData();
    } catch (err) {
      message.error("Error al generar pago");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Estudiante",
      dataIndex: ["estudiante", "person", "nombre"],
      key: "estudiante",
    },
    { title: "Modalidad", dataIndex: "modalidad", key: "modalidad" },
    { title: "Turno", dataIndex: "turno", key: "turno" },
    {
      title: "Precio Matricula",
      dataIndex: "precioMatricula",
      key: "precioMatricula",
    },
    {
      title: "Precio Mensualidad",
      dataIndex: "precioMensualidad",
      key: "precioMensualidad",
    },
    { title: "Estado", dataIndex: "estado", key: "estado" },
    {
      title: "Acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          {record.estado === "pendiente" && (
            <Button onClick={() => openPagoModal(record)} size="small">
              Generar Pago
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Gestión de Matrículas</h2>
      <Button type="primary" onClick={openCreateModal} className="mb-4">
        Crear Matrícula
      </Button>

      <Table
        dataSource={matriculas}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal Crear Matricula */}
      <Modal
        title="Crear Matrícula"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleCreateMatricula}
        okText="Guardar"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Estudiante"
            name="person_id"
            rules={[{ required: true }]}
          >
            <Select placeholder="Seleccione un estudiante">
              {personas.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Nombre Apoderado"
            name="nombre_apoderado"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Número Apoderado"
            name="numero_apoderado"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Ciclo" name="ciclo_id" rules={[{ required: true }]}>
            <Select placeholder="Seleccione ciclo">
              {ciclos.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Modalidad"
            name="modalidad"
            rules={[{ required: true }]}
          >
            <Select onChange={handleModalidadChange}>
              <Option value="presencial">Presencial</Option>
              <Option value="virtual">Virtual</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Turno" name="turno" rules={[{ required: true }]}>
            <Select>
              <Option value="MAÑANA">Mañana</Option>
              <Option value="TARDE">Tarde</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Precio Matrícula" name="precio_matricula">
            <Input readOnly />
          </Form.Item>

          <Form.Item label="Precio Mensualidad" name="precio_mensualidad">
            <Input readOnly />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Generar Pago */}
      <Modal
        title="Generar Pago"
        open={isPagoModalOpen}
        onCancel={() => setIsPagoModalOpen(false)}
        onOk={handlePago}
        okText="Pagar"
      >
        <Form layout="vertical" form={pagoForm}>
          <Form.Item
            label="Tipo de Pago"
            name="tipo"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="matricula">Matrícula</Option>
              <Option value="mensualidad">Mensualidad</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Método de Pago"
            name="metodo"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="efectivo">Efectivo</Option>
              <Option value="yape">Yape</Option>
              <Option value="plin">Plin</Option>
              <Option value="tarjeta">Tarjeta</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Monto" name="monto" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>

          <Form.Item label="Código Operación" name="codigo_operacion">
            <Input />
          </Form.Item>

          <Form.Item
            label="Voucher"
            name="voucher"
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
            rules={[{ required: true }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Subir Voucher</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Matriculas;
