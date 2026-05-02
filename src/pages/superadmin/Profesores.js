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
  Tag,
} from "antd";
import apiAcademy from "../../components/auth/apiAcademy";
import HorariosProfesorModal from "../../components/rolSuperAdmin/HorariosProfesorModal";
import ContratosProfesorModal from "../../components/rolSuperAdmin/ContratosProfesorModal";

const Profesores = () => {
  const [profesores, setProfesores] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [current, setCurrent] = useState(null);
  const [horariosOpen, setHorariosOpen] = useState(false);
  const [horariosProfesor, setHorariosProfesor] = useState(null);
  const [contratosOpen, setContratosOpen] = useState(false);
  const [contratosProfesor, setContratosProfesor] = useState(null);
  const [form] = Form.useForm();

  const openHorarios = (record) => {
    setHorariosProfesor(record);
    setHorariosOpen(true);
  };

  const openContratos = (record) => {
    setContratosProfesor(record);
    setContratosOpen(true);
  };

  const fetchProfesores = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/profesores");
      setProfesores(res.data.data || []);
    } catch (err) {
      message.error("Error al cargar profesores");
    } finally {
      setLoading(false);
    }
  };

  const fetchSedes = async () => {
    try {
      const res = await apiAcademy.get("/sedes");
      setSedes(res.data.data || []);
    } catch {
      // silencioso
    }
  };

  const fetchCursos = async () => {
    try {
      const res = await apiAcademy.get("/cursos");
      setCursos((res.data.data || []).filter((c) => c.activo));
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    fetchProfesores();
    fetchSedes();
    fetchCursos();
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
      dni: record.person?.dni,
      nombre: record.person?.nombre,
      apellido: record.person?.apellido,
      whatsapp: record.person?.whatsapp,
      email: record.person?.email,
      sedeId: record.person?.sedeId,
      carrera: record.carrera,
      cursoIds: (record.cursos || []).map((c) => c.id),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && current) {
        await apiAcademy.put(`/profesores/${current.id}`, values);
        message.success("Profesor actualizado");
      } else {
        await apiAcademy.post("/profesores", values);
        message.success("Profesor creado");
      }
      setIsModalOpen(false);
      fetchProfesores();
    } catch (err) {
      message.error("Error al guardar profesor");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/profesores/${id}`);
      message.success("Profesor eliminado");
      fetchProfesores();
    } catch {
      message.error("Error al eliminar profesor");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "Nombre completo",
      key: "nombreCompleto",
      render: (_, r) =>
        `${r.person?.nombre || ""} ${r.person?.apellido || ""}`.trim(),
    },
    {
      title: "DNI",
      key: "dni",
      render: (_, r) => r.person?.dni || "-",
      width: 110,
    },
    {
      title: "WhatsApp",
      key: "whatsapp",
      render: (_, r) => r.person?.whatsapp || "-",
      width: 130,
    },
    {
      title: "Email",
      key: "email",
      render: (_, r) => r.person?.email || "-",
    },
    { title: "Carrera", dataIndex: "carrera", key: "carrera" },
    {
      title: "Sede",
      key: "sede",
      render: (_, r) => r.person?.sede?.name_referential || "-",
    },
    {
      title: "Cursos",
      key: "cursos",
      render: (_, r) => (
        <div className="flex flex-wrap gap-1">
          {(r.cursos || []).map((c) => (
            <Tag key={c.id} color="blue">
              {c.nombre}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openHorarios(record)}>
            Horarios
          </Button>
          <Button size="small" onClick={() => openContratos(record)}>
            Contratos
          </Button>
          <Button
            size="small"
            className="bg-primary text-white"
            onClick={() => openEdit(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar este profesor?"
            description="Se eliminará también su persona asociada."
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
      width: 380,
      fixed: "right",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Profesores</h2>
        <Button className="bg-primary text-white" onClick={openCreate}>
          Crear Profesor
        </Button>
      </div>

      <Table
        dataSource={Array.isArray(profesores) ? profesores : []}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={isEdit ? "Editar Profesor" : "Crear Profesor"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okButtonProps={{ className: "bg-primary text-white" }}
        width={680}
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label="DNI"
              name="dni"
              rules={[{ required: true, message: "DNI requerido" }]}
            >
              <Input maxLength={15} />
            </Form.Item>
            <Form.Item
              label="WhatsApp"
              name="whatsapp"
              rules={[{ required: true, message: "WhatsApp requerido" }]}
            >
              <Input maxLength={20} />
            </Form.Item>
            <Form.Item
              label="Nombre"
              name="nombre"
              rules={[{ required: true, message: "Nombre requerido" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Apellido" name="apellido">
              <Input />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Email no válido" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Sede" name="sedeId">
              <Select
                allowClear
                placeholder="Selecciona sede"
                options={sedes.map((s) => ({
                  value: s.id,
                  label: s.name_referential,
                }))}
              />
            </Form.Item>
            <Form.Item label="Carrera / Especialidad" name="carrera">
              <Input placeholder="Ingeniería Civil, Educación..." />
            </Form.Item>
          </div>
          <Form.Item label="Cursos que puede impartir" name="cursoIds">
            <Select
              mode="multiple"
              allowClear
              placeholder="Selecciona uno o más cursos"
              options={cursos.map((c) => ({ value: c.id, label: c.nombre }))}
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>

      <HorariosProfesorModal
        open={horariosOpen}
        profesor={horariosProfesor}
        onClose={() => {
          setHorariosOpen(false);
          setHorariosProfesor(null);
        }}
      />

      <ContratosProfesorModal
        open={contratosOpen}
        profesor={contratosProfesor}
        onClose={() => {
          setContratosOpen(false);
          setContratosProfesor(null);
        }}
      />
    </div>
  );
};

export default Profesores;
