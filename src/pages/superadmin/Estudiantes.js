import { FileExcelOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Input,
  Form,
  Modal,
  message,
  Popconfirm,
  notification,
  Dropdown,
  Menu,
  Upload,
} from "antd";
import {
  DownloadOutlined,
  FileZipOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import apiAcademy from "../../components/auth/apiAcademy";

import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterForm] = Form.useForm();

  // editar estudiante/persona
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [currentEstudiante, setCurrentEstudiante] = useState(null);

  useEffect(() => {
    fetchEstudiantes();
    // eslint-disable-next-line
  }, []);

  const fetchEstudiantes = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/estudiantes");
      // endpoint devuelve res.data.data
      const data = res.data.data || [];
      setEstudiantes(data);
      setFiltered(data);
    } catch (err) {
      notification.error({ message: "Error al cargar estudiantes" });
    } finally {
      setLoading(false);
    }
  };
  // 🔹 Generar QR en base64
  const generarQr = async (texto) => {
    try {
      return await QRCode.toDataURL(texto, { width: 200 });
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // 🔹 Descargar QR individual
  const descargarQr = async (id) => {
    const qrDataUrl = await generarQr(id.toString());
    if (!qrDataUrl) return;

    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `estudiante_${id}.png`;
    a.click();
  };

  // 🔹 Descargar todos los QR en ZIP
  const descargarTodosZip = async () => {
    const zip = new JSZip();

    for (const est of estudiantes) {
      const qrDataUrl = await generarQr(est.id.toString());
      const base64 = qrDataUrl.split(",")[1]; // quitar encabezado data:image/png;base64
      zip.file(`estudiante_${est.id}.png`, base64, { base64: true });
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "qrs_estudiantes.zip");
    message.success("Descarga completada: qrs_estudiantes.zip");
  };

  // trae todas las matriculas (para contar por estudiante) - optimizado: traer once y filtrar localmente
  const fetchMatriculas = async () => {
    try {
      const res = await apiAcademy.get("/matriculas");
      return res.data.data || [];
    } catch (err) {
      return [];
    }
  };

  // filtros externos
  const handleFilter = async () => {
    const values = filterForm.getFieldsValue();
    let data = [...estudiantes];
    if (values.search) {
      data = data.filter((e) => {
        const full = `${e.person.nombre} ${e.person.apellido}`.toLowerCase();
        return full.includes(values.search.toLowerCase());
      });
    }
    if (values.dni) {
      data = data.filter((e) => (e.person.dni || "").includes(values.dni));
    }
    if (values.sede_id) {
      data = data.filter((e) => e.person.sede_id === values.sede_id);
    }
    setFiltered(data);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setFiltered(estudiantes);
  };

  // eliminar estudiante
  const handleDelete = async (estId) => {
    try {
      await apiAcademy.delete(`/estudiantes/${estId}`);
      message.success("Estudiante eliminado");
      fetchEstudiantes();
    } catch (err) {
      message.error("Error al eliminar estudiante");
    }
  };

  // abrir modal editar (edita person y student)
  const openEditModal = async (record) => {
    setCurrentEstudiante(record);
    // llenar form con person + estudiante fields
    editForm.setFieldsValue({
      nombre: record.person.nombre,
      apellido: record.person.apellido,
      dni: record.person.dni,
      whatsapp: record.person.whatsapp,
      email: record.person.email,
      nombre_apoderado: record.nombreApoderado || "",
      numero_apoderado: record.numeroApoderado || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();

      // 1) actualizar person
      await apiAcademy.put(`/persons/${currentEstudiante.person.id}`, {
        nombre: values.nombre,
        apellido: values.apellido,
        dni: values.dni,
        whatsapp: values.whatsapp,
        email: values.email,
      });

      // 2) actualizar o crear estudiante (si no tiene)
      if (currentEstudiante.id) {
        // actualizar estudiante (PUT si tu API lo soporta)
        await apiAcademy.put(`/estudiantes/${currentEstudiante.id}`, {
          nombreApoderado: values.nombre_apoderado,
          numeroApoderado: values.numero_apoderado,
        });
      } else {
        // si por alguna razón no existe estudiante, lo creamos
        await apiAcademy.post("/estudiantes", {
          personId: currentEstudiante.person.id,
          nombreApoderado: values.nombre_apoderado,
          numeroApoderado: values.numero_apoderado,
        });
      }

      notification.success({ message: "Estudiante actualizado" });
      setIsEditModalOpen(false);
      fetchEstudiantes();
    } catch (err) {
      notification.error({ message: "Error al actualizar estudiante" });
    }
  };

  // columna Ciclos -> obtiene conteo total y activos por estudiante
  const ciclosColumnRender = (record) => {
    // traemos matriculas y las filtramos por estudiante.id
    // NOTA: sacamos matriculas desde API cada vez; para optimizar, puedes cachearlas
    return <CiclosResumen estudianteId={record.id} />;
  };

  const handleUploadEstudiantes = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheet];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // saltar cabecera -> empieza fila 2
        const registros = rows.slice(2).map((row) => {
          return {
            dni: row[2] || "", // columna C
            nombreCompleto: row[3] || "", // columna D
            telMama: row[4] || "", // columna E
            telPapa: row[5] || "", // columna F
            telefonoAlumno: row[6] || "", // columna G
            email: row[7] || "", // columna H
          };
        });

        for (const r of registros) {
          if (!r.dni || !r.nombreCompleto) continue;

          // procesar nombre y apellido según reglas
          const partes = r.nombreCompleto.trim().split(/\s+/);
          let nombre = "";
          let apellido = "";

          switch (partes.length) {
            case 1:
              nombre = partes[0];
              break;
            case 2:
              [nombre, apellido] = partes;
              break;
            case 3:
              nombre = partes[0];
              apellido = partes.slice(1).join(" ");
              break;
            case 4:
              nombre = partes.slice(0, 2).join(" ");
              apellido = partes.slice(2).join(" ");
              break;
            case 5:
              nombre = partes.slice(0, 3).join(" ");
              apellido = partes.slice(3).join(" ");
              break;
            default:
              nombre = partes[0];
              apellido = partes.slice(1).join(" ");
          }

          // escoger número apoderado (mamá o papá)
          const numeroApoderado = r.telMama || r.telPapa || "";

          // 1) Crear Person
          const personRes = await apiAcademy.post("/persons", {
            dni: r.dni,
            nombre,
            apellido,
            whatsapp: r.telefonoAlumno || "",
            email: r.email || "",
            tipo: "estudiante",
          });

          const personId = personRes.data.data.id;

          // 2) Crear Estudiante
          await apiAcademy.post("/estudiantes", {
            personId,
            nombreApoderado: "", // no viene en Excel
            numeroApoderado,
          });
        }

        message.success("Estudiantes subidos correctamente");
        fetchEstudiantes();
      } catch (err) {
        console.error(err);
        message.error("Error al procesar el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // table columns
  const columns = [
    {
      title: "Estudiante",
      key: "estudiante",
      render: (_, record) => (
        <div>
          <div className="font-semibold">
            {record?.person?.nombre} {record?.person?.apellido}
          </div>
          <div className="text-sm text-gray-500">{record?.person?.email}</div>
          <div className="text-sm text-gray-500">
            DNI: {record?.person?.dni}
          </div>
        </div>
      ),
    },
    {
      title: "QR",
      key: "qr",
      render: (_, record) => (
        <div className="flex flex-col items-center gap-2">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${record.id}`}
            alt={`QR ${record.id}`}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() => descargarQr(record.id)}
          >
            Descargar
          </Button>
        </div>
      ),
    },
    {
      title: "Ciclos",
      key: "ciclos",
      render: (_, record) => ciclosColumnRender(record),
      width: 220,
    },
    {
      title: "Contacto",
      key: "contacto",
      render: (_, record) => (
        <div>
          <div>Apoderado: {record.nombreApoderado || "-"}</div>
          <div>Tel: {record.numeroApoderado || "-"}</div>
        </div>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_, record) => {
        const menu = (
          <Menu>
            <Menu.Item key="edit" onClick={() => openEditModal(record)}>
              Editar
            </Menu.Item>
            <Menu.Item key="delete">
              <Popconfirm
                title="¿Eliminar estudiante?"
                onConfirm={() => handleDelete(record.id)}
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
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Estudiantes</h2>
        {/* NO crear estudiante: sólo listar */}
      </div>

      <Form
        form={filterForm}
        layout="inline"
        className="mb-4 flex flex-wrap gap-2"
      >
        <Form.Item name="search">
          <Input placeholder="Buscar por nombre" allowClear />
        </Form.Item>
        <Form.Item name="dni">
          <Input placeholder="DNI" allowClear />
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
      <Button
        type="primary"
        icon={<FileZipOutlined />}
        onClick={descargarTodosZip}
      >
        Descargar ZIP de todos
      </Button>
      <Upload
        beforeUpload={handleUploadEstudiantes}
        showUploadList={false}
        accept=".xlsx,.xls"
      >
        <Button
          type="default"
          icon={<FileExcelOutlined />}
          style={{ marginLeft: 10 }}
        >
          Subir Estudiantes (Excel)
        </Button>
      </Upload>

      <Table
        dataSource={Array.isArray(filtered) ? filtered : []}
        columns={columns}
        rowKey={(row) => row.id || row.person.id}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      {/* Edit modal (edita person + estudiante) */}
      <Modal
        title="Editar Estudiante"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleSaveEdit}
        okButtonProps={{ className: "bg-primary text-white" }}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Apellido" name="apellido">
            <Input />
          </Form.Item>
          <Form.Item label="DNI" name="dni">
            <Input />
          </Form.Item>
          <Form.Item label="WhatsApp" name="whatsapp">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>
          <label className="text-md font-medium" htmlFor="Datos Extra">
            Datos Extra
          </label>
          <Form.Item label="Nombre Apoderado" name="nombre_apoderado">
            <Input />
          </Form.Item>
          <Form.Item label="Número Apoderado" name="numero_apoderado">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Estudiantes;

/**
 * Componente pequeño que muestra resumen de ciclos para un estudiante.
 * Hace request localmente a /matriculas y filtra por estudianteId.
 */
const CiclosResumen = ({ estudianteId }) => {
  const [totales, setTotales] = useState({
    total: 0,
    activos: 0,
    cargando: true,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await apiAcademy.get("/matriculas");
        const data = res.data.data || [];
        const relacionados = data.filter((m) => {
          // m.estudiante puede ser object con id
          const id = m.estudiante?.id ?? m.estudianteId ?? null;
          return id === estudianteId;
        });

        const activos = relacionados.filter(
          (r) => r.estado === "matriculado"
        ).length;
        if (mounted)
          setTotales({ total: relacionados.length, activos, cargando: false });
      } catch (err) {
        if (mounted) setTotales({ total: 0, activos: 0, cargando: false });
      }
    };

    load();
    return () => (mounted = false);
  }, [estudianteId]);

  if (totales.cargando) return <div>Cargando...</div>;

  return (
    <div>
      <div>
        Total ciclos: <strong>{totales.total}</strong>
      </div>
      <div>
        Matriculas activas: <strong>{totales.activos}</strong>
      </div>
    </div>
  );
};
