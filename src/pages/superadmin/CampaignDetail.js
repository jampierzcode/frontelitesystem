import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Table,
  message,
  Spin,
  Modal,
  Select,
  Button,
  Row,
  Col,
  Image,
  Checkbox,
} from "antd";
import { ExclamationCircleOutlined, FileExcelFilled } from "@ant-design/icons";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaFileExcel,
  FaInbox,
  FaTruck,
  FaTruckLoading,
  FaUsers,
} from "react-icons/fa";
import {
  AiOutlineBarcode,
  AiOutlineDoubleRight,
  AiOutlineDownload,
  AiOutlineSearch,
  AiOutlineUpload,
} from "react-icons/ai";
import BarcodeScanner from "../../components/rolSuperAdmin/BarCodeScanner";
import { useAuth } from "../../components/AuthContext";
import ImageUploadModal from "../../components/rolRepartidor/ImageUploadModal";
import EstadisticasModal from "./EstadisticasModal";
import ModalAsignarPedidos from "../../components/rolSuperAdmin/ModalAsignarPedidos";
import { BiBarcode, BiLineChart } from "react-icons/bi";
import { FiRefreshCw } from "react-icons/fi";
import BarcodeScannerImport from "../../components/rolSuperAdmin/BarCodeScannerImport";
import dayjs from "dayjs";
const { confirm } = Modal;

