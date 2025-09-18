import React, { useEffect, useState } from "react";
import { Table, TimePicker, Button, message } from "antd";

import dayjs from "dayjs";
import apiAcademy from "../../components/auth/apiAcademy";

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const { data } = await apiAcademy.get("/schedules");
    setSchedules(data.data);
  };

  const handleSave = async (record) => {
    try {
      await apiAcademy.put(`/schedules/${record.id}`, record);
      message.success("Horario actualizado correctamente.");
      fetchSchedules();
    } catch {
      message.error("Error al actualizar el horario.");
    }
  };

  const columns = [
    {
      title: "Día",
      dataIndex: "dia",
      key: "dia",
    },
    {
      title: "Hora Inicio",
      dataIndex: "hora_inicio",
      render: (_, record) => {
        console.log(record);
        return (
          <TimePicker
            value={
              record.horaInicio ? dayjs(record.horaInicio, "HH:mm:ss") : null
            }
            format="HH:mm"
            onChange={(time) => {
              record.horaInicio = time ? time.format("HH:mm:ss") : null;
              setSchedules([...schedules]);
            }}
          />
        );
      },
    },
    {
      title: "Hora Fin",
      dataIndex: "hora_fin",
      render: (_, record) => (
        <TimePicker
          value={record.horaFin ? dayjs(record.horaFin, "HH:mm:ss") : null}
          format="HH:mm"
          onChange={(time) => {
            record.horaFin = time ? time.format("HH:mm:ss") : null;
            setSchedules([...schedules]);
          }}
        />
      ),
    },
    {
      title: "Acción",
      render: (_, record) => (
        <Button type="primary" onClick={() => handleSave(record)}>
          Guardar
        </Button>
      ),
    },
  ];

  return <Table dataSource={schedules} columns={columns} rowKey="id" />;
}
