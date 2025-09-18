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
  Space,
  notification,
} from "antd";
import { Dropdown, Menu } from "antd";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaHistory,
  FaMoneyBill,
} from "react-icons/fa";

import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import apiAcademy from "../../components/auth/apiAcademy";
import dayjs from "dayjs";
import { FaEye } from "react-icons/fa6";

const { Option } = Select;

const Matriculas = () => {
  const [matriculas, setMatriculas] = useState([]);
  const [filteredMatriculas, setFilteredMatriculas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [pagoForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  const [currentMatricula, setCurrentMatricula] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, pers, ciclosRes] = await Promise.all([
        apiAcademy.get("/matriculas"),
        apiAcademy.get("/persons"),
        apiAcademy.get("/ciclos"),
      ]);

      setMatriculas(mats.data.data);
      setFilteredMatriculas(mats.data.data);
      setPersonas(pers.data.data.filter((p) => p.tipo === "estudiante"));
      setCiclos(ciclosRes.data.data.filter((c) => c.status === 1));
    } catch (error) {
      message.error("Error al cargar datos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---- FILTROS ----
  const handleFilter = () => {
    const values = filterForm.getFieldsValue();
    let data = [...matriculas];

    if (values.estudiante) {
      data = data.filter((m) =>
        `${m.estudiante.person.nombre} ${m.estudiante.person.apellido}`
          .toLowerCase()
          .includes(values.estudiante.toLowerCase())
      );
    }
    if (values.modalidad) {
      data = data.filter((m) => m.modalidad === values.modalidad);
    }
    if (values.estado) {
      data = data.filter((m) => m.estado === values.estado);
    }

    setFilteredMatriculas(data);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setFilteredMatriculas(matriculas);
  };

  // ---- CREAR/EDITAR MATRÍCULA ----
  const openCreateModal = () => {
    setCurrentMatricula(null);
    form.resetFields();
    setIsModalOpen(true);
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

  const handleCreateMatricula = async () => {
    try {
      const values = await form.validateFields();

      if (currentMatricula) {
        // editar
        await apiAcademy.put(`/matriculas/${currentMatricula.id}`, {
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turno: values.turno,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          estado: values.estado || "pendiente",
        });
        message.success("Matrícula actualizada");
      } else {
        // crear
        let idEstudiante = null;
        const persona = personas.find((p) => p.id === values.person_id);

        if (persona.estudiante === null) {
          const dataEstudiante = await apiAcademy.post("/estudiantes", {
            personId: values.person_id,
            nombreApoderado: values.nombre_apoderado,
            numeroApoderado: values.numero_apoderado,
          });
          idEstudiante = dataEstudiante.data.data.id;
        } else {
          idEstudiante = persona.estudiante.id;
        }

        await apiAcademy.post("/matriculas", {
          estudianteId: idEstudiante,
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turno: values.turno,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          estado: values.estado || "pendiente",
        });
        message.success("Matrícula creada");
      }

      setIsModalOpen(false);
      setCurrentMatricula(null);
      fetchData();
    } catch (err) {
      message.error("Error al guardar matrícula");
    }
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

  // ---- PAGOS ----
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [voucherCurrentUrl, setVoucherCurrentUrl] = useState(null);
  const [isOpenVoucher, setIsOpenVoucher] = useState(false);

  const openPagoModal = (matricula) => {
    setCurrentMatricula(matricula);
    pagoForm.resetFields();
    setIsPagoModalOpen(true);
  };
  const [isSubmittingPago, setIsSubmittingPago] = useState(false);
  const handlePago = async () => {
    if (isSubmittingPago) return; // protección doble click
    setIsSubmittingPago(true);

    try {
      const values = await pagoForm.validateFields();

      let urlVoucher = null;

      // 👇 Solo subir si hay voucher
      if (values.voucher && values.voucher.length > 0) {
        const formData = new FormData();
        formData.append("folder", "vouchers");
        formData.append("files", values.voucher[0].originFileObj);

        const uploadRes = await axios.post(
          "https://api.academiapreuniversitariaelite.com/index.php",
          formData
        );

        urlVoucher = uploadRes.data.files[0].url;
      }

      await apiAcademy.post("/pagos", {
        matriculaId: currentMatricula.id,
        tipo: values.tipo,
        metodo: values.metodo,
        monto: values.monto,
        codigoOperacion: values.codigo_operacion || null,
        imagenVoucherUrl: urlVoucher, // 👈 puede ser null
        estado: "validado",
      });

      message.success("Pago registrado");
      setIsPagoModalOpen(false);
      fetchData();
    } catch (err) {
      notification.error({ message: "Error al generar pago" });
    } finally {
      setIsSubmittingPago(false);
    }
  };

  const openHistorialPagos = async (matricula) => {
    try {
      const res = await apiAcademy.get("/pagos");
      setHistorialPagos(
        res.data.data.filter((p) => p.matriculaId === matricula.id)
      );
      setIsHistorialModalOpen(true);
    } catch (err) {
      message.error("Error al cargar historial");
    }
  };

  const showVoucher = (id) => {
    const voucherUrl = historialPagos.find((m) => m.id === id).imagenVoucherUrl;
    setVoucherCurrentUrl(voucherUrl);
    setIsOpenVoucher(true);
  };

  const handleDeleteWithValidation = async (record) => {
    try {
      // Obtener pagos relacionados a la matrícula
      const res = await apiAcademy.get("/pagos");
      const pagosMatricula = res.data.data.filter(
        (p) => p.matriculaId === record.id
      );

      if (pagosMatricula.length === 0) {
        // No tiene pagos → se puede eliminar directo
        await handleDeleteMatricula(record);
        return;
      }

      // Contar estados de los pagos
      const pendientes = pagosMatricula.filter(
        (p) => p.estado === "pendiente"
      ).length;
      const validados = pagosMatricula.filter(
        (p) => p.estado === "validado"
      ).length;
      const rechazados = pagosMatricula.filter(
        (p) => p.estado === "rechazado"
      ).length;

      if (pendientes > 0 || validados > 0) {
        notification.open({
          message: "No puedes eliminar esta matricula",
          description: (
            <div className="flex gap-2 items-center">
              <p className="text-red font-bold">
                Tiene {validados} pagos validados y {pendientes} pendientes.
                Debes ir al historial de pagos y rechazarlos primero.
              </p>
            </div>
          ),
          placement: "topRight",
        });
        return;
      }

      if (rechazados === pagosMatricula.length) {
        // Todos están rechazados → se puede eliminar
        await handleDeleteMatricula(record);
      }
    } catch (err) {
      message.error("Error al validar pagos de la matrícula");
    }
  };

  // ---- COLUMNAS TABLA ----
  const columns = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, record) => (
        <div>
          <p className="font-semibold">
            {record.estudiante.person.nombre}{" "}
            {record.estudiante.person.apellido}
          </p>

          <p className="text-sm">
            Estado:{" "}
            {record.estado === "pendiente" ? (
              <span className="text-red-500 font-semibold">Pendiente</span>
            ) : (
              <span className="bg-primary text-white px-2 py-0.5 rounded text-xs">
                Matriculado
              </span>
            )}
          </p>

          <p className="text-sm text-gray-500">
            Matriculado el: {dayjs(record.createdAt).format("DD-MM-YYYY")}
          </p>
        </div>
      ),
    },

    {
      title: "Ciclo / Modalidad",
      key: "ciclo_modalidad",
      render: (_, record) => (
        <div>
          <p className="font-semibold">{record.ciclo.nombre}</p>
          <p className="text-sm">
            {dayjs(record.ciclo.fechaInicio).format("DD-MM-YYYY")} -{" "}
            {dayjs(record.ciclo.fechaFin).format("DD-MM-YYYY")}
          </p>
          <p className="text-sm capitalize">
            {record.modalidad} - {record.turno}
          </p>
        </div>
      ),
    },
    {
      title: "Precios",
      key: "precios",
      render: (_, record) => (
        <div>
          <p>Matrícula: S/ {record.precioMatricula}</p>
          <p>Mensualidad: S/ {record.precioMensualidad}</p>
          <p className="text-sm text-gray-500">Estado: {record.estado}</p>
        </div>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => {
        const menu = (
          <Menu>
            {record.estado === "pendiente" && (
              <Menu.Item
                key="pago"
                icon={<FaMoneyBill className="text-green-600" />}
                onClick={() => openPagoModal(record)}
              >
                Generar Pago
              </Menu.Item>
            )}
            <Menu.Item
              key="historial"
              icon={<FaHistory className="text-blue-600" />}
              onClick={() => openHistorialPagos(record)}
            >
              Historial de Pagos
            </Menu.Item>
            <Menu.Item
              key="editar"
              icon={<FaEdit className="text-yellow-600" />}
              onClick={() => openEditMatricula(record)}
            >
              Editar
            </Menu.Item>
            <Menu.Item
              key="eliminar"
              icon={<FaTrash className="text-red-600" />}
            >
              <Popconfirm
                title="¿Estás seguro de que quieres eliminar esta matrícula?"
                onConfirm={() => handleDeleteWithValidation(record)}
                okText="Sí"
                cancelText="No"
              >
                <span>Eliminar</span>
              </Popconfirm>
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={["click"]}>
            <Button className="flex items-center justify-center">
              <FaEllipsisV />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  // Estados (añádelos junto a los demás useState)
  const [isValidarModalOpen, setIsValidarModalOpen] = useState(false);
  const [pagoSeleccionadoValidar, setPagoSeleccionadoValidar] = useState(null);

  // Función para abrir el modal de validación
  const handleOpenValidarModal = (pago) => {
    setPagoSeleccionadoValidar(pago);
    setIsValidarModalOpen(true);
  };

  // Función para validar un pago (PUT /pagos/:id { estado: "validado" })
  const handleValidarPago = async () => {
    if (!pagoSeleccionadoValidar) return;

    try {
      const pagoId = pagoSeleccionadoValidar.id;
      const matriculaId = pagoSeleccionadoValidar.matriculaId;

      // Llamada PUT a la ruta de Adonis para actualizar estado
      await apiAcademy.put(`/pagos/${pagoId}`, { estado: "validado" });

      message.success("Pago validado correctamente");

      // Volver a cargar los pagos del historial para la matrícula actual
      const res = await apiAcademy.get("/pagos");
      const pagosFiltrados = res.data.data.filter(
        (p) => p.matriculaId === matriculaId
      );
      setHistorialPagos(pagosFiltrados);

      // Cerrar modal y limpiar selección
      setIsValidarModalOpen(false);
      setPagoSeleccionadoValidar(null);

      // Refrescar datos principales (matriculas) para reflejar cambios (opcional pero recomendado)
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Error al validar el pago");
    }
  };
  const handleTipoPago = (value) => {
    if (value === "matricula") {
      pagoForm.setFieldsValue({ monto: currentMatricula.precioMatricula });
    } else {
      // obtener siguiente cuota (si tienes schedule)
      pagoForm.setFieldsValue({ monto: currentMatricula.precioMensualidad });
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestión de Matrículas</h2>
        <Button className="bg-primary text-white" onClick={openCreateModal}>
          Crear Matrícula
        </Button>
      </div>

      {/* FILTROS */}
      <Form
        form={filterForm}
        layout="inline"
        className="mb-4 flex flex-wrap gap-2"
      >
        <Form.Item name="estudiante">
          <Input placeholder="Buscar por estudiante" allowClear />
        </Form.Item>
        <Form.Item name="modalidad">
          <Select placeholder="Modalidad" allowClear style={{ width: 160 }}>
            <Option value="presencial">Presencial</Option>
            <Option value="virtual">Virtual</Option>
          </Select>
        </Form.Item>
        <Form.Item name="estado">
          <Select placeholder="Estado" allowClear style={{ width: 160 }}>
            <Option value="pendiente">Pendiente</Option>
            <Option value="matriculado">Matriculado</Option>
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

      {/* TABLA */}
      <Table
        className="shadow-md rounded-lg"
        dataSource={filteredMatriculas}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      {/* -------- MODALES (Crear, Pago, Historial, Voucher) -------- */}
      {/* Crear / Editar Matrícula */}
      <Modal
        title={currentMatricula ? "Editar Matrícula" : "Crear Matrícula"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleCreateMatricula}
        okText="Guardar"
        okButtonProps={{ className: "bg-primary text-white" }}
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
            <Select>
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

      {/* Generar Pago */}
      <Modal
        title="Generar Pago"
        open={isPagoModalOpen}
        onCancel={() => setIsPagoModalOpen(false)}
        onOk={handlePago}
        okText="Pagar"
        okButtonProps={{
          className: "bg-primary text-white",
          loading: isSubmittingPago, // 👈 Controla el estado de carga
        }}
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

          {/* 👇 Ya no es obligatorio */}
          <Form.Item
            label="Voucher"
            name="voucher"
            valuePropName="fileList"
            getValueFromEvent={(e) => e.fileList}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Subir Voucher</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Historial de Pagos */}
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
            { title: "Codigo", dataIndex: "codigoOperacion" },
            {
              title: "Voucher",
              render: (_, record) => (
                <button
                  className="bg-white rounded shadow flex gap-2 items-center px-3 py-1"
                  onClick={() => showVoucher(record.id)}
                >
                  Ver <FaEye />
                </button>
              ),
            },
            {
              title: "Fecha Pago",
              render: (_, record) =>
                dayjs(record.createdAt).format("DD-MM-YYYY"),
            },
            {
              title: "Acciones",
              key: "acciones",
              render: (_, record) => (
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    disabled={record.estado === "validado"}
                    onClick={() => handleOpenValidarModal(record)}
                  >
                    Validar
                  </Button>
                </Space>
              ),
            },
          ]}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Modal>

      {/* Ver Voucher */}
      <Modal
        title="Imagen"
        open={isOpenVoucher}
        onCancel={() => setIsOpenVoucher(false)}
        footer={null}
      >
        <Image width={300} src={voucherCurrentUrl} />
      </Modal>
      {/* Modal Validar Pago */}
      <Modal
        title="Validar Pago"
        open={isValidarModalOpen}
        onCancel={() => {
          setIsValidarModalOpen(false);
          setPagoSeleccionadoValidar(null);
        }}
        footer={null}
      >
        <div className="flex flex-col gap-4 items-center">
          {/* Voucher (imagen) */}
          {pagoSeleccionadoValidar?.imagenVoucherUrl ? (
            <Image
              src={pagoSeleccionadoValidar.imagenVoucherUrl}
              alt="Voucher"
              width={300}
              preview={{ src: pagoSeleccionadoValidar.imagenVoucherUrl }}
            />
          ) : (
            <div className="w-64 h-40 bg-gray-100 flex items-center justify-center">
              Sin voucher
            </div>
          )}

          {/* Detalles del pago */}
          <div className="w-full">
            <p>
              <strong>Monto:</strong> S/ {pagoSeleccionadoValidar?.monto ?? "-"}
            </p>
            <p>
              <strong>Método:</strong> {pagoSeleccionadoValidar?.metodo ?? "-"}
            </p>
            <p>
              <strong>Código:</strong>{" "}
              {pagoSeleccionadoValidar?.codigoOperacion ??
                pagoSeleccionadoValidar?.codigo_operacion ??
                "-"}
            </p>
            <p>
              <strong>Fecha:</strong>{" "}
              {pagoSeleccionadoValidar?.createdAt
                ? dayjs(pagoSeleccionadoValidar.createdAt).format("DD-MM-YYYY")
                : "-"}
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              className="bg-primary text-white"
              onClick={handleValidarPago}
            >
              Validar
            </Button>
            <Button
              onClick={() => {
                setIsValidarModalOpen(false);
                setPagoSeleccionadoValidar(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Matriculas;
