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
  Select,
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
import ApoderadosManager from "../../components/rolSuperAdmin/ApoderadosManager";

const { Option } = Select;

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  // Map<estudianteId, { total, activos }> — precalculado del fetch único
  const [resumenMap, setResumenMap] = useState(new Map());

  const [filterForm] = Form.useForm();

  // crear nuevo estudiante
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  // editar estudiante/persona
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [currentEstudiante, setCurrentEstudiante] = useState(null);

  // Listas de apoderados editadas localmente (controladas por ApoderadosManager)
  const [apoderadosCreate, setApoderadosCreate] = useState([]);
  const [apoderadosEdit, setApoderadosEdit] = useState([]);

  useEffect(() => {
    fetchEstudiantes();
    fetchResumenMatriculas();
    // eslint-disable-next-line
  }, []);

  const fetchEstudiantes = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/estudiantes");
      const data = res.data.data || [];
      setEstudiantes(data);
      setFiltered(data);
    } catch (err) {
      notification.error({ message: "Error al cargar estudiantes" });
    } finally {
      setLoading(false);
    }
  };

  // Trae todas las matrículas una sola vez y arma un Map por estudianteId
  // para evitar N+1 en la columna "Ciclos".
  const fetchResumenMatriculas = async () => {
    try {
      const res = await apiAcademy.get("/matriculas");
      const map = new Map();
      for (const m of res.data.data || []) {
        const eid = m.estudianteId ?? m.estudiante?.id;
        if (!eid) continue;
        const cur = map.get(eid) || { total: 0, activos: 0 };
        cur.total += 1;
        if (m.estado === "matriculado") cur.activos += 1;
        map.set(eid, cur);
      }
      setResumenMap(map);
    } catch {
      setResumenMap(new Map());
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
    editForm.setFieldsValue({
      nombre: record.person.nombre,
      apellido: record.person.apellido,
      dni: record.person.dni,
      whatsapp: record.person.whatsapp,
      email: record.person.email,
      sede_id: record.person.sedeId || null,
    });
    // Apoderados pre-cargados con su pivot data (parentescoRelacion + esPrincipal)
    setApoderadosEdit(
      (record.apoderados || []).map((a) => ({
        apoderadoId: a.id,
        dni: a.dni,
        nombre: a.nombre,
        apellido: a.apellido,
        whatsapp: a.whatsapp,
        email: a.email,
        parentesco: a.parentescoRelacion || a.parentesco || null,
        esPrincipal: !!a.esPrincipal,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();

      await apiAcademy.put(`/persons/${currentEstudiante.person.id}`, {
        nombre: values.nombre,
        apellido: values.apellido,
        dni: values.dni,
        whatsapp: values.whatsapp,
        email: values.email,
        sedeId: values.sede_id,
      });

      if (currentEstudiante.id) {
        await apiAcademy.put(`/estudiantes/${currentEstudiante.id}`, {
          apoderados: apoderadosEdit,
        });
      } else {
        await apiAcademy.post("/estudiantes", {
          personId: currentEstudiante.person.id,
          apoderados: apoderadosEdit,
        });
      }

      notification.success({ message: "Estudiante actualizado" });
      setIsEditModalOpen(false);
      setApoderadosEdit([]);
      fetchEstudiantes();
    } catch (err) {
      notification.error({ message: "Error al actualizar estudiante" });
    }
  };

  // columna Ciclos -> usa el resumen precalculado en el padre
  const ciclosColumnRender = (record) => {
    return <CiclosResumen resumen={resumenMap.get(record.id)} />;
  };
  const [sedes, setSedes] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const loadSedes = async () => {
      try {
        const res = await apiAcademy.get("/sedes");
        setSedes(res.data.data || []);
      } catch (err) {
        message.error("Error al cargar sedes");
      }
    };
    loadSedes();
  }, []);

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

          // Construir lista de apoderados desde tel mamá / tel papá
          const apoderados = [];
          if (r.telMama) {
            apoderados.push({
              nombre: "Mamá",
              whatsapp: r.telMama,
              parentesco: "Madre",
              esPrincipal: true,
            });
          }
          if (r.telPapa) {
            apoderados.push({
              nombre: "Papá",
              whatsapp: r.telPapa,
              parentesco: "Padre",
              esPrincipal: apoderados.length === 0,
            });
          }

          // 1) Crear Person
          const personRes = await apiAcademy.post("/persons", {
            dni: r.dni,
            nombre,
            apellido,
            whatsapp: r.telefonoAlumno || "",
            email: r.email || "",
            tipo: "estudiante",
            sedeId: sedeSeleccionada,
          });

          const personId = personRes.data.data.id;

          // 2) Crear Estudiante con apoderados
          await apiAcademy.post("/estudiantes", {
            personId,
            apoderados,
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
      title: "Apoderados",
      key: "apoderados",
      render: (_, record) => {
        const apoderados = record.apoderados || [];
        if (apoderados.length === 0)
          return <span className="text-gray-400 text-xs">Sin apoderados</span>;
        return (
          <div className="text-xs leading-relaxed">
            {apoderados.map((a) => (
              <div key={a.id}>
                <span
                  className={
                    a.esPrincipal
                      ? "font-semibold text-primary"
                      : "font-medium"
                  }
                >
                  {a.nombre} {a.apellido || ""}
                </span>
                {a.parentescoRelacion ? (
                  <span className="text-gray-500"> ({a.parentescoRelacion})</span>
                ) : null}
                <div className="text-gray-500">{a.whatsapp}</div>
              </div>
            ))}
          </div>
        );
      },
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
        style={{ marginRight: 10 }}
        onClick={() => setIsCreateModalOpen(true)}
      >
        Crear Estudiante
      </Button>
      <Button
        type="primary"
        icon={<FileZipOutlined />}
        onClick={descargarTodosZip}
      >
        Descargar ZIP de todos
      </Button>
      <Button
        type="default"
        icon={<FileExcelOutlined />}
        style={{ marginLeft: 10 }}
        onClick={() => setModalOpen(true)}
      >
        Subir Estudiantes (Excel)
      </Button>
      <Modal
        title="Seleccionar Sede"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => {
          if (!sedeSeleccionada) {
            message.error("Selecciona una sede");
            return;
          }
          setModalOpen(false);
          // Luego de cerrar modal, simular click en upload
          document.getElementById("uploadEstudiantesInput").click();
        }}
        okText="Confirmar"
        cancelText="Cancelar"
      >
        <Select
          placeholder="Selecciona una sede"
          style={{ width: "100%" }}
          value={sedeSeleccionada}
          onChange={(val) => setSedeSeleccionada(val)}
        >
          {sedes.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.nameReferential}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* Upload oculto, se activa tras confirmar modal */}
      <Upload
        id="uploadEstudiantesInput"
        beforeUpload={handleUploadEstudiantes}
        showUploadList={false}
        accept=".xlsx,.xls"
        style={{ display: "none" }}
      >
        <span />
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
        onCancel={() => {
          setIsEditModalOpen(false);
          setApoderadosEdit([]);
        }}
        onOk={handleSaveEdit}
        width={760}
        okButtonProps={{ className: "bg-primary text-white" }}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm}>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label="Nombre"
              name="nombre"
              rules={[{ required: true }]}
            >
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
            <Form.Item
              label="Sede"
              name="sede_id"
              rules={[{ required: true, message: "Selecciona una sede" }]}
            >
              <Select placeholder="Selecciona una sede">
                {sedes.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.nameReferential}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>

        <div className="mt-4">
          <label className="text-md font-medium block mb-2">Apoderados</label>
          <ApoderadosManager
            value={apoderadosEdit}
            onChange={setApoderadosEdit}
          />
        </div>
      </Modal>
      <Modal
        title="Crear Estudiante"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setApoderadosCreate([]);
        }}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();

            const personRes = await apiAcademy.post("/persons", {
              nombre: values.nombre,
              apellido: values.apellido,
              dni: values.dni,
              whatsapp: values.whatsapp,
              email: values.email,
              tipo: "estudiante",
              sedeId: values.sede_id,
            });

            const personId = personRes.data.data.id;

            await apiAcademy.post("/estudiantes", {
              personId,
              apoderados: apoderadosCreate,
            });

            notification.success({
              message: "Estudiante creado correctamente",
            });
            setIsCreateModalOpen(false);
            createForm.resetFields();
            setApoderadosCreate([]);
            fetchEstudiantes();
          } catch (err) {
            notification.error({ message: "Error al crear estudiante" });
          }
        }}
        width={760}
        okButtonProps={{ className: "bg-primary text-white" }}
        destroyOnClose
      >
        <Form layout="vertical" form={createForm}>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label="Nombre"
              name="nombre"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Apellido" name="apellido">
              <Input />
            </Form.Item>
            <Form.Item label="DNI" name="dni" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="WhatsApp" name="whatsapp">
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input />
            </Form.Item>
            <Form.Item
              label="Sede"
              name="sede_id"
              rules={[{ required: true, message: "Selecciona una sede" }]}
            >
              <Select placeholder="Selecciona una sede">
                {sedes.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.nameReferential}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>

        <div className="mt-4">
          <label className="text-md font-medium block mb-2">Apoderados</label>
          <ApoderadosManager
            value={apoderadosCreate}
            onChange={setApoderadosCreate}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Estudiantes;

/**
 * Resumen de ciclos para un estudiante. Recibe el conteo precalculado
 * en el padre — no hace fetch propio.
 */
const CiclosResumen = ({ resumen }) => {
  if (!resumen) {
    return <div className="text-gray-400 text-sm">Sin matrículas</div>;
  }
  return (
    <div>
      <div>
        Total ciclos: <strong>{resumen.total}</strong>
      </div>
      <div>
        Matrículas activas: <strong>{resumen.activos}</strong>
      </div>
    </div>
  );
};
