import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Skeleton,
  Tabs,
  Alert,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import apiAcademy from "../../components/auth/apiAcademy";
import MetodosPagoImagenes from "./MetodosPagoImagenes";

export default function Configuracion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiAcademy.get("/configuracion");
      form.setFieldsValue(res.data.data || {});
    } catch {
      message.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiAcademy.put("/configuracion", values);
      message.success("Configuración guardada");
    } catch (err) {
      if (err?.errorFields) return; // validación
      message.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton active />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">Configuración del sistema</h2>
          <p className="text-sm text-gray-500">
            Datos de la empresa, contactos y números para notificaciones por
            WhatsApp.
          </p>
        </div>
        <Button
          type="primary"
          className="bg-primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          Guardar cambios
        </Button>
      </div>

      <Form layout="vertical" form={form}>
        <Tabs
          defaultActiveKey="empresa"
          items={[
            {
              key: "empresa",
              label: "Empresa",
              children: (
                <Card>
                  <Form.Item
                    label="Nombre de la empresa"
                    name="nombreEmpresa"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="URL del logo"
                    name="logoUrl"
                    extra="Sube el logo a algún hosting o storage y pega la URL aquí"
                  >
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item label="Misión" name="mision">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item label="Visión" name="vision">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="Moneda por defecto"
                    name="monedaDefault"
                  >
                    <Input maxLength={10} placeholder="PEN" />
                  </Form.Item>
                </Card>
              ),
            },
            {
              key: "contacto",
              label: "Contacto",
              children: (
                <Card>
                  <Form.Item label="Email de contacto" name="emailContacto">
                    <Input type="email" placeholder="contacto@academia.com" />
                  </Form.Item>
                  <Form.Item
                    label="WhatsApp de contacto (público)"
                    name="whatsappContacto"
                    extra="Número que ven los visitantes del sitio público"
                  >
                    <Input placeholder="51999111222" />
                  </Form.Item>
                  <Form.Item label="Teléfono fijo" name="telefonoFijo">
                    <Input placeholder="084-123456" />
                  </Form.Item>
                  <Form.Item
                    label="Dirección principal"
                    name="direccionPrincipal"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Card>
              ),
            },
            {
              key: "notificaciones",
              label: "Notificaciones WhatsApp",
              children: (
                <Card>
                  <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    message="¿Cómo funciona?"
                    description="Cuando un estudiante envíe una solicitud desde el sitio público de matrícula, le llegará un WhatsApp al número que pongas aquí, además de la notificación in-app."
                  />
                  <Form.Item
                    label="WhatsApp para recibir notificaciones internas"
                    name="whatsappNotificaciones"
                    extra="Formato E.164 sin '+', ej: 51999111222 (Perú)"
                  >
                    <Input placeholder="51999111222" />
                  </Form.Item>
                </Card>
              ),
            },
            {
              key: "estados-cuenta",
              label: "Cuentas / Pagos",
              children: (
                <Card>
                  <Form.Item
                    label="Estados de cuenta / instrucciones de pago"
                    name="estadosCuenta"
                    extra="Texto libre con cuentas bancarias, alias Yape/Plin, etc. Se muestra en el sitio público y lo usa el bot al responder pagos."
                  >
                    <Input.TextArea
                      rows={6}
                      placeholder="BCP — Soles: 193-1234567-0-12"
                    />
                  </Form.Item>
                  <Form.Item label="Notas internas" name="notas">
                    <Input.TextArea rows={3} />
                  </Form.Item>

                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">
                      Imágenes de métodos de pago
                    </h3>
                    <MetodosPagoImagenes />
                  </div>
                </Card>
              ),
            },
            {
              key: "bot",
              label: "Bot WhatsApp",
              children: (
                <Card>
                  <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    message="Estos textos los usa el bot al responder por WhatsApp"
                    description="Cuando un usuario escribe al WhatsApp Business, el bot lee estos campos en lugar de tener texto pegado en el código."
                  />
                  <Form.Item
                    label="Beneficios (texto que el bot envía cuando preguntan por beneficios)"
                    name="beneficios"
                  >
                    <Input.TextArea
                      rows={8}
                      placeholder="💪📚 Calidad y experiencia&#10;✔️ Profesores especialistas&#10;..."
                    />
                  </Form.Item>
                  <Form.Item
                    label="URL del frontend admin"
                    name="adminUrl"
                    extra="Cuando llega una solicitud nueva al WhatsApp, el bot incluye un link directo al detalle. Ejemplo: https://admin.tudominio.com"
                  >
                    <Input placeholder="http://localhost:3000" />
                  </Form.Item>
                </Card>
              ),
            },
          ]}
        />
      </Form>
    </div>
  );
}
