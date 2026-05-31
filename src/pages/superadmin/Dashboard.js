import React, { useEffect, useState } from "react";
import { Spin, Empty, Tag, message } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  FaMoneyBillWave,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaExclamationTriangle,
  FaInbox,
  FaFileSignature,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

const PEN = (v) =>
  "S/ " +
  Number(v || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const INT = (v) => Number(v || 0).toLocaleString("es-PE");
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
};

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#65a30d"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiAcademy.get("/dashboard");
        if (active) setData(res.data.data);
      } catch (err) {
        message.error("Error al cargar el dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spin size="large" tip="Cargando métricas…" />
      </div>
    );
  }

  if (!data) {
    return <Empty description="No se pudieron cargar las métricas" />;
  }

  const tasaAtencion =
    data.solicitudesTotales > 0
      ? Math.round(
          ((data.solicitudesTotales - data.solicitudesPendientes) / data.solicitudesTotales) * 100
        )
      : 100;

  const ventasChart = data.ventasPorMes.map((m) => ({
    mes: mesLabel(m.ym),
    Recaudado: m.total,
    Pagos: m.cantidad,
  }));

  const carreraChart = data.matriculasPorCarrera.filter((c) => c.cantidad > 0);
  const canalChart = data.matriculasPorCanal.filter((c) => c.cantidad > 0);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de control</h2>
          <p className="text-gray-500 text-sm">
            Resumen general · {dayjs().format("dddd, DD [de] MMMM YYYY")}
          </p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          icon={<FaMoneyBillWave />}
          color="emerald"
          label="Ventas del mes"
          value={PEN(data.ventasMes.recaudado)}
          sub={`${INT(data.ventasMes.matriculas)} matrículas nuevas`}
          trend={data.ventasMes.tendencia}
        />
        <Kpi
          icon={<FaUserGraduate />}
          color="blue"
          label="Estudiantes activos"
          value={INT(data.estudiantes)}
          sub="con 1 o más matrículas"
        />
        <Kpi
          icon={<FaLayerGroup />}
          color="violet"
          label="Ciclos activos"
          value={INT(data.ciclosActivos.cantidad)}
          sub={
            data.ciclosActivos.lista
              .map((c) => c.nombre)
              .slice(0, 2)
              .join(" · ") || "Sin ciclos activos"
          }
        />
        <Kpi
          icon={<FaChalkboardTeacher />}
          color="amber"
          label="Profesores"
          value={INT(data.profesores)}
          sub={
            data.contratosVencidos.cantidad > 0
              ? `${data.contratosVencidos.cantidad} con contrato vencido`
              : "contratos al día"
          }
        />
      </div>

      {/* KPIs de alerta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          icon={<FaExclamationTriangle />}
          color="red"
          label="Deuda del mes"
          value={PEN(data.deudaMes.monto)}
          sub={`${INT(data.deudaMes.matriculas)} alumnos pendientes este mes`}
        />
        <Kpi
          icon={<FaChartLine />}
          color="orange"
          label="Deuda vencida"
          value={PEN(data.deudaVencida.monto)}
          sub={`${INT(data.deudaVencida.cuotas)} cuotas vencidas sin pagar`}
        />
        <Kpi
          icon={<FaInbox />}
          color="sky"
          label="Solicitudes pendientes"
          value={INT(data.solicitudesPendientes)}
          sub={`${tasaAtencion}% de solicitudes atendidas`}
        />
        <Kpi
          icon={<FaFileSignature />}
          color="rose"
          label="Contratos vencidos"
          value={INT(data.contratosVencidos.cantidad)}
          sub={
            data.contratosPorVencer.cantidad > 0
              ? `${data.contratosPorVencer.cantidad} por vencer (≤30 días)`
              : "profesores que requieren renovación"
          }
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Recaudación de los últimos 6 meses" className="lg:col-span-2">
          {ventasChart.length === 0 ? (
            <Empty description="Sin pagos registrados" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ventasChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => (name === "Recaudado" ? PEN(value) : value)}
                />
                <Bar dataKey="Recaudado" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Matrículas por carrera">
          {carreraChart.length === 0 ? (
            <Empty description="Sin matrículas" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={carreraChart}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="45%"
                  outerRadius={85}
                  label={(e) => e.cantidad}
                >
                  {carreraChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Matrículas por canal">
          {canalChart.length === 0 ? (
            <Empty description="Sin datos de canales" />
          ) : (
            <RankBars items={canalChart} />
          )}
        </Card>

        <Card title="Ciclos activos">
          {data.ciclosActivos.lista.length === 0 ? (
            <Empty description="No hay ciclos activos" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.ciclosActivos.lista.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{c.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {dayjs(c.fecha_inicio).format("DD MMM YYYY")} →{" "}
                      {dayjs(c.fecha_fin).format("DD MMM YYYY")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Últimas matrículas">
          {data.ultimasMatriculas.length === 0 ? (
            <Empty description="Sin matrículas registradas" />
          ) : (
            <SimpleTable
              head={["Estudiante", "Carrera", "Estado"]}
              rows={data.ultimasMatriculas.map((m) => [
                <div key="e">
                  <p className="font-semibold text-gray-800">
                    {`${m.nombre || ""} ${m.apellido || ""}`.trim() || "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dayjs(m.created_at).format("DD-MM-YYYY")} · {m.ciclo_nombre || "—"}
                  </p>
                </div>,
                m.carrera_nombre || "—",
                m.estado === "matriculado" ? (
                  <Tag color="green">Matriculado</Tag>
                ) : (
                  <Tag color="orange">Pendiente</Tag>
                ),
              ])}
            />
          )}
        </Card>

        <Card title="Solicitudes pendientes">
          {data.ultimasSolicitudes.length === 0 ? (
            <Empty description="No hay solicitudes pendientes 🎉" />
          ) : (
            <SimpleTable
              head={["Prospecto", "Ciclo", "WhatsApp"]}
              rows={data.ultimasSolicitudes.map((s) => [
                <div key="p">
                  <p className="font-semibold text-gray-800">
                    {`${s.nombre || ""} ${s.apellido || ""}`.trim()}
                  </p>
                  <p className="text-xs text-gray-400">{dayjs(s.created_at).format("DD-MM-YYYY")}</p>
                </div>,
                s.ciclo_nombre || "—",
                s.whatsapp || "—",
              ])}
            />
          )}
        </Card>
      </div>

      {/* Alertas de contratos */}
      {(data.contratosVencidos.cantidad > 0 || data.contratosPorVencer.cantidad > 0) && (
        <Card title="Contratos de profesores que requieren atención">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">
                🔴 Vencidos ({data.contratosVencidos.cantidad})
              </p>
              {data.contratosVencidos.lista.length === 0 ? (
                <p className="text-gray-400 text-sm">Ninguno</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.contratosVencidos.lista.map((c) => (
                    <li key={c.id} className="flex justify-between items-center py-2 text-sm">
                      <span className="text-gray-700">{`${c.nombre} ${c.apellido || ""}`}</span>
                      <Tag color="red">venció {dayjs(c.fecha_fin).format("DD-MM-YYYY")}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">
                🟡 Por vencer ≤30 días ({data.contratosPorVencer.cantidad})
              </p>
              {data.contratosPorVencer.lista.length === 0 ? (
                <p className="text-gray-400 text-sm">Ninguno</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.contratosPorVencer.lista.map((c) => (
                    <li key={c.id} className="flex justify-between items-center py-2 text-sm">
                      <span className="text-gray-700">{`${c.nombre} ${c.apellido || ""}`}</span>
                      <Tag color="gold">{c.dias_restantes} días</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Componentes auxiliares ---------- */

const COLOR_MAP = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  orange: "bg-orange-50 text-orange-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
};

function Kpi({ icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center justify-between">
        <span className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${COLOR_MAP[color]}`}>
          {icon}
        </span>
        {typeof trend === "number" && (
          <span
            className={`text-sm font-bold flex items-center gap-1 ${
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? <FaArrowUp /> : <FaArrowDown />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800 mt-3 leading-tight">{value}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 border border-gray-100 ${className}`}>
      {title && <h3 className="text-base font-bold text-gray-800 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function RankBars({ items }) {
  const max = Math.max(...items.map((i) => i.cantidad), 1);
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{it.nombre}</span>
            <span className="font-bold text-gray-800">{INT(it.cantidad)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${(it.cantidad / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="text-left text-xs uppercase tracking-wide text-gray-400 font-bold pb-2 px-2"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, ri) => (
            <tr key={ri} className="border-t border-gray-100">
              {cells.map((cell, ci) => (
                <td key={ci} className="py-2.5 px-2 text-gray-600 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
