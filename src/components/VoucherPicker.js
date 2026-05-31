import React, { useEffect, useRef, useState } from "react";
import { Button, Space } from "antd";
import {
  UploadOutlined,
  CameraOutlined,
  CameraFilled,
  RetweetOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

/**
 * Selector de voucher reutilizable: permite subir un archivo desde el
 * dispositivo o tomar una foto con la cámara. Devuelve un File por onChange.
 *
 * Props:
 *  - value: File | null
 *  - onChange: (file: File | null) => void
 *  - accept: string (default imágenes + pdf)
 */
export default function VoucherPicker({
  value,
  onChange,
  accept = "image/*,application/pdf",
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState(
    /Mobi|Android/i.test(navigator.userAgent) ? "environment" : "user"
  );
  const [stream, setStream] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Preview para imágenes
  useEffect(() => {
    if (value && value.type?.startsWith("image/")) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [value]);

  const stopStream = (s) => {
    if (s) s.getTracks().forEach((t) => t.stop());
  };

  const startCamera = async (mode) => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      setStream((prev) => {
        stopStream(prev);
        return media;
      });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
    }
  };

  const openCamera = async () => {
    setShowCamera(true);
    await startCamera(facingMode);
  };

  const closeCamera = () => {
    setShowCamera(false);
    stopStream(stream);
    setStream(null);
  };

  const toggleCamera = async () => {
    const mode = facingMode === "user" ? "environment" : "user";
    setFacingMode(mode);
    await startCamera(mode);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `voucher-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onChange?.(file);
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange?.(file);
    e.target.value = "";
  };

  // Cleanup al desmontar
  useEffect(() => () => stopStream(stream), [stream]);

  if (value) {
    return (
      <div className="border rounded p-2 flex items-center gap-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="voucher"
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <span className="text-2xl">📄</span>
        )}
        <div className="flex-1 text-xs text-gray-600 truncate">
          {value.name}
        </div>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onChange?.(null)}
        >
          Quitar
        </Button>
      </div>
    );
  }

  return (
    <div>
      {showCamera ? (
        <div className="flex flex-col items-center gap-3">
          <video
            ref={videoRef}
            className="w-full max-w-xs h-56 bg-black rounded"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <Space wrap>
            <Button type="primary" icon={<CameraFilled />} onClick={takePhoto}>
              Tomar foto
            </Button>
            <Button icon={<RetweetOutlined />} onClick={toggleCamera}>
              Voltear
            </Button>
            <Button danger onClick={closeCamera}>
              Cancelar
            </Button>
          </Space>
        </div>
      ) : (
        <Space wrap>
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            Subir archivo
          </Button>
          <Button icon={<CameraOutlined />} onClick={openCamera}>
            Tomar foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            hidden
            onChange={handleFile}
          />
        </Space>
      )}
    </div>
  );
}
