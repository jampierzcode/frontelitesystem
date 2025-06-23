import React, { useState, useEffect } from "react";
import { Modal, Table, Select, Button, Checkbox, message } from "antd";
import { useAuth } from "../AuthContext";
import axios from "axios";

const { Option } = Select;

const ModalAsignarPedidos = ({
  open,
  onClose,
  pedidos,
  repartidores,
  fetchCampaignData,
}) => {
  const { auth } = useAuth();
  const apiUrl = process.env.REACT_APP_API_URL;
  const [filtroDepartamento, setFiltroDepartamento] = useState(null);
  const [filtroProvincia, setFiltroProvincia] = useState(null);
  const [filtroDistrito, setFiltroDistrito] = useState(null);
  const [pedidoSeleccionados, setPedidoSeleccionados] = useState([]);
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState(null);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [loadingAsignar, setLoadingAsignar] = useState(false); // 👈 NUEVO

  useEffect(() => {
    filtrarPedidos();
    // eslint-disable-next-line
  }, [pedidos, filtroDepartamento, filtroProvincia, filtroDistrito]);

  const filtrarPedidos = () => {
    const filtrados = pedidos.filter((pedido) => {
      return (
        pedido.asignacion === null &&
        (!filtroDepartamento || pedido.departamento === filtroDepartamento) &&
        (!filtroProvincia || pedido.provincia === filtroProvincia) &&
        (!filtroDistrito || pedido.distrito === filtroDistrito)
      );
    });
    setPedidosFiltrados(filtrados);
  };
  const handleAsignar = async () => {
    if (pedidoSeleccionados.length === 0) {
      return alert("Debe seleccionar al menos un pedido");
    }
    if (!repartidorSeleccionado) {
      return alert("Debe seleccionar un repartidor");
    }

    // Aquí enviarías los datos seleccionados a tu API
    console.log("Pedidos a asignar:", pedidoSeleccionados);
    console.log("Repartidor seleccionado:", repartidorSeleccionado);

    try {
      setLoadingAsignar(true);
      const response = await axios.post(
        `${apiUrl}/pedidosAsignarUser`,
        { pedidos: pedidoSeleccionados, repartidor_id: repartidorSeleccionado },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      console.log(response);
      const data = response.data;
      if (data.status === "success") {
        const pedidosRestantes = pedidosFiltrados.filter(
          (pedido) => !pedidoSeleccionados.includes(pedido.id)
        );
        await fetchCampaignData();
        setPedidosFiltrados(pedidosRestantes);
        setPedidoSeleccionados([]);
        message.success("Se asignaron los pedidos correctamente");
      } else {
        new Error("error en solicitud");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAsignar(false); // ✅ Desactiva el loading
    }
    // Simular que fueron asignados: eliminarlos de la lista
  };
  const handleSeleccionarTodos = () => {
    const ids = pedidosFiltrados.map((pedido) => pedido.id);
    setPedidoSeleccionados(ids);
  };
  const columnas = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Departamento",
      dataIndex: "departamento",
      key: "departamento",
    },
    {
      title: "Provincia",
      dataIndex: "provincia",
      key: "provincia",
    },
    {
      title: "Distrito",
      dataIndex: "distrito",
      key: "distrito",
    },
    {
      title: "Seleccionar",
      key: "seleccionar",
      render: (_, record) => (
        <Checkbox
          checked={pedidoSeleccionados.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setPedidoSeleccionados([...pedidoSeleccionados, record.id]);
            } else {
              setPedidoSeleccionados(
                pedidoSeleccionados.filter((id) => id !== record.id)
              );
            }
          }}
        />
      ),
    },
  ];

  const departamentos = [...new Set(pedidos.map((p) => p.departamento))];

  const provincias = filtroDepartamento
    ? [
        ...new Set(
          pedidos
            .filter((p) => p.departamento === filtroDepartamento)
            .map((p) => p.provincia)
        ),
      ]
    : [];

  const distritos = filtroProvincia
    ? [
        ...new Set(
          pedidos
            .filter((p) => p.provincia === filtroProvincia)
            .map((p) => p.distrito)
        ),
      ]
    : [];

  return (
    <Modal
      open={open}
      onCancel={() => onClose(false)}
      footer={null}
      width={900}
      title="Asignar Pedidos"
    >
      <div className="flex gap-4 mb-4">
        <Select
          placeholder="Departamento"
          className="w-1/3"
          value={filtroDepartamento}
          onChange={(value) => {
            setFiltroDepartamento(value);
            setFiltroProvincia(null);
            setFiltroDistrito(null);
          }}
          allowClear
        >
          {departamentos.map((dep) => (
            <Option key={dep} value={dep}>
              {dep}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Provincia"
          className="w-1/3"
          value={filtroProvincia}
          onChange={(value) => {
            setFiltroProvincia(value);
            setFiltroDistrito(null);
          }}
          allowClear
          disabled={!filtroDepartamento}
        >
          {provincias.map((prov) => (
            <Option key={prov} value={prov}>
              {prov}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Distrito"
          className="w-1/3"
          value={filtroDistrito}
          onChange={setFiltroDistrito}
          allowClear
          disabled={!filtroProvincia}
        >
          {distritos.map((dist) => (
            <Option key={dist} value={dist}>
              {dist}
            </Option>
          ))}
        </Select>
      </div>
      {/* Botón Seleccionar Todos */}
      <div className="mb-2">
        <Button onClick={handleSeleccionarTodos}>Seleccionar Todos</Button>
      </div>
      <Table
        dataSource={pedidosFiltrados}
        columns={columnas}
        rowKey="id"
        pagination={{
          pageSizeOptions: ["10", "25", "50", "100"],
          showSizeChanger: true,
          defaultPageSize: 10,
        }}
      />

      <div className="flex flex-col mt-4 gap-4">
        <Select
          placeholder="Seleccionar repartidor"
          value={repartidorSeleccionado}
          onChange={setRepartidorSeleccionado}
          className="w-full"
          allowClear
        >
          {repartidores.map((rep) => (
            <Option key={rep.id} value={rep.id}>
              {rep.name} {rep.sede.department} {rep.sede.province}{" "}
              {rep.sede.district}
            </Option>
          ))}
        </Select>

        {pedidoSeleccionados.length > 0 && repartidorSeleccionado && (
          <Button
            type="primary"
            onClick={handleAsignar}
            loading={loadingAsignar}
            disabled={loadingAsignar}
            className="w-full"
          >
            Asignar Pedidos
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default ModalAsignarPedidos;
