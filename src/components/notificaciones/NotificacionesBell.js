import React, { useState } from "react";
import { Dropdown, Badge, List, Button, Empty } from "antd";
import { BsBellFill } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import useNotificaciones from "./useNotificaciones";

export default function NotificacionesBell() {
  const { items, noLeidas, marcarLeida, marcarTodasLeidas } =
    useNotificaciones();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClickItem = async (n) => {
    if (!n.leida) await marcarLeida(n.id);
    setOpen(false);
    if (n.url) navigate(n.url);
  };

  const dropdownContent = (
    <div className="bg-white shadow-lg rounded-lg w-96 border border-gray-200 max-h-[500px] flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-semibold">Notificaciones</span>
        {items.length > 0 && noLeidas > 0 && (
          <Button
            type="link"
            size="small"
            onClick={marcarTodasLeidas}
            style={{ padding: 0 }}
          >
            Marcar todas leídas
          </Button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="p-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Sin notificaciones"
            />
          </div>
        ) : (
          <List
            dataSource={items}
            renderItem={(n) => (
              <List.Item
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: n.leida ? "white" : "#eff6ff",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onClick={() => handleClickItem(n)}
              >
                <div className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-sm ${
                        n.leida ? "text-gray-700" : "text-blue-700 font-semibold"
                      }`}
                    >
                      {n.titulo}
                    </span>
                    {!n.leida && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                    )}
                  </div>
                  {n.mensaje && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {n.mensaje}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {dayjs(n.createdAt).format("DD/MM HH:mm")}
                  </p>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      dropdownRender={() => dropdownContent}
      placement="bottomRight"
    >
      <div className="cursor-pointer relative">
        <Badge count={noLeidas} size="small" offset={[-2, 2]}>
          <BsBellFill className="text-xl text-gray-400" />
        </Badge>
      </div>
    </Dropdown>
  );
}
