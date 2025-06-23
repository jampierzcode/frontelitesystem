import React from "react";
import { MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const LogoutButton = ({ open }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="mt-auto transition-all duration-300 hover:bg-light-purple hover:text-dark-purple p-2 text-sm rounded flex gap-3 items-center w-full"
    >
      <span className="block float-left text-2xl">
        <MdLogout />
      </span>
      <span
        className={`text-base text-start font-medium flex-1 ${
          !open && "hidden"
        }`}
      >
        Salir
      </span>
    </button>
  );
};

export default LogoutButton;
