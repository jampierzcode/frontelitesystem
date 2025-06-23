import React, { useEffect, useState } from "react";
import { FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {
  Button,
  DatePicker,
  Dropdown,
  message,
  Modal,
  Select,
  Space,
} from "antd";
import { MdAdd } from "react-icons/md";
import { TbAdjustments, TbCaretDownFilled } from "react-icons/tb";
import { Link } from "react-router-dom";
import { AiOutlineSearch } from "react-icons/ai";
import axios from "axios";
import dayjs from "dayjs";
import {
  FaCopy,
  FaEdit,
  FaEllipsisV,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaRedo,
  FaTrash,
  FaUserCog,
} from "react-icons/fa";
import { useAuth } from "../../components/AuthContext";
const { RangePicker } = DatePicker;
const { Option } = Select;
const Usuarios = () => {
  const generateRandomPassword = (length) => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    return password;
  };
  const generateRandomUuid = (length) => {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    return password;
  };
  const { auth } = useAuth();
  const session = JSON.parse(sessionStorage.getItem("user"));
  const apiUrl = process.env.REACT_APP_API_URL;

  //   sedes
  const [sedes, setSedes] = useState([]);
  //   sedes
  const [roles, setRoles] = useState([]);
  //   usuarios
  const [loadingCreateUsuarios, setLoadingCreateUsuarios] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [filterUsuarios, setFilterUsuarios] = useState([]);
  const [usuarioCreate, setUsuarioCreate] = useState({
    name: "",
    email: "",
    password: generateRandomPassword(10),
    rol_id: 2,
    sede_id: 1,
  });
  const [openPassword, setOpenPassword] = useState(false);
  const [editGenerate, setEditGenerate] = useState(false);
  // const changeGeneratePassword = () => {
  //   setUsuarioCreate({
  //     ...usuarioCreate,
  //     password: generateRandomPassword(10),
  //   });
  // };
  const copiarCredentials = (type) => {
    let valor = usuarioCreate[type];
    console.log(valor);
    navigator.clipboard
      .writeText(valor)
      .then(() => {
        message.success("¡Copiado!");
      })
      .catch((err) => {
        console.error("Error al copiar al portapapeles: ", err);
      });
  };
  useEffect(() => {
    if (!editGenerate) {
      let newPass = generateRandomPassword(10);
      setUsuarioCreate({
        ...usuarioCreate,
        password: newPass,
      });
    }
  }, [editGenerate]);

  const exportToExcel = (data) => {
    // Mapeamos SOLO los datos necesarios
    const filteredData = data.map((item) => ({
      Name: item.name,
      Email: item.email,
      Sede: `${item.sede.department}, ${item.sede.province}, ${item.sede.district}`,
      Rol: `${item.rol.name}`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "bd_usuarios.xlsx");
  };

  const [isModalOpenCreate, setIsModalOpenCreate] = useState(false);
  const createUsuario = async (newUsuario) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await axios.post(`${apiUrl}/users`, newUsuario, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
        });
        console.log(response);
        const data = response.data;
        if (data.status === "success") {
          setUsuarios(data.data);
          setFilterUsuarios(data.data);
        } else {
          new Error("error de compilacion");
        }
        resolve(data);
      } catch (error) {
        reject(error);
        console.error("Upload error:", error);
      }
    });
  };
  const handleOkCreate = async () => {
    if (
      usuarioCreate.name !== "" &&
      usuarioCreate.email !== "" &&
      usuarioCreate.sede_id !== "" &&
      usuarioCreate.password !== ""
    ) {
      let uuid = generateRandomUuid(5);
      setLoadingCreateUsuarios(true);
      const newUsuario = { ...usuarioCreate };
      newUsuario.uuid = uuid;
      const userData = await createUsuario(newUsuario);
      console.log(userData);
      if (userData.status === "success") {
        message.success("Se creo correctamente el usuario");
        setUsuarioCreate({
          ...usuarioCreate,
          name: "",
          email: "",
        });
        await buscarUsuarios();
        setLoadingCreateUsuarios(false);
      } else {
        message.error(
          "Ocurrio un error al crear el modelo, intentelo mas tarde"
        );
        setLoadingCreateUsuarios(false);
      }
    } else {
      message.error("Ocurrio algo inesperado");
      setLoadingCreateUsuarios(false);
    }
  };
  const handleCancelCreate = () => {
    setUsuarioCreate({
      name: "",
      email: "",
      password: generateRandomPassword(10),
      rol_id: 2,
      sede_id: 1,
    });
    setIsModalOpenCreate(false);
  };
  // funciones para crear nuevo modelo

  const abrirModalCreate = (e) => {
    e.stopPropagation();
    setUsuarioCreate({
      ...usuarioCreate,
      password: generateRandomPassword(10),
    });
    setIsModalOpenCreate(true);
  };
  const handleUsuarioChangeCreate = (key, value) => {
    setUsuarioCreate((prev) => {
      const newModelo = { ...prev, [key]: value };

      return newModelo;
    });
  };

  const items = [
    {
      key: "1",
      label: (
        <p
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.antgroup.com"
        >
          Editar
        </p>
      ),
    },
  ];

  const buscarUsuarios = async () => {
    try {
      const response = await axios.get(`${apiUrl}/usersSuperadmin`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      console.log(response);

      const data = response.data;
      if (data.status === "success") {
        setUsuarios(data.data);
        setFilterUsuarios(data.data);
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
    }
  };
  useEffect(() => {
    // eslint-disable-next-line
    buscarUsuarios();
  }, [0]);

  const buscarSedes = async () => {
    try {
      const response = await axios.get(`${apiUrl}/sedes`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      console.log(response);

      const data = response.data;
      if (data.status === "success") {
        setSedes(data.data);
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
    }
  };
  useEffect(() => {
    // eslint-disable-next-line
    buscarSedes();
  }, [0]);

  const buscarRoles = async () => {
    try {
      const response = await axios.get(`${apiUrl}/roles`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      console.log(response);

      const data = response.data;
      if (data.status === "success") {
        setRoles(data.data);
      } else {
        new Error("error de compilacion");
      }
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
    }
  };
  useEffect(() => {
    // eslint-disable-next-line
    buscarRoles();
  }, [0]);

  // ESTADOS PARA LA TABLA DINAMICA
  const [selectsProperties, setSelectsProperties] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10); //items por pagina
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleUsuarios, setVisibleUsuarios] = useState([]);
  const [activeFilter, setActiveFilter] = useState(false);
  const [filters, setFilters] = useState({
    tipo: "",
    precioRange: [0, Infinity],
    pais: "",
    region: "",
    provincia: "",
    distrito: "",
    fechaCreatedRange: [null, null],
    fechaEntregaRange: [null, null],
  });

  // Función para aplicar el filtro
  const detectarTotalPages = (data) => {
    if (data.length === 0) {
      setTotalPages(1);
    } else {
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    }
  };
  const applyFilters = () => {
    const regex = /^[a-zA-Z0-9\s]*$/; // Permite solo letras, números y espacios
    const bol = regex.test(searchTerm) ? true : false;

    if (bol && filterUsuarios.length > 0) {
      const filteredUsuarios = filterUsuarios.filter((usuario) => {
        const searchRegex = new RegExp(searchTerm, "i");

        const matchSearch = Object.values(usuario).some((value) =>
          searchRegex.test(value.toString())
        );

        const matchFilters =
          !filters.fechaCreatedRange[0] ||
          ((dayjs(usuario.fecha_created).isAfter(
            filters.fechaCreatedRange[0],
            "day"
          ) ||
            dayjs(usuario.fecha_created).isSame(
              filters.fechaCreatedRange[0],
              "day"
            )) &&
            (dayjs(usuario.fecha_created).isBefore(
              filters.fechaCreatedRange[1],
              "day"
            ) ||
              dayjs(usuario.fecha_created).isSame(
                filters.fechaCreatedRange[1],
                "day"
              )));

        return matchSearch && matchFilters;
      });
      detectarTotalPages(filteredUsuarios);
      const objetosOrdenados = filteredUsuarios.sort((a, b) =>
        dayjs(b.fecha_created).isAfter(dayjs(a.fecha_created)) ? 1 : -1
      );
      const startIndex = (currentPage - 1) * itemsPerPage;
      // setCurrentPage(1);
      const paginatedUsuarios = objetosOrdenados.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      setVisibleUsuarios(paginatedUsuarios);
    } else {
      setSearchTerm("");
    }
  };

  // useEffect para manejar el filtrado y paginación
  useEffect(() => {
    applyFilters(); // Aplicar filtro inicialmente
  }, [filterUsuarios, currentPage, itemsPerPage, searchTerm]);

  const handleSelect = (e, id) => {
    e.stopPropagation();
    setSelectsProperties((prevSelects) => {
      if (prevSelects.includes(id)) {
        return prevSelects.filter((p) => p !== id);
      } else {
        return [...prevSelects, id];
      }
    });
  };
  const handleCheckSelect = (e, id) => {
    e.stopPropagation();
    let active = e.target.checked;
    if (active) {
      setSelectsProperties((prevSelects) => [...prevSelects, id]);
    } else {
      setSelectsProperties((prevSelects) =>
        prevSelects.filter((p) => p !== id)
      );
    }
  };

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const visiblePropertyIds = visibleUsuarios.map((propiedad) => propiedad.id);

    if (isChecked) {
      setSelectsProperties((prevSelects) => [
        ...new Set([...prevSelects, ...visiblePropertyIds]),
      ]);
    } else {
      setSelectsProperties((prevSelects) =>
        prevSelects.filter((id) => !visiblePropertyIds.includes(id))
      );
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleFiltersChange = (changedFilters) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...changedFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      tipo: "",
      precioRange: [0, Infinity],
      pais: "",
      region: "",
      provincia: "",
      distrito: "",
      fechaCreatedRange: [null, null],
      fechaEntregaRange: [null, null],
    });

    setSearchTerm("");
    setCurrentPage(1);
    detectarTotalPages(filterUsuarios);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsuarios = filterUsuarios.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    setVisibleUsuarios(paginatedUsuarios);
  };
  const handleEditarProperty = (e, id) => {
    e.stopPropagation();
    console.log(id);
  };
  const eliminar_property = (propiedad_id) => {
    return new Promise(async (resolve, reject) => {
      const response = await axios.delete(
        `${apiUrl}/propiedades/${propiedad_id}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );
      console.log(response);
      resolve(response.data);
    });
  };
  const handleEliminarProperty = async (id) => {
    console.log(id);
    let propiedad_id = id;
    try {
      const response = await eliminar_property(propiedad_id);
      buscarUsuarios();
      message.success("Se elimino correctamente la propiedad");
    } catch (error) {
      message.error("No se elimino la propiedad, hubo un error");
    }
  };

  return (
    <div className="w-full p-6 app-container-sections">
      {/* <div className="w-full mb-4">
        <EmpresaSelect
          businessActive={businessActive}
          setBusinessActive={setBusinessActive}
          listBusiness={business}
        />
      </div> */}
      <div
        className="mb-[32px] flex items-center justify-between py-4 pr-4"
        style={{ background: "linear-gradient(90deg,#fff0,#fff)" }}
      >
        <div className="data">
          <div className="title font-bold text-xl text-bold-font">Usuarios</div>
          <div className="subtitle max-w-[30vw] text-xs font-normal text-light-font">
            Lista de tus usuarios
          </div>
          <button
            onClick={() => exportToExcel(usuarios)}
            className="flex items-center gap-3 rounded px-3 py-2 bg-green-600 text-white font-bold"
          >
            <FaFileExcel size={20} />
            Excel
          </button>
        </div>
        <div className="options bg-gray-50 p-4">
          <div className="page-top-card flex items-center gap-3">
            <div className="icon bg-light-purple p-4 rounded text-dark-purple">
              <FaUserCog />
            </div>
            <div>
              <div className="value font-bold text-bold-font text-xl">
                {usuarios.length}
              </div>
              <div className="text-sm font-normal text-light-font">
                Total usuarios
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="horizontal-options flex items-center mb-[24px]">
        <div className="search-hook flex-grow">
          <div className="inmocms-input bg-white border rounded border-gray-300 flex text-sm h-[46px] overflow-hidden font-normal">
            <input
              className="h-full px-[12px] w-full border-0 border-none focus:outline-none"
              placeholder="Buscar usuarios"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="on"
            />
            <AiOutlineSearch className="h-full w-[24px] min-w-[24px] opacity-5 mx-[12px]" />
          </div>
        </div>
        <div className="horizontal-options-items ml-[28px] flex items-center">
          <button
            onClick={() => setActiveFilter(!activeFilter)}
            className="inmocms-button bg-dark-blue text-white rounded p-4"
          >
            <TbAdjustments />
          </button>
          <button
            onClick={(e) => abrirModalCreate(e)}
            className="bg-primary text-white ml-[12px] h-[46px] flex gap-2 items-center rounded px-3"
          >
            <MdAdd className="text-white" />
            <span className="mobile-hide">Nuevo Usuario</span>
          </button>
        </div>
      </div>
      {/* <Modal
        footer={null}
        title="Editar modelo"
        open={isModalOpenModelo}
        onCancel={handleCancelModelo}
      >
        {activeModelo !== null ? (
          <div className="model grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 relative">
            <div className="md:col-span-1">
              <label className="text-sm w-full block font-medium  mb-4 ">
                Subir Imagen
              </label>
              <div className="w-full flex items-center gap-3">
                <LogoUpload
                  setLogoFile={setLogoFile}
                  logo={activeModelo.imagenUrl}
                  setLogo={(imagenUrl) =>
                    setActiveModelo((prevState) => ({
                      ...prevState,
                      imagenUrl,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4 ">
                Categoría
              </label>
              <select
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                value={activeModelo.categoria}
                onChange={(e) => handleModelChange("categoria", e.target.value)}
              >
                {categorias.map((categoria, index) => (
                  <option key={index} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4 ">
                Nombre
              </label>
              <input
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                type="text"
                value={activeModelo.nombre}
                onChange={(e) => handleModelChange("nombre", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4 ">
                Etapa
              </label>
              <select
                name=""
                id="estado_modelo"
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                value={activeModelo.etapa}
                onChange={(e) => handleModelChange("etapa", e.target.value)}
              >
                <option value="En planos">En planos</option>
                <option value="Construccion">Construccion</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm w-full block font-medium mb-4 ">
                Precio Desde
              </label>
              <div className="w-full flex">
                <select
                  value={activeModelo.moneda}
                  onChange={(e) => handleModelChange("moneda", e.target.value)}
                  name=""
                  className="bg-gray-100 rounded px-3 py-2 text-sm"
                  id="moneda"
                >
                  <option value="PEN">S/</option>
                  <option value="DOLLAR">$</option>
                </select>
                <input
                  className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                  type="number"
                  value={activeModelo.precio}
                  onChange={(e) => handleModelChange("precio", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4">
                Área Desde
              </label>
              <input
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                type="text"
                value={activeModelo.area}
                onChange={(e) => handleModelChange("area", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4">
                N° Habitaciones
              </label>
              <input
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                type="text"
                value={activeModelo.habs}
                onChange={(e) => handleModelChange("habs", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4">
                Garage
              </label>
              <Switch
                value={Number(activeModelo.garage) === 1 ? true : false}
                onChange={(e) => handleModelChange("garage", e)}
              />
            </div>
            <div>
              <label className="text-sm w-full block font-medium mb-4">
                Baños
              </label>
              <input
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                type="text"
                value={activeModelo.banios}
                onChange={(e) => handleModelChange("banios", e.target.value)}
              />
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-4 justify-end">
          <button
            disabled={verificarCambios()}
            onClick={handleCancelModelo}
            className={`rounded-full text-[12px] px-5 py-2   ${
              verificarCambios()
                ? "text-gray-500 bg-gray-300"
                : "text-bold-font bg-white border-gray-300 border"
            }`}
          >
            Cancelar
          </button>
          <button
            disabled={verificarCambios()}
            onClick={handleSave}
            className={`rounded-full text-[12px] px-5 py-2 ${
              verificarCambios()
                ? "text-gray-500 bg-gray-300"
                : "text-white bg-dark-purple"
            } `}
          >
            Actualizar
          </button>
        </div>
      </Modal> */}
      <Modal
        footer={null}
        title="Crear usuario"
        open={isModalOpenCreate}
        onOk={handleOkCreate}
        onCancel={handleCancelCreate}
        width={"900px"}
      >
        <div className="relative w-full">
          {loadingCreateUsuarios ? (
            <div className="bg-dark-purple z-50 text-white absolute top-0 left-0 right-0 bottom-0 w-full flex items-center justify-center">
              Loading
            </div>
          ) : null}

          <div className="model grid grid-cols-1 gap-3 mt-4 relative">
            <div>
              <label className="text-sm w-full block font-medium mb-4 ">
                Nombres
              </label>
              <input
                placeholder="Ingresa nombres completos"
                className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                type="text"
                value={usuarioCreate?.name}
                onChange={(e) =>
                  handleUsuarioChangeCreate("name", e.target.value)
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm w-full block font-medium mb-4 ">
                  Sedes
                </label>
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    option?.label?.toLowerCase().includes(input.toLowerCase())
                  }
                  value={usuarioCreate.sede_id}
                  optionFilterProp="label"
                  onChange={(value) =>
                    handleUsuarioChangeCreate("sede_id", value)
                  } // Ahora devuelve el ID
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
              </div>
              <div>
                <label className="text-sm w-full block font-medium mb-4 ">
                  Roles
                </label>
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    option?.label?.toLowerCase().includes(input.toLowerCase())
                  }
                  value={usuarioCreate.rol_id}
                  optionFilterProp="label"
                  onChange={(value) =>
                    handleUsuarioChangeCreate("rol_id", value)
                  } // Ahora devuelve el ID
                  placeholder="Selecciona una sede"
                  style={{ width: "100%" }}
                >
                  {roles.map((rol) => (
                    <Option
                      key={rol.id}
                      value={rol.id} // 👈 Aquí ahora se usa el ID como valor
                      label={`${rol.name}`}
                    >
                      {rol.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm w-full block font-medium mb-4 ">
                  Email {"(Username)"}
                </label>
                <div className="flex gap-1">
                  <input
                    placeholder="ejm: agente@gmail.com"
                    className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                    type="email"
                    value={usuarioCreate?.email}
                    onChange={(e) =>
                      handleUsuarioChangeCreate("email", e.target.value)
                    }
                  />
                  <button
                    onClick={() => copiarCredentials("email")}
                    className="p-2 bg-gray-100 rounded text-gray-500"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm w-full font-medium mb-4  flex items-center gap-2">
                  <span>Password</span>{" "}
                  <button
                    onClick={() => setEditGenerate(!editGenerate)}
                    className="p-1 rounded text-xs bg-dark-purple text-white"
                  >
                    {editGenerate ? <FaRedo /> : <FaEdit />}
                  </button>
                  {editGenerate ? "(Edit)" : "(Autogenerate)"}
                </div>
                <div className="flex gap-1">
                  <input
                    disabled={editGenerate ? false : true}
                    className="bg-gray-100 rounded px-3 py-2 w-full text-sm"
                    type={openPassword ? "text" : "password"}
                    value={usuarioCreate?.password}
                    onChange={(e) =>
                      handleUsuarioChangeCreate("password", e.target.value)
                    }
                  />
                  <button
                    onClick={() => setOpenPassword(!openPassword)}
                    className="p-2 bg-gray-100 rounded text-gray-500"
                  >
                    {openPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  <button
                    onClick={() => copiarCredentials("password")}
                    className="p-2 bg-gray-100 rounded text-gray-500"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => handleOkCreate()}
              className="bg-dark-purple text-white p-3 rounded"
            >
              Crear Usuario
            </button>
          </div>
        </div>
      </Modal>
      <div
        className={`${
          activeFilter ? "" : "hidden"
        } filters grid grid-cols-1 md:grid-cols-6 gap-4 bg-white py-4 px-3 mb-4`}
      >
        <div className="col-span-2">
          <RangePicker
            className="w-full text-sm"
            value={filters.fechaCreatedRange}
            onChange={(dates) =>
              handleFiltersChange({ fechaCreatedRange: dates })
            }
            placeholder={["Fecha Creación Desde", "Fecha Creación Hasta"]}
          />
        </div>

        <div className="w-full flex flex-col md:flex-row">
          <button
            className="p-3 rounded bg-white text-light-font text-xs"
            onClick={() => handleClearFilters()}
          >
            Limpiar
          </button>
          <button
            className="p-3 rounded bg-dark-purple text-white text-xs"
            onClick={() => applyFilters()}
          >
            Buscar
          </button>
        </div>
      </div>
      <div className="box-table">
        <table
          className="inmocms-table"
          cellPadding="0"
          cellSpacing="0"
          border="0"
        >
          <thead>
            <tr>
              {/* <td className="check-field">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={visibleUsuarios.every((propiedad) =>
                    selectsProperties.includes(propiedad.id)
                  )}
                />
              </td> */}
              <td>Fecha Creacion </td>
              <td>Nombres </td>
              <td>Email </td>
              <td>Sede </td>
              <td>Rol </td>
              <td className="ajustes-tabla-celda"></td>
            </tr>
          </thead>
          <tbody>
            {visibleUsuarios.length > 0 &&
              visibleUsuarios.map((usuario, index) => {
                return (
                  <tr
                    className=""
                    key={index}
                    // onClick={(e) => handleSelect(e, usuario.id)}
                  >
                    {/* <td className="check-field">
                      <input
                        type="checkbox"
                        value={usuario.id || ""}
                        onClick={(e) => handleCheckSelect(e, usuario.id)}
                        checked={selectsProperties.find((s) => {
                          if (s === usuario.id) {
                            return true;
                          } else {
                            return false;
                          }
                        })}
                      />
                    </td> */}
                    <td>
                      <div className="flex flex-col align-center font-bold text-bold-font">
                        {dayjs(usuario.createdAt)
                          .locale("de")
                          .format("DD [de] MMMM [del] YYYY")}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col align-center">
                        {usuario.name}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col align-center">
                        {usuario.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ textAlign: "center" }}>
                        <div>
                          <span className="estado publicado">
                            {usuario.sede.nameReferential}{" "}
                            {usuario.sede.department} {usuario.sede.province}{" "}
                            {usuario.sede.district}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ textAlign: "center" }}>
                        <div>
                          <span className="estado publicado">
                            {usuario.rol.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="ajustes-tabla-celda">
                      <div className="ajustes-tabla-celda-item px-4">
                        <Dropdown
                          className="text-sm text-gray-500"
                          placement="bottomRight"
                          menu={{
                            items: [
                              {
                                label: (
                                  <button
                                    onClick={() => {
                                      console.log("eliminar");
                                    }}
                                    className="w-full rounded flex items-center gap-2 text-sm"
                                  >
                                    <FaLock /> Cambiar Contraseña
                                  </button>
                                ),
                                key: 0,
                              },
                              {
                                label: (
                                  <Link
                                    to={`/propiedades/editar/${usuario.id}`}
                                    className="pr-6 rounded flex items-center gap-2 text-sm text-gray-500"
                                  >
                                    <FaEdit /> Editar info
                                  </Link>
                                ),
                                key: 1,
                              },
                              {
                                label: (
                                  <button
                                    onClick={() => {
                                      Modal.confirm({
                                        title:
                                          "¿Está seguro de eliminar la propiedad?",
                                        content:
                                          "Al eliminar la propiedad, se eliminarán los datos relacionados con la propiedad como: modelos, unidades y contenido multimedia",
                                        onOk: () =>
                                          handleEliminarProperty(usuario.id),
                                        okText: "Eliminar",
                                        cancelText: "Cancelar",
                                      });
                                    }}
                                    className="w-full rounded flex items-center gap-2 text-sm text-red-500"
                                  >
                                    <FaTrash /> Eliminar
                                  </button>
                                ),
                                key: 2,
                              },
                            ],
                          }}
                          trigger={["click"]}
                        >
                          <div
                            className="text-xs w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-all duration-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Space>
                              <FaEllipsisV />
                            </Space>
                          </div>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="table-controls">
        <div className="page">
          <div className="txt">
            Página {currentPage} de {totalPages}
          </div>
          <div style={{ marginBottom: "12px", marginRight: "24px" }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e));
                setCurrentPage(1); // Reset page to 1 on items per page change
              }}
              // style={{
              //   width: 120,
              // }}
              // dropdownMatchSelectWidth={false}
              placement={"topLeft"}
              options={[
                {
                  value: "1",
                  label: "1",
                },
                {
                  value: "10",
                  label: "10",
                },
                {
                  value: "25",
                  label: "25",
                },
                {
                  value: "50",
                  label: "50",
                },
                {
                  value: "100",
                  label: "100",
                },
                {
                  value: "500",
                  label: "500",
                },
              ]}
            />
          </div>
          <div className="disabled" style={{ marginBottom: "12px" }}>
            <Dropdown
              menu={{ items }}
              placement="bottomLeft"
              trigger={["click"]}
              disabled={selectsProperties.length > 0 ? false : true}
            >
              <Button>
                Editar selección <TbCaretDownFilled />
              </Button>
            </Dropdown>
          </div>
        </div>
        <div className="pagination-controls flex gap-2 items-center">
          <button
            className={`p-3 text-xs rounded ${
              currentPage === 1
                ? "bg-light-purple text-dark-purple"
                : "bg-dark-purple text-white"
            }  `}
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            1
          </button>
          <button
            className={`p-3 text-xs rounded ${
              currentPage === 1
                ? "bg-light-purple text-dark-purple"
                : "bg-dark-purple text-white"
            }  `}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>
          <button className="p-3 rounded bg-dark-purple text-white text-xs">
            {currentPage}
          </button>
          <button
            className={`p-3 text-xs rounded ${
              currentPage === totalPages
                ? "bg-light-purple text-dark-purple"
                : "bg-dark-purple text-white"
            }  `}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>
          <button
            className={`p-3 text-xs rounded ${
              currentPage === totalPages
                ? "bg-light-purple text-dark-purple"
                : "bg-dark-purple text-white"
            }  `}
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            {totalPages}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