const { Option } = Select;
const CampaignDetails = () => {
  const { auth } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenImportCodes, setIsModalOpenImportCodes] = useState(false);
  const [isModalOpenLlenarData, setIsModalOpenLlenarData] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL;
  const { id } = useParams(); // Obtener ID de la URL
  const [campaign, setCampaign] = useState(null);
  const apiUrlUpload = process.env.REACT_APP_UP_MULTIMEDIA;

  const [pedidoId, setPedidoId] = useState(null);
  const [showAsignar, setShowAsignar] = useState(false);
  const [showImportCodes, setShowImportCodes] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [visiblePedidos, setVisiblePedidos] = useState([]);
  const [pedidosRegistrados, setPedidosRegistrados] = useState([]);

  const [pedidosCargados, setPedidosCargados] = useState([]);
  const [pedidosCargadosImport, setPedidosCargadosImport] = useState([]);

  // pedidos que se suben al excel useState
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisibleMorePhotos, setModalVisibleMorePhotos] = useState(false);
  const [
    pedidoIdParaActualizarMultimedia,
    setPedidoIdParaActualizarMultimedia,
  ] = useState(null);

  // estados para eliminar imagenes
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const toggleImageSelection = (item) => {
    setSelectedImages((prev) => {
      const exists = prev.some((img) => img.url === item.url);
      return exists
        ? prev.filter((img) => img.url !== item.url)
        : [...prev, item];
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0) {
      message.warning("No has seleccionado ninguna imagen.");
      return;
    }

    setLoadingDelete(true);

    try {
      const deleteMultimedia = await axios.post(
        `${apiUrl}/deleteMultimediaMasive`,
        { pedidos: selectedImages },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if ((deleteMultimedia.status = "success")) {
        const payload = {
          urls: selectedImages.map((img) => img.url),
        };
        const response = await axios.delete(`${apiUrlUpload}/index.php`, {
          headers: {
            "Content-Type": "application/json", // <--- JSON, no multipart
          },
          data: payload,
        });
        const data = response.data;
        if (data.success) {
          message.success("Imágenes eliminadas correctamente");
          await fetchCampaignData(); // vuelve a cargar los datos del pedido
          setPedidoIdParaActualizarMultimedia(pedidoId);

          setSelectedImages([]);
        }
      } else {
        new Error(deleteMultimedia.error);
      }
    } catch (error) {
      console.error("Error al eliminar imágenes:", error);
      message.error("Ocurrió un error al eliminar las imágenes.");
    } finally {
      setLoadingDelete(false);
    }
  };

  const [modalVisibleSede, setModalVisibleSede] = useState(false);
  const [modalVisibleSedeCompletar, setModalVisibleSedeCompletar] =
    useState(false);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [sedeSeleccionadaDestino, setSedeSeleccionadaDestino] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [pedidosExcel, setPedidosExcel] = useState([]);
  const [pedidosExcelCompletar, setPedidosExcelCompletar] = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [asignadosCompletar, setAsignadosCompletar] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedRowsCompletar, setSelectedRowsCompletar] = useState([]);
  const [fileSelect, setFileSelect] = useState(null);
  const [fileSelectCompletar, setFileSelectCompletar] = useState(null);

  // ✅ Leer Excel

  const [tempPedidos, setTempPedidos] = useState([]);
  const [tempAsignados, setTempAsignados] = useState([]);
  const [tempPedidosCompletar, setTempPedidosCompletar] = useState([]);
  const [pedidosNoEncontradosByCode, setPedidosNoEncontradosByCode] = useState(
    []
  );
  const [tempAsignadosCompletar, setTempAsignadosCompletar] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showModalCompletar, setShowModalCompletar] = useState(false);
  const [selectedOrigenId, setSelectedOrigenId] = useState(null);
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFileSelect(file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Esta opción convierte todo a texto legible, incluyendo fechas
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const nuevosPedidos = [];
      const nuevosAsignados = [];

      jsonData.forEach((row, index) => {
        const pedido = {
          id: index + 1,
          id_solicitante: String(row["ID Solicitante"] || ""),
          entrega: String(row["Entrega"] || ""),
          org_ventas: String(row["Org.Ventas"] || ""),
          fecha_pedido: String(row["Fecha Pedido"] || ""),
          dni: String(row["DNI"] || ""),
          bulto: String(row["BULTO"] || ""),
          empaque: String(row["EMPAQUE"] || ""),
          auditoria: String(row["AUDITORIA"] || ""),
          mail_plan: String(row["Mail Plan"] || ""),
          nombre_solicitante: String(row["Nombre Solicitante"] || ""),
          departamento: String(row["Departamento"] || ""),
          provincia: String(row["Provincia"] || ""),
          distrito: String(row["Distrito"] || ""),
          direccion: String(row["Dirección"] || ""),
          referencia: String(row["Referencia"] || ""),
          celular: String(row["Celular"] || ""),
          ubigeo: String(row["Ubigeo"] || ""),
          zona_ventas: String(row["Zona de ventas"] || ""),
          marca: String(row["Marca"] || ""),
          mp: String(row["MP"] || ""),
          num_cajas: String(row["Número de cajas"] || ""),
          status: "registrado",
          sede_id: null,
        };

        const sede = sedes.find((s) => s.department === pedido.departamento);

        if (sede) {
          nuevosAsignados.push({
            ...pedido,
            destino_id: sede.id,
          });
        } else {
          nuevosPedidos.push(pedido);
        }
      });

      console.log(nuevosPedidos);
      setTempPedidos(nuevosPedidos);
      setTempAsignados(nuevosAsignados);
      setShowModal(true); // mostrar modal para seleccionar origen
    };

    reader.readAsArrayBuffer(file);
  };
  const handleFileUploadCompletar = (event) => {
    const file = event.target.files[0];
    setFileSelectCompletar(file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Esta opción convierte todo a texto legible, incluyendo fechas
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const nuevosPedidos = [];
      const nuevosAsignados = [];
      const pedidosNoEcontrados = [];

      jsonData.forEach((row, index) => {
        const pedido = {
          id: index + 1,
          id_solicitante: String(row["ID Solicitante"] || ""),
          entrega: String(row["Entrega"] || ""),
          org_ventas: String(row["Org.Ventas"] || ""),
          fecha_pedido: String(row["Fecha Pedido"] || ""),
          dni: String(row["DNI"] || ""),
          bulto: String(row["BULTO"] || ""),
          empaque: String(row["EMPAQUE"] || ""),
          auditoria: String(row["AUDITORIA"] || ""),
          mail_plan: String(row["Mail Plan"] || ""),
          nombre_solicitante: String(row["Nombre Solicitante"] || ""),
          departamento: String(row["Departamento"] || ""),
          provincia: String(row["Provincia"] || ""),
          distrito: String(row["Distrito"] || ""),
          direccion: String(row["Dirección"] || ""),
          referencia: String(row["Referencia"] || ""),
          celular: String(row["Celular"] || ""),
          ubigeo: String(row["Ubigeo"] || ""),
          zona_ventas: String(row["Zona de ventas"] || ""),
          marca: String(row["Marca"] || ""),
          // mp: String(row["MP"] || ""),
          num_cajas: String(row["Número de cajas"] || ""),
        };
        const isExistPedidos = pedidos.filter(
          (p) => p.idSolicitante === pedido.id_solicitante
        );
        if (isExistPedidos.length === 1) {
          const sede = sedes.find((s) => s.department === pedido.departamento);

          if (sede) {
            nuevosAsignados.push({
              ...pedido,
              destino_id: sede.id,
            });
          } else {
            nuevosPedidos.push(pedido);
          }
        } else {
          pedidosNoEcontrados.push(pedido);
        }
      });

      console.log(nuevosPedidos);
      console.log(nuevosAsignados);
      setPedidosNoEncontradosByCode(pedidosNoEcontrados);
      setTempPedidosCompletar(nuevosPedidos);
      setTempAsignadosCompletar(nuevosAsignados);
      setShowModalCompletar(true); // mostrar modal para seleccionar origen
    };

    reader.readAsArrayBuffer(file);
  };

  // Cuando confirma la selección de origen
  const handleConfirmOrigen = () => {
    if (!selectedOrigenId) {
      alert("Por favor selecciona un origen.");
      return;
    }

    const asignadosConOrigen = tempAsignados.map((asignado) => ({
      ...asignado,
      origen_id: selectedOrigenId,
    }));

    setPedidosExcel(tempPedidos);
    setAsignados(asignadosConOrigen);
    setShowModal(false);
    setSelectedOrigenId(null);
  };
  const handleConfirmOrigenCompletar = () => {
    if (!selectedOrigenId) {
      alert("Por favor selecciona un origen.");
      return;
    }

    const asignadosConOrigen = tempAsignadosCompletar.map((asignado) => ({
      ...asignado,
      origen_id: selectedOrigenId,
    }));

    setPedidosExcelCompletar(tempPedidosCompletar);
    setAsignadosCompletar(asignadosConOrigen);
    setShowModalCompletar(false);
    setSelectedOrigenId(null);
  };

  // ✅ Asignar pedidos a una sede
  const asignarPedidos = () => {
    if (!sedeSeleccionada) {
      message.warning("Selecciona un origen");
      return;
    }
    if (!sedeSeleccionadaDestino) {
      message.warning("Selecciona un destino");
      return;
    }

    const pedidosAsignados = pedidosExcel
      .filter((p) => selectedRows.includes(p.id))
      .map((p) => ({
        ...p,
        origen_id: sedeSeleccionada,
        destino_id: sedeSeleccionadaDestino,
      }));

    console.log(pedidosAsignados);

    setAsignados([...asignados, ...pedidosAsignados]);
    setPedidosExcel(pedidosExcel.filter((p) => !selectedRows.includes(p.id)));
    setSelectedRows([]);
    setModalVisibleSede(false);
  };
  const asignarPedidosCompletar = () => {
    if (!sedeSeleccionada) {
      message.warning("Selecciona un origen");
      return;
    }
    if (!sedeSeleccionadaDestino) {
      message.warning("Selecciona un destino");
      return;
    }

    const pedidosAsignadosCompletar = pedidosExcelCompletar
      .filter((p) => selectedRowsCompletar.includes(p.id))
      .map((p) => ({
        ...p,
        origen_id: sedeSeleccionada,
        destino_id: sedeSeleccionadaDestino,
      }));

    console.log(pedidosAsignadosCompletar);

    setAsignadosCompletar([
      ...asignadosCompletar,
      ...pedidosAsignadosCompletar,
    ]);
    setPedidosExcelCompletar(
      pedidosExcelCompletar.filter((p) => !selectedRowsCompletar.includes(p.id))
    );
    setSelectedRowsCompletar([]);
    setModalVisibleSedeCompletar(false);
  };

  // ✅ Enviar pedidos a la API
  const subirPedidos = async () => {
    if (pedidosExcel.length > 0) {
      message.warning("Aún hay pedidos sin asignar");
      return;
    }
    if (fileSelect === null) {
      message.warning("No se subio ningun archivo excel");
      return;
    }

    const response = await fetch(`${apiUrl}/pedidosMasiveByCampaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: id, pedidos: asignados }),
    });
    console.log(response);

    message.success("Pedidos enviados correctamente");
    setPedidosExcel([]);
    setAsignados([]);
    await fetchCampaignData();
    setModalVisible(false);
  };
  const [loadingRecogerPedidosCodes, setloadingRecogerPedidosCodes] =
    useState(false);
  const [loadingCompletar, setLoadingCompletar] = useState(false);

  const subirPedidosToCompletar = async () => {
    setLoadingCompletar(true);
    // if (pedidosNoEncontradosByCode.length > 0) {
    //   message.warning(
    //     "Existen pedidos que no se cargaron, porque no se encontraron dentro de los codigos de barra precargados"
    //   );
    //   console.log(pedidosNoEncontradosByCode);
    //   return;
    // }
    if (pedidosExcelCompletar.length > 0) {
      message.warning("Aún hay pedidos sin asignar");
      return;
    }
    if (fileSelectCompletar === null) {
      message.warning("No se subio ningun archivo excel");
      return;
    }

    const response = await fetch(`${apiUrl}/pedidosUpdateInfoMasive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidos: asignadosCompletar }),
    });
    console.log(response);
    setLoadingCompletar(false);
    message.success("Pedidos actualizados correctamente");
    setPedidosExcelCompletar([]);
    setAsignadosCompletar([]);
    setPedidosNoEncontradosByCode([]);
    setFileSelectCompletar(null);
    await fetchCampaignData();
    setIsModalOpenLlenarData(false);
  };

  // modal estados modales masivos
  const [fechaSendStatus, setFechaSendStatus] = useState(null);
  const [tipoFechaSendStatus, setTipoFechaSendStatus] =
    useState("FECHA ACTUAL");

  const [isModalOpenSendStatus, setIsModalOpenSendStatus] = useState(false); //booleano para abrir modal donde se seleccionan de los pedidos filtrados para cambiar status
  const [loadingPedidosSendStatus, setLoadingPedidosSendStatus] =
    useState(false); //carga de envio de pedidos seleccionados a cambiar status
  const [pedidosSendStatus, setPedidosSendStatus] = useState([]); // pedidos filtrados para cambiar status
  const [pedidosSeleccionadosSendStatus, setPedidosSeleccionadosSendStatus] =
    useState([]); // pedidos seleccionados del pedidos filtrado para cambiar status
  const [filterSendStatusChange, setFilterSendStatusChange] = useState(null); // estado para saber a que tipo de status se actualizaran los pedidos
  const [filtroDepartamentoSendStatus, setFiltroDepartamentoSendStatus] =
    useState(null);
  const [filtroProvinciaSendStatus, setFiltroProvinciaSendStatus] =
    useState(null);
  const [filtroDistritoSendStatus, setFiltroDistritoSendStatus] =
    useState(null);
  const [pedidosFiltradosSendStatus, setPedidosFiltradosSendStatus] = useState(
    []
  );

  useEffect(() => {
    filtrarPedidosSendStatus();
    // eslint-disable-next-line
  }, [
    pedidosSendStatus,
    filtroDepartamentoSendStatus,
    filtroProvinciaSendStatus,
    filtroDistritoSendStatus,
  ]);

  const filtrarPedidosSendStatus = () => {
    setPedidosSeleccionadosSendStatus([]);
    const filtrados = pedidosSendStatus.filter((pedido) => {
      return (
        (!filtroDepartamentoSendStatus ||
          pedido.departamento === filtroDepartamentoSendStatus) &&
        (!filtroProvinciaSendStatus ||
          pedido.provincia === filtroProvinciaSendStatus) &&
        (!filtroDistritoSendStatus ||
          pedido.distrito === filtroDistritoSendStatus)
      );
    });
    setPedidosFiltradosSendStatus(filtrados);
  };
  const handleSeleccionarTodosSendStatus = () => {
    const ids =
      pedidosSeleccionadosSendStatus.length > 0
        ? []
        : pedidosFiltradosSendStatus.map((pedido) => pedido.id);

    setPedidosSeleccionadosSendStatus(ids);
  };

  const departamentosSendStatus = [
    ...new Set(pedidosSendStatus.map((p) => p.departamento)),
  ];

  const provinciasSendStatus = filtroDepartamentoSendStatus
    ? [
        ...new Set(
          pedidosSendStatus
            .filter((p) => p.departamento === filtroDepartamentoSendStatus)
            .map((p) => p.provincia)
        ),
      ]
    : [];

  const distritosSendStatus = filtroProvinciaSendStatus
    ? [
        ...new Set(
          pedidosSendStatus
            .filter((p) => p.provincia === filtroProvinciaSendStatus)
            .map((p) => p.distrito)
        ),
      ]
    : [];

  const handlePedidosSendStatus = (filter) => {
    //funcion que  recibe el filtro que se debe hacer para seleccionar despues los pedidos a cambiar status
    setFilterSendStatusChange(filter);
    setIsModalOpenSendStatus(true);
    const pedidosFiltrados = pedidos.filter((p) => p.status === filter);
    setPedidosSendStatus(pedidosFiltrados);
  };
  const [pedidosEnAlmacen, setPedidosEnAlmacen] = useState([]);
  const handleShowAsignar = () => {
    const pedidosFiltrados = pedidos.filter((p) => p.status === "en almacen");
    setPedidosEnAlmacen(pedidosFiltrados);
    setShowAsignar(true);
  };

  const pintarSendStatus = () => {
    let statusNew;
    switch (filterSendStatusChange) {
      case "registrado":
        statusNew = "recepcionado";
        return (
          <div className="w-full max-w-max text-xl text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-200 text-gray-600">
            <FaInbox />
            Recoger pedidos
          </div>
        );

        break;
      case "recepcionado":
        statusNew = "en camino"; //en ruta(en camino)
        return (
          <div className="w-full max-w-max text-xl text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-200 text-gray-600">
            <FaTruck />
            Enviar a ruta
          </div>
        );
        break;
      case "en camino":
        statusNew = "en almacen"; //en almacen destino
        return (
          <div className="w-full max-w-max text-xl text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-200 text-gray-600">
            <FaTruckLoading />
            Recepcionado en destino
          </div>
        );
        break;
      case "en almacen":
        statusNew = "entregado"; //entregado
        return (
          <div className="w-full max-w-max text-xl text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-200 text-gray-600">
            <FaBoxOpen />
            Entregar
          </div>
        );
        break;

      default:
        break;
    }
  };

  const actualizarStatusPedidosMasive = async () => {
    //funcion que envia los pedidos seleccionados del filtro para cambiar status

    if (pedidosSeleccionadosSendStatus.length === 0) {
      message.warning(
        "No hay pedidos seleccionados para enviar con status:recepcionado"
      );
      return;
    }
    if (
      tipoFechaSendStatus === "FECHA ESPECIFICA" &&
      fechaSendStatus === null
    ) {
      message.warning(
        "Ha seleccionado una fecha especifica, porfavor llenar el campo de fecha + hora"
      );
      return;
    }
    setLoadingPedidosSendStatus(true);
    try {
      var statusNew = "";
      switch (filterSendStatusChange) {
        case "registrado":
          statusNew = "recepcionado";
          break;
        case "recepcionado":
          statusNew = "en camino"; //en ruta(en camino)
          break;
        case "en camino":
          statusNew = "en almacen"; //en ruta(en camino)
          break;
        case "en almacen":
          statusNew = "entregado"; //en ruta(en camino)
          break;

        default:
          break;
      }

      const response = await axios.post(
        `${apiUrl}/pedidosTracking`,
        {
          pedidos: pedidosSeleccionadosSendStatus,
          status: statusNew,
          fecha:
            fechaSendStatus !== null
              ? dayjs(fechaSendStatus).format("YYYY-MM-DD HH:mm:ss")
              : null,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      console.log(response);
      setLoadingPedidosSendStatus(false);
      message.success(`Pedidos actualizados correctamente ${statusNew}`);

      await fetchCampaignData();
      setIsModalOpenSendStatus(false);
      setFechaSendStatus(null);
    } catch (error) {
      message.error("Ocurrio un error inesperado, contactar con proveedor");
    }
  };

  const buscar_sedes = async () => {
    try {
      const response = await axios.get(`${apiUrl}/sedes`);
      console.log(response);
      if (response.data.status === "success") {
        setSedes(response.data.data);
      } else {
        console.log(response.data.message);
      }
    } catch (error) {
      console.error("Error al obtener las sedes:", error);
    }
  };
  useEffect(() => {
    buscar_sedes();
  }, [0]);
  const buscar_repartidores = async () => {
    try {
      const response = await axios.get(`${apiUrl}/users/repartidor`);
      console.log(response);
      if (response.data.status === "success") {
        setRepartidores(response.data.data);
      } else {
        console.log(response.data.message);
      }
    } catch (error) {
      console.error("Error al obtener los repartidores:", error);
    }
  };
  useEffect(() => {
    buscar_repartidores();
  }, [0]);
  // ✅ Subir mas fotos a la API
  const handleUploadMorePhotos = async (files) => {
    const formData = new FormData();
    const searchPedido = pedidos.find((p) => p.id === pedidoId);

    formData.append("folder", `${searchPedido.idSolicitante}`);

    files.forEach((file) => {
      formData.append("files[]", file);
    });

    try {
      const response = await axios.post(`${apiUrlUpload}/index.php`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const data = response.data;
      console.log(data);
      if (data.success) {
        console.log(data.files);
        const responseEnviiosMultimedia = await axios.post(
          `${apiUrl}/pedidosMultimedia`,
          { files: data.files, pedido_id: pedidoId },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.token}`,
            },
          }
        );
        console.log(response);
        const dataMultimedia = responseEnviiosMultimedia.data;
        if (dataMultimedia.status === "success") {
          message.success("Se subieron las imagenes correctamente");
          await fetchCampaignData();
          setPedidoIdParaActualizarMultimedia(pedidoId);

          setModalVisibleMorePhotos(false);
        } else {
          new Error("error de compilacion");
        }
      }
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      message.error("Ocurrió un error al subir las imágenes.");
    }
  };

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchField, setSearchField] = useState("idSolicitante");
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");

  const applyFilters = () => {
    let filtered = pedidos;

    // Filtro por campo textual (ID, nombre, estado)
    if (searchTerm.trim() !== "") {
      if (
        searchField === "idSolicitante" ||
        searchField === "nombreSolicitante"
      ) {
        const regex = /^[a-zA-Z0-9\s]*$/;
        if (!regex.test(searchTerm)) {
          setSearchTerm("");
          return;
        }

        const searchRegex = new RegExp(searchTerm, "i");
        filtered = filtered.filter((pedido) => {
          const value = pedido[searchField];
          return (
            value !== null &&
            value !== undefined &&
            searchRegex.test(value.toString())
          );
        });
      }

      if (searchField === "status") {
        filtered = filtered.filter((pedido) => {
          return (
            pedido.status &&
            pedido.status.toLowerCase() === searchTerm.toLowerCase()
          );
        });
      }
    }

    // Filtro por departamento
    if (departamento) {
      filtered = filtered.filter(
        (pedido) => pedido.departamento === departamento
      );
    }

    // Filtro por provincia
    if (provincia) {
      filtered = filtered.filter((pedido) => pedido.provincia === provincia);
    }

    // Filtro por distrito
    if (distrito) {
      filtered = filtered.filter((pedido) => pedido.distrito === distrito);
    }

    setVisiblePedidos(filtered);
  };
  const handleResetFilters = () => {
    setSearchTerm("");
    setDepartamento("");
    setProvincia("");
    setDistrito("");
    setSearchField("idSolicitante");
  };

  // useEffect para manejar el filtrado y paginación
  useEffect(() => {
    applyFilters(); // Aplicar filtros cuando cambian filtros de texto o ubicación
  }, [
    pedidos,
    visiblePedidos,
    searchTerm,
    searchField,
    departamento,
    provincia,
    distrito,
  ]);

  const departamentosUnicos = useMemo(() => {
    const set = new Set();
    visiblePedidos.forEach((p) => set.add(p.departamento));
    return Array.from(set);
  }, [visiblePedidos]);

  const provinciasUnicas = useMemo(() => {
    const set = new Set();
    visiblePedidos.forEach((p) => {
      if (p.departamento === departamento) set.add(p.provincia);
    });
    return Array.from(set);
  }, [visiblePedidos, departamento]);

  const distritosUnicos = useMemo(() => {
    const set = new Set();
    visiblePedidos.forEach((p) => {
      if (p.departamento === departamento && p.provincia === provincia) {
        set.add(p.distrito);
      }
    });
    return Array.from(set);
  }, [visiblePedidos, departamento, provincia]);

  useEffect(() => {
    if (pedidoIdParaActualizarMultimedia && pedidos.length > 0) {
      const pedidoActualizado = pedidos.find(
        (p) => p.id === pedidoIdParaActualizarMultimedia
      );
      if (pedidoActualizado) {
        setMultimedia(pedidoActualizado.multimedia);
        setPedidoIdParaActualizarMultimedia(null); // Limpiar
        setModalVisibleMorePhotos(false); // Cerrar modal si quieres aquí
      }
    }
  }, [pedidos, pedidoIdParaActualizarMultimedia]);

  const handleReadPedidos = () => {
    setIsModalOpen(true);
  };

  const handleGenerateCodigos = () => {
    navigate(`/generar-codigos/${id}`);
  };

  const fetchCampaignData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/campaigns/${id}`);
      console.log(response);
      const allPedidos = response.data.pedidos || [];
      const registrados = allPedidos.filter(
        (pedido) => pedido.status === "registrado"
      );

      setCampaign(response.data);
      setPedidos(allPedidos);
      setVisiblePedidos(allPedidos);
      setPedidosRegistrados(registrados);
    } catch (error) {
      console.error("Error al obtener la campaña:", error);
      message.error("No se pudo cargar la campaña.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const handleMorePhotos = () => {
    setModalVisibleMorePhotos(true);
  };

  const [isOpenMultimedia, setIsOpenMultimedia] = useState(false);
  const [multimedia, setMultimedia] = useState([]);

  const sendPedidoEntregar = async (id) => {
    try {
      const response = await axios.post(
        `${apiUrl}/pedidoEntregar`,
        { pedido_id: id },
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
        await fetchCampaignData();
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleEntregar = async (id) => {
    confirm({
      title: "Entregar pedido",
      icon: <ExclamationCircleOutlined />,
      content: "Esta seguro de entregar este pedido?",
      okText: "Sí",
      cancelText: "No",
      async onOk() {
        // 👇 Aquí va tu lógica de subida de pedidos cargados
        console.log("Subiendo pedidos cargados...");
        await sendPedidoEntregar(id);
      },
    });
  };

  const handleVerFotos = (multimedia, id) => {
    setPedidoId(id);
    setIsOpenMultimedia(true);
    setMultimedia(multimedia);
  };
  const handleCloseMultimedia = () => {
    setIsOpenMultimedia(false);
    setMultimedia([]);
  };

  const columns = [
    {
      title: "ID Pedido",
      key: "idSolicitante",
      render: (_, record) => {
        return (
          <>
            <button
              onClick={() => handleVerFotos(record.multimedia, record.id)}
              className="px-3 py-2 rounded text-white bg-gray-700"
            >
              Ver fotos: {record?.multimedia?.length}
            </button>
            {record.status === "en reparto" ? (
              <button
                onClick={() => handleEntregar(record.id)}
                className="px-3 py-2 rounded text-white bg-primary"
              >
                Entregar
              </button>
            ) : null}
            {}
          </>
        );
      },
    },
    {
      title: "ID Pedido",
      dataIndex: "idSolicitante",
      key: "idSolicitante",
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (_, record) => {
        let colorClass = "";
        let status = record.status;

        switch (status.toLowerCase()) {
          case "registrado":
            colorClass = "bg-gray-700 text-white";
            break;
          case "recepcionado":
            colorClass = "bg-yellow-400 text-ywllow-600"; // mostaza
            break;
          case "en camino":
            colorClass = "bg-blue-600 text-white";
            break;
          case "en almacen":
            colorClass = "bg-primary text-white"; // usando tu clase personalizada
            break;
          case "en reparto":
            colorClass = "bg-purple-600 text-white"; // usando tu clase personalizada
            break;
          case "entregado":
            colorClass = "bg-green-600 text-white";
            break;
          default:
            colorClass = "bg-gray-300 text-gray-900";
        }

        return (
          <>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
            >
              {status}
            </span>
            {record?.asignacion !== null ? (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white`}
              >
                Asignado
              </span>
            ) : null}
          </>
        );
      },
    },
    {
      title: "Nombre Solicitante",
      dataIndex: "nombreSolicitante",
      key: "nombreSolicitante",
    },
    {
      title: "Dirección",
      dataIndex: "direccion",
      render: (_, record) => {
        return (
          <>
            <span>{record.direccion}</span>
            <h1>
              {record.departamento}-{record.provincia}-{record.distrito}
            </h1>
          </>
        );
      },
    },
    {
      title: "Sede Origen",
      key: "origen",
      render: (_, record) => {
        return (
          <h1 className={`font-bold text-sm`}>
            {record.origen?.nameReferential || "—"}
          </h1>
        );
      },
    },
    {
      title: "Sede Destino",
      key: "destino",
      render: (_, record) => {
        return (
          <h1 className={`font-bold text-sm`}>
            {record.destino?.nameReferential || "—"}
          </h1>
        );
      },
    },
  ];

  const sendDataCargados = async () => {
    const idsFiltrados = pedidosRegistrados
      .filter((pedido) => pedidosCargados.includes(pedido.idSolicitante))
      .map((pedido) => pedido.id);

    try {
      const response = await axios.post(
        `${apiUrl}/senDataPedidosCargadaMasive`,
        { pedidos: idsFiltrados },
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
        setPedidosCargados([]);
        await fetchCampaignData();
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const sendDataCargadosImportCodes = async () => {
    console.log(pedidosCargadosImport);

    try {
      const response = await axios.post(
        `${apiUrl}/senDataPedidosCodes`,
        { pedidos: pedidosCargadosImport, campaign_id: id },
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
        setPedidosCargadosImport([]);
        await fetchCampaignData();
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const eliminarProductosNoEncontrados = () => {
    const codigosRegistrados = pedidosRegistrados.map((p) => p.idSolicitante);
    const nuevosPedidosCargados = pedidosCargados.filter((codigo) =>
      codigosRegistrados.includes(codigo)
    );
    setPedidosCargados(nuevosPedidosCargados);
  };
  const recogerPedidos = async () => {
    const codigosPedidos = pedidosRegistrados.map((p) => p.idSolicitante);
    const todosExisten = pedidosCargados.every((codigo) =>
      codigosPedidos.includes(codigo)
    );

    if (!todosExisten) {
      message.error(
        "Hay códigos recogidos que no existen en la lista de pedidos."
      );
      return;
    }

    if (pedidosCargados.length < pedidosRegistrados.length) {
      confirm({
        title: "Cantidad de productos menor",
        icon: <ExclamationCircleOutlined />,
        content:
          "La cantidad de productos recogidos es menor a los cargados en esta campaña, ¿estás seguro de recoger estos productos?",
        okText: "Sí",
        cancelText: "No",
        async onOk() {
          // 👇 Aquí va tu lógica de subida de pedidos cargados
          console.log("Subiendo pedidos cargados...");
          await sendDataCargados();
        },
      });
    } else if (pedidosCargados.length === pedidosRegistrados.length) {
      // 👇 Aquí va tu lógica de subida de pedidos cargados directamente sin confirmación
      console.log("Subiendo todos los pedidos cargados directamente...");
      await sendDataCargados();
    } else {
      message.error("Has recogido más productos de los que hay en la campaña.");
    }
  };
  const recogerPedidosImportCodes = async () => {
    try {
      setloadingRecogerPedidosCodes(true);
      console.log("Subiendo todos los pedidos cargados directamente...");
      await sendDataCargadosImportCodes();
      setloadingRecogerPedidosCodes(false);
    } catch (error) {
      setloadingRecogerPedidosCodes(false);
      message.error("Has recogido más productos de los que hay en la campaña.");
    }
  };
  const exportToExcelReport = (pedidos) => {
    const data = pedidos.map((pedido) => {
      const entrega =
        pedido.status === "entregado"
          ? pedido.status_pedido.find((sp) => sp.status === "entregado")
          : null;

      return {
        "Nombre del Solicitante": pedido.nombreSolicitante,
        "ID del Solicitante": pedido.idSolicitante,
        Estado: pedido.status,
        Dirección: pedido.direccion,
        "Origen - Departamento": pedido.origen?.department || "",
        "Origen - Provincia": pedido.origen?.province || "",
        "Origen - Distrito": pedido.origen?.district || "",
        "Destino - Departamento": pedido.destino?.department || "",
        "Destino - Provincia": pedido.destino?.province || "",
        "Destino - Distrito": pedido.destino?.district || "",
        ...(entrega && {
          "Fecha de Entrega": new Date(entrega.createdAt).toLocaleString(),
        }),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Autoajustar el ancho de columnas
    const columnWidths = Object.keys(data[0]).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...data.map((row) => (row[key] ? row[key].toString().length : 0))
        ) + 2, // +2 para dejar algo de margen
    }));
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "pedidos.xlsx");
  };
  const descargarDatosNoEncontrados = () => {
    const data = pedidosNoEncontradosByCode;

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Autoajustar el ancho de columnas
    const columnWidths = Object.keys(data[0]).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...data.map((row) => (row[key] ? row[key].toString().length : 0))
        ) + 2, // +2 para dejar algo de margen
    }));
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos no encontrados");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "pedidosnoencontrados.xlsx");
  };

  return (
    <div>
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-3xl">
            <b>Campaña: {campaign?.name}</b>
          </h2>
          <h3 className="text-sm">Puedes ver todos tus pedidos aquí</h3>
        </div>

        <Modal
          title="Lectura de Pedidos"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
        >
          <button
            onClick={() => eliminarProductosNoEncontrados()}
            className="px-3 py-2 flex items-center gap-3 bg-red-600 text-white text-sm"
          >
            Eliminar pedidos no registrados
          </button>
          <BarcodeScanner
            isModal={isModalOpen}
            pedidos={pedidosRegistrados}
            pedidosCargados={pedidosCargados}
            setPedidosCargados={setPedidosCargados}
          />
          <button
            onClick={() => recogerPedidos()}
            className="px-3 py-2 flex items-center gap-3 bg-primary text-white text-sm"
          >
            Recoger Pedidos
          </button>
        </Modal>
        <Modal
          title="Importa aqui tus codigos de barras"
          open={isModalOpenImportCodes}
          onCancel={() => setIsModalOpenImportCodes(false)}
          footer={null}
        >
          <div className="w-full">
            {loadingRecogerPedidosCodes ? (
              <div className="w-full h-full z-50 absolute top-0 right-0 left-0 bottom-0 bg-primary text-white flex items-center justify-center gap-3">
                <Spin /> <h1>Recogiendo pedidos</h1>
              </div>
            ) : null}

            <BarcodeScannerImport
              isModal={isModalOpenImportCodes}
              pedidosCargados={pedidosCargadosImport}
              setPedidosCargados={setPedidosCargadosImport}
            />
            <button
              onClick={() => recogerPedidosImportCodes()}
              disabled={loadingRecogerPedidosCodes}
              className="px-3 py-2 flex items-center gap-3 bg-primary text-white text-sm"
            >
              Recoger Pedidos
            </button>
          </div>
        </Modal>
        <button
          onClick={() => navigate("/pedidos")}
          className="px-3 py-2 flex items-center gap-3 bg-primary text-white text-sm"
        >
          <FaArrowLeft /> Regresar
        </button>
      </div>

      <div className="flex gap-3 mb-4 w-full overflow-x-auto">
        <EstadisticasModal pedidos={pedidos} />
        <button
          onClick={() => exportToExcelReport(pedidos)}
          className="bg-gray-800 text-white px-4 py-2 rounded flex gap-3 items-center"
        >
          <AiOutlineDownload />
          Exportar
        </button>
        <button
          className="text-nowrap rounded px-3 py-2 bg-primary text-white text-sm flex gap-3 items-center"
          onClick={() => setModalVisible(true)}
        >
          <AiOutlineUpload /> Importar
        </button>
        <button
          onClick={() => setIsModalOpenImportCodes(true)}
          className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-800 text-white"
        >
          <BiBarcode />
          Recibir Codigos
        </button>
        <button
          onClick={() => setIsModalOpenLlenarData(true)}
          className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-gray-800 text-white"
        >
          <FileExcelFilled />
          Completar Data
        </button>

        <button
          onClick={() => navigate(`/generator-codigos/${id}`)}
          className="text-nowrap rounded px-3 py-2 flex items-center gap-3 bg-gray-800 text-white text-sm"
        >
          <BiBarcode />
          Generar Codigos
        </button>
        {pedidosRegistrados.length > 0 ? (
          <button
            onClick={() => handleReadPedidos()}
            className="text-nowrap px-3 py-2 flex items-center gap-3 bg-gray-800 text-white text-sm"
          >
            <AiOutlineBarcode />
            Leer Pedidos
          </button>
        ) : null}
      </div>
      <Modal
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
      >
        <div className="modal">
          <h2>Algunos registros tienen sede asignada. Selecciona un origen:</h2>
          <Select
            showSearch
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp="label"
            onChange={(value) => setSelectedOrigenId(value)} // Ahora devuelve el ID
            placeholder="Selecciona una sede"
            style={{ width: "100%" }}
          >
            {sedes.map((sede) => (
              <Option
                key={sede.id}
                value={sede.id} // 👈 Aquí ahora se usa el ID como valor
                label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
              >
                {sede.nameReferential} - {sede.department} {sede.province}{" "}
                {sede.district}
              </Option>
            ))}
          </Select>

          <button
            className="px-3 py-2 rounded bg-primary text-white"
            onClick={handleConfirmOrigen}
          >
            Confirmar
          </button>
          <button
            className="px-3 py-2 rounded bg-gray-200 text-gray-500"
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>
      <Modal
        open={showModalCompletar}
        onCancel={() => setShowModalCompletar(false)}
        footer={null}
      >
        <div className="modal">
          <h2>Algunos registros tienen sede asignada. Selecciona un origen:</h2>
          <Select
            showSearch
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp="label"
            onChange={(value) => setSelectedOrigenId(value)} // Ahora devuelve el ID
            placeholder="Selecciona una sede"
            style={{ width: "100%" }}
          >
            {sedes.map((sede) => (
              <Option
                key={sede.id}
                value={sede.id} // 👈 Aquí ahora se usa el ID como valor
                label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
              >
                {sede.nameReferential} - {sede.department} {sede.province}{" "}
                {sede.district}
              </Option>
            ))}
          </Select>

          <button
            className="px-3 py-2 rounded bg-primary text-white"
            onClick={handleConfirmOrigenCompletar}
          >
            Confirmar
          </button>
          <button
            className="px-3 py-2 rounded bg-gray-200 text-gray-500"
            onClick={() => setShowModalCompletar(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>
      <Modal
        open={modalVisibleSede}
        onCancel={() => setModalVisibleSede(false)}
        footer={null}
      >
        <span>Origen</span>
        <Select
          showSearch
          filterOption={(input, option) =>
            option?.label?.toLowerCase().includes(input.toLowerCase())
          }
          optionFilterProp="label"
          onChange={(value) => setSedeSeleccionada(value)} // Ahora devuelve el ID
          placeholder="Selecciona una sede"
          style={{ width: "100%" }}
        >
          {sedes.map((sede) => (
            <Option
              key={sede.id}
              value={sede.id} // 👈 Aquí ahora se usa el ID como valor
              label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
            >
              {sede.nameReferential} - {sede.department} {sede.province}{" "}
              {sede.district}
            </Option>
          ))}
        </Select>
        <span>Destino</span>
        <Select
          showSearch
          filterOption={(input, option) =>
            option?.label?.toLowerCase().includes(input.toLowerCase())
          }
          optionFilterProp="label"
          onChange={(value) => setSedeSeleccionadaDestino(value)} // Ahora devuelve el ID
          placeholder="Selecciona un destino"
          style={{ width: "100%" }}
        >
          {sedes.map((sede) => (
            <Option
              key={sede.id}
              value={sede.id} // 👈 Aquí ahora se usa el ID como valor
              label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
            >
              {sede.nameReferential} - {sede.department} {sede.province}{" "}
              {sede.district}
            </Option>
          ))}
        </Select>

        <Button onClick={asignarPedidos}>Asignar</Button>
      </Modal>
      <Modal
        open={modalVisibleSedeCompletar}
        onCancel={() => setModalVisibleSedeCompletar(false)}
        footer={null}
      >
        <span>Origen</span>
        <Select
          showSearch
          filterOption={(input, option) =>
            option?.label?.toLowerCase().includes(input.toLowerCase())
          }
          optionFilterProp="label"
          onChange={(value) => setSedeSeleccionada(value)} // Ahora devuelve el ID
          placeholder="Selecciona una sede"
          style={{ width: "100%" }}
        >
          {sedes.map((sede) => (
            <Option
              key={sede.id}
              value={sede.id} // 👈 Aquí ahora se usa el ID como valor
              label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
            >
              {sede.nameReferential} - {sede.department} {sede.province}{" "}
              {sede.district}
            </Option>
          ))}
        </Select>
        <span>Destino</span>
        <Select
          showSearch
          filterOption={(input, option) =>
            option?.label?.toLowerCase().includes(input.toLowerCase())
          }
          optionFilterProp="label"
          onChange={(value) => setSedeSeleccionadaDestino(value)} // Ahora devuelve el ID
          placeholder="Selecciona un destino"
          style={{ width: "100%" }}
        >
          {sedes.map((sede) => (
            <Option
              key={sede.id}
              value={sede.id} // 👈 Aquí ahora se usa el ID como valor
              label={`${sede.nameReferential} - ${sede.department} ${sede.province} ${sede.district}`}
            >
              {sede.nameReferential} - {sede.department} {sede.province}{" "}
              {sede.district}
            </Option>
          ))}
        </Select>

        <Button onClick={asignarPedidosCompletar}>Asignar</Button>
      </Modal>
      {/* modal de importar data */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="90vw"
      >
        {" "}
        <div className="flex flex-col gap-3">
          <input type="file" onChange={handleFileUpload} />
          <div className="flex gap-3 justify-between">
            {/* 🟢 Panel Izquierdo - Pedidos sin asignar */}
            <Table
              className="max-w-[500px] overflow-auto"
              rowSelection={{
                selectedRowKeys: selectedRows,
                onChange: setSelectedRows,
              }}
              dataSource={pedidosExcel}
              columns={[
                { title: "ID solicitante", dataIndex: "id_solicitante" },
                { title: "Solicitante", dataIndex: "nombre_solicitante" },
                { title: "Numero de cajas", dataIndex: "num_cajas" },
                { title: "departamento", dataIndex: "departamento" },
                { title: "provincia", dataIndex: "provincia" },
                { title: "distrito", dataIndex: "distrito" },
                { title: "ubigeo", dataIndex: "ubigeo" },
              ]}
              rowKey="id"
            />

            {/* 🟢 Botón Precargar */}
            <div
              className="px-3 py-2 rounded bg-primary text-white font-bold flex items-center gap-3 max-h-max max-w-max"
              onClick={() => setModalVisibleSede(true)}
            >
              Precargar <AiOutlineDoubleRight />
            </div>

            {/* 🟢 Panel Derecho - Pedidos asignados */}
            <Table
              className="max-w-[500px] overflow-auto"
              dataSource={asignados}
              columns={[
                { title: "Solicitante", dataIndex: "nombre_solicitante" },
                { title: "Numero de cajas", dataIndex: "num_cajas" },
                { title: "departamento", dataIndex: "departamento" },
                { title: "provincia", dataIndex: "provincia" },
                { title: "distrito", dataIndex: "distrito" },
                { title: "ubigeo", dataIndex: "ubigeo" },
              ]}
              rowKey="id"
            />
          </div>

          <Button onClick={subirPedidos}>Subir Data</Button>
        </div>
      </Modal>
      {/* modal de completar data */}
      <Modal
        open={isModalOpenLlenarData}
        onCancel={() => setIsModalOpenLlenarData(false)}
        footer={null}
        width="90vw"
        title={"Aqui completaras la data a los codigos precargados"}
      >
        <div className="w-full">
          {loadingCompletar ? (
            <div className="w-full h-full z-50 absolute top-0 right-0 left-0 bottom-0 bg-primary text-white flex items-center justify-center gap-3">
              <Spin /> <h1>Actualizando la data</h1>
            </div>
          ) : null}
          <div className="z-40 flex flex-col gap-3">
            <input type="file" onChange={handleFileUploadCompletar} />
            <div className="flex gap-3 justify-between">
              {/* 🟢 Panel Izquierdo - Pedidos sin asignar */}
              <Table
                className="max-w-[500px] overflow-auto"
                rowSelection={{
                  selectedRowKeys: selectedRowsCompletar,
                  onChange: setSelectedRowsCompletar,
                }}
                dataSource={pedidosExcelCompletar}
                columns={[
                  { title: "ID solicitante", dataIndex: "id_solicitante" },
                  { title: "Solicitante", dataIndex: "nombre_solicitante" },
                  { title: "Numero de cajas", dataIndex: "num_cajas" },
                  { title: "departamento", dataIndex: "departamento" },
                  { title: "provincia", dataIndex: "provincia" },
                  { title: "distrito", dataIndex: "distrito" },
                  { title: "ubigeo", dataIndex: "ubigeo" },
                ]}
                rowKey="id"
              />

              {/* 🟢 Botón Precargar */}
              <div
                className="px-3 py-2 rounded bg-primary text-white font-bold flex items-center gap-3 max-h-max max-w-max"
                onClick={() => setModalVisibleSedeCompletar(true)}
              >
                Precargar <AiOutlineDoubleRight />
              </div>

              {/* 🟢 Panel Derecho - Pedidos asignados */}
              <Table
                className="max-w-[500px] overflow-auto"
                dataSource={asignadosCompletar}
                columns={[
                  { title: "Solicitante", dataIndex: "nombre_solicitante" },
                  { title: "Numero de cajas", dataIndex: "num_cajas" },
                  { title: "departamento", dataIndex: "departamento" },
                  { title: "provincia", dataIndex: "provincia" },
                  { title: "distrito", dataIndex: "distrito" },
                  { title: "ubigeo", dataIndex: "ubigeo" },
                ]}
                rowKey="id"
              />
            </div>
            {pedidosNoEncontradosByCode.length > 0 ? (
              <div className="w-full">
                <h1 className="px-3 py-2 rounded bg-gray-200 text-gray-900 font-bold text-sm">
                  {pedidosNoEncontradosByCode.length} pedidos no han sido
                  cargados para completar, porque no se concuerdan con los
                  codigos previamente cargados
                </h1>
                <button
                  onClick={descargarDatosNoEncontrados}
                  className="px-3 py-2 bg-green-600 text-white text-sm font-bold flex gap-3"
                >
                  <FaFileExcel /> Descargar Datos no encontrados
                </button>
              </div>
            ) : null}

            <Button onClick={subirPedidosToCompletar}>Subir Data</Button>
          </div>
        </div>
      </Modal>
      {/* modal send recepcionado*/}
      <Modal
        open={isModalOpenSendStatus}
        onCancel={() => setIsModalOpenSendStatus(false)}
        footer={null}
        width="90vw"
      >
        <div className="w-full">
          {pintarSendStatus()}

          <p className="text-sm">
            Esta seccion es para cambiar el status de tracking de pedidos
            masivos
          </p>
          {loadingPedidosSendStatus ? (
            <div className="w-full h-full z-50 absolute top-0 right-0 left-0 bottom-0 bg-primary text-white flex items-center justify-center gap-3">
              <Spin /> <h1>Tracking: cambiando status de pedidos</h1>
            </div>
          ) : null}
          <h1 className="text-sm font-bold">Filtros de busqueda</h1>
          <div className="flex gap-4 mb-4">
            <Select
              placeholder="Departamento"
              className="w-1/3"
              value={filtroDepartamentoSendStatus}
              onChange={(value) => {
                setFiltroDepartamentoSendStatus(value);
                setFiltroProvinciaSendStatus(null);
                setFiltroDistritoSendStatus(null);
              }}
              allowClear
            >
              {departamentosSendStatus.map((dep) => (
                <Option key={dep} value={dep}>
                  {dep}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Provincia"
              className="w-1/3"
              value={filtroProvinciaSendStatus}
              onChange={(value) => {
                setFiltroProvinciaSendStatus(value);
                setFiltroDistritoSendStatus(null);
              }}
              allowClear
              disabled={!filtroDepartamentoSendStatus}
            >
              {provinciasSendStatus.map((prov) => (
                <Option key={prov} value={prov}>
                  {prov}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Distrito"
              className="w-1/3"
              value={filtroDistritoSendStatus}
              onChange={setFiltroDistritoSendStatus}
              allowClear
              disabled={!filtroProvinciaSendStatus}
            >
              {distritosSendStatus.map((dist) => (
                <Option key={dist} value={dist}>
                  {dist}
                </Option>
              ))}
            </Select>
          </div>
          <div className="w-full">
            <h1 className="text-sm font-bold">Tipo de fecha</h1>
            <div className="w-full flex gap-4">
              <select
                className="px-3 py-2 bg-gray-200 font-bold text-sm"
                name="seelct_fecha"
                id="select_fecha"
                value={tipoFechaSendStatus}
                onChange={(e) => {
                  setTipoFechaSendStatus(e.target.value);
                  setFechaSendStatus(null);
                }}
              >
                <option value="FECHA ACTUAL">FECHA ACTUAL</option>
                <option value="FECHA ESPECIFICA">FECHA ESPECIFICA</option>
              </select>
              {tipoFechaSendStatus === "FECHA ESPECIFICA" ? (
                <input
                  className="px-3 py-2 bg-gray-200 font-bold text-sm"
                  type="datetime-local"
                  value={fechaSendStatus ? fechaSendStatus : ""}
                  onChange={(e) => setFechaSendStatus(e.target.value)}
                />
              ) : null}
              <div className="mb-2">
                <Button onClick={handleSeleccionarTodosSendStatus}>
                  Seleccionar / Deseleccionar Todos
                </Button>
              </div>
            </div>
          </div>
          {/* Botón Seleccionar Todos */}

          <div className="z-40 flex flex-col gap-3">
            <div className="flex gap-3 justify-between">
              {/* 🟢 Panel Izquierdo - Pedidos sin asignar */}
              <Table
                className="w-full overflow-auto"
                dataSource={pedidosFiltradosSendStatus}
                columns={[
                  { title: "ID solicitante", dataIndex: "idSolicitante" },
                  { title: "Solicitante", dataIndex: "nombreSolicitante" },

                  { title: "departamento", dataIndex: "departamento" },
                  { title: "provincia", dataIndex: "provincia" },
                  { title: "distrito", dataIndex: "distrito" },
                  { title: "ubigeo", dataIndex: "ubigeo" },
                  {
                    title: "Seleccionar",
                    key: "seleccionar",
                    render: (_, record) => (
                      <Checkbox
                        checked={pedidosSeleccionadosSendStatus.includes(
                          record.id
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPedidosSeleccionadosSendStatus([
                              ...pedidosSeleccionadosSendStatus,
                              record.id,
                            ]);
                          } else {
                            setPedidosSeleccionadosSendStatus(
                              pedidosSeleccionadosSendStatus.filter(
                                (id) => id !== record.id
                              )
                            );
                          }
                        }}
                      />
                    ),
                  },
                ]}
                rowKey="id"
              />
            </div>

            <button
              className="px-3 py-2 bg-primary text-white font-bold text-sm"
              onClick={actualizarStatusPedidosMasive}
            >
              Enviar
            </button>
          </div>
        </div>
      </Modal>
      <ImageUploadModal
        isOpen={modalVisibleMorePhotos}
        onClose={() => setModalVisibleMorePhotos(false)}
        onUpload={handleUploadMorePhotos}
      />

      <Modal
        title="Eliminar Imágenes"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedImages([]);
        }}
        footer={false}
        width={800}
      >
        <Row gutter={[16, 16]}>
          {multimedia.map((item) => (
            <Col key={item.id} span={6}>
              <div style={{ position: "relative" }}>
                <Image
                  src={item.url}
                  alt="Imagen"
                  width="100%"
                  height={150}
                  style={{ objectFit: "cover", borderRadius: "8px" }}
                />
                <Checkbox
                  checked={selectedImages.some((img) => img.url === item.url)}
                  onChange={() => toggleImageSelection(item)}
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: "white",
                    padding: "2px",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: 24, textAlign: "right" }}>
          <Button
            danger
            type="primary"
            // icon={<DeleteOutlined />}
            onClick={handleDeleteSelected}
            loading={loadingDelete}
          >
            Eliminar seleccionadas
          </Button>
        </div>
      </Modal>
      <Modal
        open={isOpenMultimedia}
        onCancel={handleCloseMultimedia}
        onClose={handleCloseMultimedia}
        footer={false}
      >
        <div className="w-full">
          <div className="w-full flex gap-3 mb-6">
            <button
              onClick={() => handleMorePhotos()}
              className="px-3 py-2 rounded bg-primary text-white"
            >
              Subir imagenes
            </button>
            <button
              onClick={() => setDeleteModalVisible(true)}
              className="px-3 py-2 rounded bg-red-700 text-white"
            >
              Eliminar imagenes
            </button>
          </div>
          <div className="flex gap-3 flex-wrap">
            {multimedia.map((m, index) => {
              return (
                <div className="m" key={index}>
                  <img
                    className="h-[200px] object-contain"
                    src={m.url}
                    alt=""
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
      {loading ? (
        <Spin size="large" />
      ) : (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Select
              placeholder="Selecciona un departamento"
              value={departamento || undefined}
              onChange={(value) => {
                setDepartamento(value);
                setProvincia(""); // reset al cambiar
                setDistrito(""); // reset al cambiar
              }}
              className="w-full max-w-xs"
              allowClear
            >
              {departamentosUnicos.map((dep) => (
                <Option key={dep} value={dep}>
                  {dep}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Selecciona una provincia"
              value={provincia || undefined}
              onChange={(value) => {
                setProvincia(value);
                setDistrito(""); // reset al cambiar
              }}
              className="w-full max-w-xs"
              disabled={!departamento}
              allowClear
            >
              {provinciasUnicas.map((prov) => (
                <Option key={prov} value={prov}>
                  {prov}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="Selecciona un distrito"
              value={distrito || undefined}
              onChange={(value) => setDistrito(value)}
              className="w-full max-w-xs"
              disabled={!provincia}
              allowClear
            >
              {distritosUnicos.map((dist) => (
                <Option key={dist} value={dist}>
                  {dist}
                </Option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Selector del tipo de búsqueda */}
            <select
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value);
                setSearchTerm(""); // Resetear el input al cambiar tipo
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="idSolicitante">Buscar por ID</option>
              <option value="nombreSolicitante">Buscar por Nombre</option>
              <option value="status">Buscar por Estado</option>
            </select>

            {/* Campo dinámico según tipo de búsqueda */}
            <div className="flex-grow">
              {searchField === "status" ? (
                <select
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                >
                  <option value="">Seleccionar estado</option>
                  <option value="recepcionado">En Reparto</option>
                  <option value="en camino">En camino(ruta)</option>
                  <option value="en almacen">En camino(ruta)</option>
                  <option value="en reparto">En Reparto</option>
                  <option value="reprogramado">En Reparto</option>
                  <option value="entregado">Entregado</option>
                </select>
              ) : (
                <div className="inmocms-input bg-white border rounded border-gray-300 flex text-sm h-[46px] overflow-hidden font-normal">
                  <input
                    className="h-full px-[12px] w-full border-0 border-none focus:outline-none"
                    placeholder={
                      searchField === "idSolicitante"
                        ? "Ingresa número de tracking 00000001"
                        : "Ingresa nombre del solicitante"
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="on"
                  />
                  <AiOutlineSearch className="h-full w-[24px] min-w-[24px] opacity-5 mx-[12px]" />
                </div>
              )}
            </div>

            <button
              onClick={() => handleResetFilters()}
              className="shadow px-3 py-2 rounded bg-white text-gray-800"
            >
              <FiRefreshCw />
            </button>
            <div className="flex gap-4">
              <div className="box px-3 py-2 rounded text-sm font-bold bg-primary text-white">
                Total pedidos <span>{pedidos.length}</span>
              </div>
              <div className="box px-3 py-2 rounded text-sm font-bold bg-green-600 text-white">
                Entregados{" "}
                <span>
                  {pedidos.filter((p) => p.status === "entregado").length}
                </span>
              </div>
              <div className="box px-3 py-2 rounded text-sm font-bold bg-yellow-300 text-yellow-700">
                Faltantes{" "}
                <span>
                  {pedidos.length -
                    pedidos.filter((p) => p.status === "entregado").length}
                </span>
              </div>
            </div>
          </div>

          <ModalAsignarPedidos
            open={showAsignar}
            onClose={setShowAsignar}
            pedidos={pedidosEnAlmacen}
            repartidores={repartidores}
            fetchCampaignData={fetchCampaignData}
          />
          <div className="flex gap-3 my-4 w-full overflow-x-auto">
            <button
              onClick={() => handlePedidosSendStatus("registrado")} // el status de los pedidos cambian de registrado a recepcionado
              className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-sky-500 text-white"
            >
              <FaInbox />
              Recoger pedidos
            </button>
            <button
              onClick={() => handlePedidosSendStatus("recepcionado")} // el status de los pedidos cambian de recepcionado a en ruta(en camino)
              className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-blue-600 text-white"
            >
              <FaTruck />
              Enviar a ruta
            </button>
            <button
              onClick={() => handlePedidosSendStatus("en camino")} // el status de los pedidos cambian de en ruta(camino) a en almacen(destino)
              className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-blue-900 text-white"
            >
              <FaTruckLoading />
              Recepcionar en destino
            </button>
            <button
              onClick={() => handleShowAsignar()} //tiene la propia logica para que el status cambie de ruta(en camino) a almacen
              className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-indigo-500 text-white"
            >
              <FaUsers />
              Asignar Pedidos
            </button>
            <button
              onClick={() => handlePedidosSendStatus("en reparto")} // el status de los pedidos cambian de almacen a entregado
              className="text-nowrap rounded flex items-center gap-3 px-3 py-2 bg-emerald-500 text-white"
            >
              <FaBoxOpen />
              Entregar
            </button>
          </div>
          <Table
            className="mt-8"
            dataSource={visiblePedidos}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
            style={{ width: "100%" }}
          />
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;
