import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Row, Col, Space, message } from "antd";
import axios from "axios";

const SedesManager = () => {
  const initialSede = {
    name_referential: "",
    direction: "",
    department: "",
    province: "",
    district: "",
  };
  const apiUrl = process.env.REACT_APP_API_URL;
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [modalCreateVisible, setModalCreateVisible] = useState(false);
  const [modalEditVisible, setModalEditVisible] = useState(false);

  const [sedeCreate, setSedeCreate] = useState(initialSede);
  const [sedeEdit, setSedeEdit] = useState(initialSede);
  const [selectedId, setSelectedId] = useState(null);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/sedes`);
      console.log(response);

      const data = response.data;
      if (data.status == "success") {
        const reformData = data.data.map((d) => {
          return {
            direction: d.direction,
            name_referential: d.nameReferential,
            department: d.department,
            province: d.province,
            district: d.district,
          };
        });
        setSedes(reformData);
      } else {
        new Error("respuesta");
      }
    } catch (error) {
      console.log(error);
      message.error("Error al cargar las sedes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await axios.post(`${apiUrl}/sedes`, sedeCreate);
      message.success("Sede creada correctamente");
      fetchSedes();
      setModalCreateVisible(false);
      setSedeCreate(initialSede);
    } catch (error) {
      message.error("Error al crear sede");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedId) return;
    setUpdating(true);
    try {
      await axios.put(`${apiUrl}/sedes/${selectedId}`, sedeEdit);
      message.success("Sede actualizada correctamente");
      fetchSedes();
      setModalEditVisible(false);
      setSedeEdit(initialSede);
      setSelectedId(null);
    } catch (error) {
      message.error("Error al actualizar sede");
    } finally {
      setUpdating(false);
    }
  };

  const columns = [
    {
      title: "Nombre Referencial",
      dataIndex: "name_referential",
      key: "name_referential",
    },
    {
      title: "Dirección",
      dataIndex: "direction",
      key: "direction",
    },
    {
      title: "Departamento",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "Provincia",
      dataIndex: "province",
      key: "province",
    },
    {
      title: "Distrito",
      dataIndex: "district",
      key: "district",
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => (
        <Button
          onClick={() => {
            setSedeEdit(record);
            setSelectedId(record.id);
            setModalEditVisible(true);
          }}
        >
          Editar
        </Button>
      ),
    },
  ];

  const renderSedeInputs = (sede, setSede, disabled = false) => (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Input
        placeholder="Nombre Referencial"
        value={sede.name_referential}
        onChange={(e) =>
          setSede((prev) => ({ ...prev, name_referential: e.target.value }))
        }
        disabled={disabled}
      />
      <Input
        placeholder="Dirección"
        value={sede.direction}
        onChange={(e) =>
          setSede((prev) => ({ ...prev, direction: e.target.value }))
        }
        disabled={disabled}
      />
      <Input
        placeholder="Departamento"
        value={sede.department}
        onChange={(e) =>
          setSede((prev) => ({ ...prev, department: e.target.value }))
        }
        disabled={disabled}
      />
      <Input
        placeholder="Provincia"
        value={sede.province}
        onChange={(e) =>
          setSede((prev) => ({ ...prev, province: e.target.value }))
        }
        disabled={disabled}
      />
      <Input
        placeholder="Distrito"
        value={sede.district}
        onChange={(e) =>
          setSede((prev) => ({ ...prev, district: e.target.value }))
        }
        disabled={disabled}
      />
    </Space>
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2>Gestión de Sedes</h2>
        </Col>
        <Col>
          <Button type="primary" onClick={() => setModalCreateVisible(true)}>
            Crear Sede
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={sedes}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      {/* Modal de Crear */}
      <Modal
        title="Crear Sede"
        open={modalCreateVisible}
        onCancel={() => setModalCreateVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalCreateVisible(false)}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleCreate}
            loading={creating}
            disabled={creating}
          >
            Crear
          </Button>,
        ]}
      >
        {renderSedeInputs(sedeCreate, setSedeCreate, creating)}
      </Modal>

      {/* Modal de Editar */}
      <Modal
        title="Editar Sede"
        open={modalEditVisible}
        onCancel={() => setModalEditVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalEditVisible(false)}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleEdit}
            loading={updating}
            disabled={updating}
          >
            Guardar
          </Button>,
        ]}
      >
        {renderSedeInputs(sedeEdit, setSedeEdit, updating)}
      </Modal>
    </div>
  );
};

export default SedesManager;
