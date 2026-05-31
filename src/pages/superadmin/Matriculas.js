import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  notification,
} from "antd";
import { Dropdown, Menu } from "antd";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
} from "react-icons/fa";

import apiAcademy from "../../components/auth/apiAcademy";
import dayjs from "dayjs";
import CronogramaMatriculaModal from "../../components/rolSuperAdmin/CronogramaMatriculaModal";

const { Option } = Select;

const Matriculas = () => {
  const [matriculas, setMatriculas] = useState([]);
  const [filteredMatriculas, setFilteredMatriculas] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  const [currentMatricula, setCurrentMatricula] = useState(null);
  const [cronogramaOpen, setCronogramaOpen] = useState(false);
  const [cronogramaMatricula, setCronogramaMatricula] = useState(null);

  const openCronograma = (matricula) => {
    setCronogramaMatricula(matricula);
    setCronogramaOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, ests, ciclosRes, turnosRes] = await Promise.all([
        apiAcademy.get("/matriculas"),
        apiAcademy.get("/estudiantes"),
        apiAcademy.get("/ciclos"),
        apiAcademy.get("/turnos"),
      ]);

      setMatriculas(mats.data.data);
      setFilteredMatriculas(mats.data.data);
      setEstudiantes(ests.data.data || []);
      setCiclos(ciclosRes.data.data.filter((c) => c.status === 1));
      setTurnos((turnosRes.data.data || []).filter((t) => t.activo));
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
      estudiante_id: matricula.estudianteId,
      ciclo_id: matricula.ciclo.id,
      modalidad: matricula.modalidad,
      turno_id: matricula.turnoId || matricula.turno?.id,
      precio_matricula: matricula.precioMatricula,
      precio_mensualidad: matricula.precioMensualidad,
      fechas: [
        matricula.fechaInicio ? dayjs(matricula.fechaInicio) : null,
        matricula.fechaFin ? dayjs(matricula.fechaFin) : null,
      ],
    });
    setIsModalOpen(true);
  };

  // Autollena precios y fechas desde el ciclo según la modalidad.
  const autofillPrecios = (cicloId, modalidad) => {
    if (!cicloId || !modalidad) return;
    const ciclo = ciclos.find((c) => c.id === cicloId);
    if (!ciclo) return;
    const matricula =
      modalidad === "presencial"
        ? ciclo.montoMatriculaPresencial
        : ciclo.montoMatriculaVirtual;
    const mensualidad =
      modalidad === "presencial"
        ? ciclo.montoMensualidadPresencial
        : ciclo.montoMensualidadVirtual;
    form.setFieldsValue({
      precio_matricula: matricula ?? 0,
      precio_mensualidad: mensualidad ?? 0,
    });
  };

  const autofillFechas = (cicloId) => {
    if (!cicloId) return;
    const ciclo = ciclos.find((c) => c.id === cicloId);
    if (!ciclo) return;
    // Solo en creación: no pisar fechas si está editando
    if (currentMatricula) return;
    form.setFieldsValue({
      fechas: [
        ciclo.fechaInicio ? dayjs(ciclo.fechaInicio) : null,
        ciclo.fechaFin ? dayjs(ciclo.fechaFin) : null,
      ],
    });
  };

  const handleFormValuesChange = (changed, all) => {
    if ("ciclo_id" in changed || "modalidad" in changed) {
      autofillPrecios(all.ciclo_id, all.modalidad);
    }
    if ("ciclo_id" in changed) {
      autofillFechas(all.ciclo_id);
    }
  };

  const handleCreateMatricula = async () => {
    try {
      const values = await form.validateFields();

      const fechaInicio = values.fechas?.[0]?.format("YYYY-MM-DD") || null;
      const fechaFin = values.fechas?.[1]?.format("YYYY-MM-DD") || null;

      if (currentMatricula) {
        await apiAcademy.put(`/matriculas/${currentMatricula.id}`, {
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turnoId: values.turno_id,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          fechaInicio,
          fechaFin,
        });
        message.success("Matrícula actualizada");
        setIsModalOpen(false);
        setCurrentMatricula(null);
        fetchData();
      } else {
        const res = await apiAcademy.post("/matriculas", {
          estudianteId: values.estudiante_id,
          cicloId: values.ciclo_id,
          modalidad: values.modalidad,
          turnoId: values.turno_id,
          precioMatricula: values.precio_matricula,
          precioMensualidad: values.precio_mensualidad,
          fechaInicio,
          fechaFin,
        });
        const nuevaId = res.data?.data?.id;
        message.success("Matrícula creada con cronograma");
        setIsModalOpen(false);
        setCurrentMatricula(null);

        // Refrescar la lista y abrir automáticamente el cronograma de la
        // matrícula recién creada para registrar sus pagos.
        const matsRes = await apiAcademy.get("/matriculas");
        const data = matsRes.data.data || [];
        setMatriculas(data);
        setFilteredMatriculas(data);
        const creada = data.find((m) => m.id === nuevaId);
        if (creada) openCronograma(creada);
      }
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
            {record.modalidad} - {record.turno?.nombre || "—"}
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
            <Menu.Item
              key="cronograma"
              icon={<FaCalendarAlt className="text-green-600" />}
              onClick={() => openCronograma(record)}
            >
              Cronograma de pagos
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
        <Form
          layout="vertical"
          form={form}
          onValuesChange={handleFormValuesChange}
        >
          <Form.Item
            label="Estudiante"
            name="estudiante_id"
            rules={[{ required: true, message: "Selecciona un estudiante" }]}
          >
            <Select
              placeholder="Buscar por nombre, apellido o DNI"
              disabled={!!currentMatricula}
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              notFoundContent={
                estudiantes.length === 0
                  ? "No hay estudiantes. Crea uno desde /estudiantes primero."
                  : "Sin coincidencias"
              }
              options={estudiantes.map((e) => ({
                value: e.id,
                label: `${e.person?.nombre || ""} ${e.person?.apellido || ""} — DNI ${
                  e.person?.dni || "—"
                }`,
              }))}
            />
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
            label="Vigencia (inicio - fin)"
            name="fechas"
            rules={[
              {
                validator: (_, val) => {
                  if (!val || !val[0] || !val[1])
                    return Promise.reject("Selecciona inicio y fin");
                  return Promise.resolve();
                },
              },
            ]}
            extra="Por defecto se llena con las fechas del ciclo. Edítalo si el alumno solo cursa parte del ciclo."
          >
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              className="w-full"
              placeholder={["Inicio", "Fin"]}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
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

            <Form.Item
              label="Turno"
              name="turno_id"
              rules={[{ required: true }]}
            >
              <Select placeholder="Selecciona turno">
                {turnos.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.nombre} ({t.horaInicio?.slice(0, 5)} - {t.horaFin?.slice(0, 5)})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Precio Matrícula"
              name="precio_matricula"
              rules={[{ required: true, message: "Requerido" }]}
              extra="Se autollena del ciclo. Editable para descuentos."
            >
              <Input type="number" min={0} step={10} />
            </Form.Item>
            <Form.Item
              label="Precio Mensualidad"
              name="precio_mensualidad"
              rules={[{ required: true, message: "Requerido" }]}
              extra="Se autollena del ciclo. Editable para descuentos."
            >
              <Input type="number" min={0} step={10} />
            </Form.Item>
          </div>

        </Form>
      </Modal>

      <CronogramaMatriculaModal
        open={cronogramaOpen}
        matricula={cronogramaMatricula}
        onClose={() => {
          setCronogramaOpen(false);
          setCronogramaMatricula(null);
        }}
      />
    </div>
  );
};

export default Matriculas;
