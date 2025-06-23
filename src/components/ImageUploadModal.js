import React, { useRef, useState, useEffect } from "react";
import { Modal, Button, Spin } from "antd";
import {
  UploadOutlined,
  CameraOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  CameraFilled,
  RetweetOutlined,
} from "@ant-design/icons";

const ImageUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // default
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    // Establecer facingMode por defecto
    if (isMobile) {
      setFacingMode("environment");
    } else {
      setFacingMode("user");
    }
    // eslint-disable-next-line
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...previews]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const files = images.map((img) => img.file);
      await onUpload(files);
      setImages([]);
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error al cambiar la cámara:", err);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const preview = URL.createObjectURL(blob);
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImages((prev) => [...prev, { file, preview }]);
      }, "image/jpeg");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      closeCamera();
      setImages([]);
    }
  }, [isOpen]);

  return (
    <Modal
      title="Subir imágenes"
      open={isOpen}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cerrar
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<CloudUploadOutlined />}
          onClick={handleUpload}
          disabled={images.length === 0 || loading}
          loading={loading}
        >
          Subir imágenes
        </Button>,
      ]}
    >
      {/* Overlay de carga */}
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-white/70 z-50 flex items-center justify-center">
          <Spin size="large" tip="Subiendo imágenes..." />
        </div>
      )}
      {/* Galería de previews */}
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative w-[200px] h-[200px] rounded overflow-hidden border"
          >
            <img
              src={img.preview}
              alt={`preview-${idx}`}
              className="w-full h-full object-contain"
            />
            <button
              className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl hover:bg-red-600"
              onClick={() => handleRemoveImage(idx)}
              type="button"
            >
              <DeleteOutlined />
            </button>
          </div>
        ))}
      </div>

      {/* Vista de cámara */}
      {showCamera && (
        <div className="flex flex-col items-center mt-6 space-y-4">
          <video
            ref={videoRef}
            className="w-72 h-72 bg-black rounded shadow"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-4">
            <Button icon={<CameraFilled />} type="primary" onClick={takePhoto}>
              Tomar foto
            </Button>
            <Button icon={<RetweetOutlined />} onClick={toggleCamera}>
              Voltear cámara
            </Button>
            <Button danger onClick={closeCamera}>
              Cerrar cámara
            </Button>
          </div>
        </div>
      )}

      {/* Botones para subir desde dispositivo o activar cámara */}
      {!showCamera && (
        <div className="flex gap-4 justify-center mt-6">
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current.click()}
          >
            Subir fotos
          </Button>
          <input
            type="file"
            multiple
            // accept="image/*"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button icon={<CameraOutlined />} onClick={openCamera}>
            Capturar desde cámara
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ImageUploadModal;
