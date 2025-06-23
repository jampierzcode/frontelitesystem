import React, { useState } from "react";
import { Modal } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { BiLineChart } from "react-icons/bi";

const EstadisticasModal = ({ pedidos }) => {
  const [open, setOpen] = useState(false);

  // Abrir modal
  const showModal = () => setOpen(true);
  const handleCancel = () => setOpen(false);

  // Procesamiento de datos
  const totalPedidos = pedidos.length;
  const entregados = pedidos.filter((p) => p.status === "entregado");
  const procesados = pedidos.filter((p) =>
    ["en camino", "en almacen", "en reparto"].includes(p.status)
  );

  // 2. Porcentajes por departamento
  const entregadosPorDepartamento = entregados.reduce((acc, pedido) => {
    const dept = pedido.departamento;
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(entregadosPorDepartamento).map(
    ([name, value]) => ({ name, value })
  );

  // 3. Entregas diarias
  const entregasDiarias = {};
  entregados.forEach((p) => {
    const entregado = p.status_pedido.find((s) => s.status === "entregado");
    if (entregado) {
      const fecha = entregado.createdAt.slice(0, 10); // yyyy-mm-dd
      entregasDiarias[fecha] = (entregasDiarias[fecha] || 0) + 1;
    }
  });
  const lineData = Object.entries(entregasDiarias).map(([date, count]) => ({
    date,
    count,
  }));

  // 4. Datos para mapa de conexión (simplificado como gráfico de barras por distrito)
  const distritosData = {};
  entregados.forEach((p) => {
    const key = `${p.departamento} - ${p.provincia} - ${p.distrito}`;
    distritosData[key] = (distritosData[key] || 0) + 1;
  });
  const barData = Object.entries(distritosData).map(([name, count]) => ({
    name,
    count,
  }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <>
      <button
        className="text-nowrap bg-blue-500 text-white px-4 py-2 rounded flex gap-3 items-center"
        onClick={showModal}
      >
        <BiLineChart /> Ver Estadísticas
      </button>
      <Modal
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={"1050px"}
        title="Estadísticas de Pedidos"
      >
        <div>
          <div className="flex">
            <div className="box px-3 py-3 rounded bg-primary text-white font-bold">
              Total pedidos: {totalPedidos}
            </div>
            <div className="box px-3 py-3 rounded bg-green-300 text-green-700 font-bold">
              Entregados: {entregados.length}
            </div>
            <div className="box px-3 py-3 rounded bg-yellow-300 text-yellow-700 font-bold">
              Procesados: {procesados.length}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="box">
              <h3 className="text-xl font-bold">Entregados por Departamento</h3>
              <PieChart width={500} height={300}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
            <div className="box">
              <h3 className="text-xl font-bold">Entregas Diarias</h3>
              <LineChart width={500} height={300} data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </div>
          </div>

          <h3 className="text-xl font-bold">
            Conexiones por Distrito (Entregados)
          </h3>
          <BarChart width={900} height={400} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#00C49F" />
          </BarChart>
        </div>
      </Modal>
    </>
  );
};

export default EstadisticasModal;
