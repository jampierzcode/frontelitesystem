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
  Image,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import axios from "axios";
import apiAcademy from "../../components/auth/apiAcademy";
import dayjs from "dayjs";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

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
    console.log(value);
    const ciclo_id = form.getFieldValue("ciclo_id");
    if (ciclo_id === null || ciclo_id === 0) {
      message.warning("Debes seleccionar primero un ciclo");
    } else {
      const cicloCurrent = ciclos.find((c) => c.id === ciclo_id);
      console.log(cicloCurrent);
      if (value === "presencial") {
        form.setFieldsValue({
          precio_matricula: cicloCurrent?.montoMatriculaPresencial,
          precio_mensualidad: cicloCurrent?.montoMensualidadPresencial,
        });
      } else {
        form.setFieldsValue({
          precio_matricula: cicloCurrent?.montoMatriculaVirtual,
          precio_mensualidad: cicloCurrent?.montoMensualidadVirtual,
        });
      }
      setSelectedModalidad(value);
    }
  };
  const handleTipoPago = (value) => {
    if (value === "matricula") {
      pagoForm.setFieldsValue({
        monto: currentMatricula.precioMatricula,
      });
    } else {
      pagoForm.setFieldsValue({
        monto: currentMatricula.precioMensualidad,
      });
    }
  };

  const handleCreateMatricula = async () => {
    try {
      const values = await form.validateFields();

      if (currentMatricula) {
        const matriculaPayload = {
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turno: values.turno,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          estado: values.estado || "pendiente",
        };
        // Editar
        await apiAcademy.put(
          `/matriculas/${currentMatricula.id}`,
          matriculaPayload
        );
        message.success("Matrícula actualizada");
      } else {
        let idEstudiante = null;
        const persona = personas.find((p) => p.id === values.person_id);
        console.log(persona);

        if (persona.estudiante === null) {
          console.log("id");
          const dataEstudiante = await apiAcademy.post("/estudiantes", {
            personId: values.person_id,
            nombreApoderado: values.nombre_apoderado,
            numeroApoderado: values.numero_apoderado,
          });
          idEstudiante = dataEstudiante.data.data.id;
        } else {
          idEstudiante = persona.estudiante.id;
        }

        const matriculaPayload = {
          estudianteId: idEstudiante,
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turno: values.turno,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          estado: values.estado || "pendiente",
        };
        console.log(currentMatricula);
        // Crear
        await apiAcademy.post("/matriculas", matriculaPayload);
        message.success("Matrícula creada");
      }

      setIsModalOpen(false);
      setCurrentMatricula(null);
      fetchData();
    } catch (err) {
      console.log(err);
      message.error("Error al guardar matrícula");
    }
  };

  const openEditMatricula = (matricula) => {
    setCurrentMatricula(matricula);
    form.setFieldsValue({
      person_id: matricula.estudiante.person.id,
      nombre_apoderado: matricula.estudiante.nombreApoderado,
      numero_apoderado: matricula.estudiante.numeroApoderado,
      ciclo_id: matricula.ciclo.id,
      modalidad: matricula.modalidad,
      turno: matricula.turno,
      precio_matricula: matricula.precioMatricula,
      precio_mensualidad: matricula.precioMensualidad,
      estado: matricula.estado,
    });
    setIsModalOpen(true);
  };

  const handleDeleteMatricula = async (record) => {
    try {
      await apiAcademy.delete(`/matriculas/${record.id}`);
      message.success("Matrícula eliminada");
      fetchData();
    } catch (err) {
      message.error("Error al eliminar matrícula");
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
      formData.append("files", values.voucher[0].originFileObj);

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
  const [historialPagos, setHistorialPagos] = useState([]);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);

  const openHistorialPagos = async (matricula) => {
    try {
      const res = await apiAcademy.get("/pagos");
      const pagosFiltrados = res.data.data.filter(
        (p) => p.matriculaId === matricula.id
      );
      setHistorialPagos(pagosFiltrados);
      setIsHistorialModalOpen(true);
    } catch (err) {
      message.error("Error al cargar historial de pagos");
    }
  };

  const columns = [
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
    { title: "Ciclo", dataIndex: ["ciclo", "nombre"], key: "ciclo" },
    {
      title: "Tiempo Ciclo",
      render: (_, record) => {
        return `${dayjs(record.ciclo.fechaInicio).format(
          "DD-MM-YYYY"
        )} -  ${dayjs(record.ciclo.fechaFin).format("DD-MM-YYYY")}`;
      },
    },

    {
      title: "Acciones",
      render: (_, record) => (
        <div className="flex gap-2 flex-wrap">
          {record.estado === "pendiente" && (
            <Button onClick={() => openPagoModal(record)} size="small">
              Generar Pago
            </Button>
          )}
          <Button onClick={() => openHistorialPagos(record)} size="small">
            Historial
          </Button>
          <Button onClick={() => openEditMatricula(record)} size="small">
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar esta matrícula?"
            onConfirm={() => handleDeleteMatricula(record)}
          >
            <Button danger size="small">
              Eliminar
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];
  const [voucherCurrentUrl, setVoucherCurrentUrl] = useState(null);
  const [isOpenVocuher, setIsOpenVocuher] = useState(false);
  const showVoucher = (id) => {
    const voucherUrl = historialPagos.find((m) => m.id === id).imagenVoucherUrl;
    setVoucherCurrentUrl(voucherUrl);
    setIsOpenVocuher(true);
  };

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
            label="Persona Estudiante"
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
            <Select
              placeholder="Seleccione ciclo"
              onChange={() => {
                form.setFieldValue("modalidad", "");
                form.setFieldValue("precio_matricula", 0);
                form.setFieldValue("precio_mensualidad", 0);
              }}
            >
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
          <Form.Item label="Estado" name="estado">
            <Select>
              <Option value="pendiente">Pendiente</Option>
              <Option value="matriculado">Matriculado</Option>
            </Select>
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
            <Select onChange={handleTipoPago}>
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
      <Modal
        title="Historial de Pagos"
        open={isHistorialModalOpen}
        onCancel={() => setIsHistorialModalOpen(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={historialPagos}
          columns={[
            { title: "Tipo", dataIndex: "tipo" },
            { title: "Monto", dataIndex: "monto" },
            { title: "Método", dataIndex: "metodo" },
            { title: "Estado", dataIndex: "estado" },
            { title: "Codigo de Operacion", dataIndex: "codigoOperacion" },
            {
              title: "Voucher",
              render: (_, record) => {
                return (
                  <button
                    className="bg-white rounded shadow flex gap-4 items-center px-3 py-2"
                    onClick={() => showVoucher(record.id)}
                  >
                    Ver <FaEye />
                  </button>
                );
              },
            },
            {
              title: "Fecha Pago",
              render: (_, record) => {
                return `${dayjs(record.createdAt).format("DD-MM-YYYY")}`;
              },
            },
          ]}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Modal>
      <Modal
        title="Imagen"
        open={isOpenVocuher}
        onCancel={() => setIsOpenVocuher(false)}
        footer={null}
      >
        <Image width={250} preview={true} src={voucherCurrentUrl} />
      </Modal>
    </div>
  );
};

export default Matriculas;
