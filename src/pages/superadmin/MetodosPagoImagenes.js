import React, { useEffect, useState } from "react";
import {
  Upload,
  Button,
  message,
  Image,
  Input,
  InputNumber,
  Switch,
  Popconfirm,
  Space,
  Empty,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import apiAcademy from "../../components/auth/apiAcademy";

export default function MetodosPagoImagenes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [descripcionNueva, setDescripcionNueva] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/metodos-pago-imagenes");
      setItems(res.data.data || []);
    } catch {
      message.error("Error al cargar imágenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpload = async (file) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (descripcionNueva) fd.append("descripcion", descripcionNueva);
      fd.append("orden", String(items.length));
      await apiAcademy.post("/metodos-pago-imagenes", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Imagen subida");
      setDescripcionNueva("");
      fetchItems();
    } catch {
      message.error("Error al subir imagen");
    } finally {
      setSubiendo(false);
    }
    return false; // Adonis Upload no auto-uploadea
  };

  const handleUpdate = async (id, patch) => {
    try {
      await apiAcademy.put(`/metodos-pago-imagenes/${id}`, patch);
      fetchItems();
    } catch {
      message.error("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiAcademy.delete(`/metodos-pago-imagenes/${id}`);
      message.success("Imagen eliminada");
      fetchItems();
    } catch {
      message.error("Error al eliminar");
    }
  };

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-4">
        💡 Sube imágenes (screenshots) de tus métodos de pago. El sitio público
        las muestra y el bot las envía cuando alguien pregunta por inscripción.
      </div>

      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">
            Descripción (opcional, ej. "BCP", "Yape")
          </label>
          <Input
            value={descripcionNueva}
            onChange={(e) => setDescripcionNueva(e.target.value)}
            placeholder="BCP soles"
          />
        </div>
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          disabled={subiendo}
        >
          <Button
            icon={<UploadOutlined />}
            loading={subiendo}
            type="primary"
            className="bg-primary"
          >
            Subir nueva
          </Button>
        </Upload>
      </div>

      {loading ? null : items.length === 0 ? (
        <Empty description="Aún no has subido imágenes" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="border border-gray-200 rounded-lg p-3 bg-white"
            >
              <Image
                src={it.url}
                alt={it.descripcion || "Método de pago"}
                style={{ maxHeight: 200, objectFit: "contain" }}
                preview={{ mask: "Click para zoom" }}
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Input
                  size="small"
                  value={it.descripcion || ""}
                  placeholder="Descripción"
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) =>
                      prev.map((p) =>
                        p.id === it.id ? { ...p, descripcion: v } : p
                      )
                    );
                  }}
                  onBlur={(e) =>
                    handleUpdate(it.id, { descripcion: e.target.value })
                  }
                />
                <InputNumber
                  size="small"
                  value={it.orden}
                  min={0}
                  onChange={(v) =>
                    handleUpdate(it.id, { orden: Number(v) || 0 })
                  }
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <Space>
                  <span className="text-xs text-gray-500">Activo:</span>
                  <Switch
                    size="small"
                    checked={!!it.activo}
                    onChange={(v) => handleUpdate(it.id, { activo: v })}
                  />
                </Space>
                <Popconfirm
                  title="¿Eliminar imagen?"
                  onConfirm={() => handleDelete(it.id)}
                >
                  <Button size="small" danger>
                    Eliminar
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
