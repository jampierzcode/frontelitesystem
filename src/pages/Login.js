import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { FaUserCircle } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const Login = () => {
  const [viewPassword, setViewPassword] = useState(false);
  const { login, auth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.user) {
      const role = auth?.user?.role?.name; // Supongamos que el rol está en user.role
      console.log(role);
      if (role === "superadmin") {
        navigate("/personas"); // Redirigir a la ruta de usuarios
      } else if (role === "admin") {
        navigate("/inscritos"); // Redirigir a la ruta de usuarios
      } else if (role === "estudiante") {
        navigate("/notas"); // Redirigir al panel con módulos en formato grid
      } else if (role === "profesor") {
        navigate("/clases"); // Redirigir al panel con módulos en formato grid
      } else {
        navigate("/"); // Ruta por defecto
      }
    }
  }, [auth.user, navigate]);
  const handleViewPassword = () => {
    setViewPassword(!viewPassword);
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Resetear el estado del error antes de intentar iniciar sesión
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message); // Mostrar el mensaje de error específico
      }
    } catch (err) {
      console.error("Error inesperado al iniciar sesión:", err);
      setError("Ocurrió un error inesperado. Intente nuevamente.");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 ">
      <div className="relative col-span-2 content-image hidden md:block md:h-screen w-full bg-black">
        <img
          className="object-cover w-full h-full"
          src="/portada-login.png"
          alt="Academia Élite Sur"
        />
        <div className="absolute inset-0 w-full bg-black/20"></div>
      </div>
      <div className="h-full flex px-6 items-center justify-center bg-white">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded w-full">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-elite.jpg"
              alt="Academia Élite Sur"
              className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-full shadow-md"
            />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center">
            Iniciar sesión
          </h2>
          {error ? (
            <h1 className="border p-2 border-red-500 text-red-500 rounded-full">
              {error}
            </h1>
          ) : null}
          <div>
            <label htmlFor="usuario" className="text-sm text-gray-500">
              Email
            </label>
            <div className="flex items-start">
              <div className="bg-gray-100  h-auto p-2">
                <FaUserCircle className="text-lg text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-2 border mb-4 bg-gray-200 text-gray-900 text-sm rounded"
                required
              />
            </div>
          </div>
          <label htmlFor="usuario" className="text-sm text-gray-500">
            Contraseña
          </label>
          <div className="flex items-start relative">
            <div className="bg-gray-100  h-auto p-2">
              <RiLockPasswordLine className="text-lg text-gray-500" />
            </div>
            <input
              type={viewPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full p-2 border mb-4 bg-gray-200 text-gray-900 text-sm rounded"
              required
            />
            <div
              onClick={() => handleViewPassword()}
              className="absolute right-0 top-0 cursor-pointer p-2"
            >
              {viewPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-dark-purple text-white p-2 rounded"
          >
            Iniciar sesión
          </button>
          <Link
            to={"/login/identy"}
            className="text-center flex justify-center text-gray-500 text-sm w-full my-4"
          >
            Olvidé la Contraseña
          </Link>
          {/* <Link
            to={"/termandpolicies"}
            className="text-center font-bold flex justify-center text-gray-500 text-sm w-full my-4"
          >
            Términos y Políticas
          </Link> */}
        </form>
      </div>
    </div>
  );
};

export default Login;
