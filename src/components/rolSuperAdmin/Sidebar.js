import React from "react";
import { NavLink } from "react-router-dom";
import LogoutButton from "../LogoutButton";

import { BsArrowLeftShort, BsArrowRightShort } from "react-icons/bs";
import { IoSpeedometerOutline } from "react-icons/io5";
import { useAuth } from "../AuthContext";
import { AiOutlineUser } from "react-icons/ai";
import { FaHome, FaTags, FaUsers } from "react-icons/fa";

const Sidebar = ({ open, setOpen }) => {
  const { auth } = useAuth();
  const handlerSidebar = () => {
    setOpen(!open);
  };
  const menuSuperAdmin = [
    {
      is_title_head: false,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: <IoSpeedometerOutline />,
        },
      ],
    },
    {
      is_title_head: true,
      title_head: "Registros",
      items: [
        {
          title: "Personas",
          url: "/personas",
          icon: <FaTags />,
        },
        {
          title: "Matriculas",
          url: "/matriculas",
          icon: <FaTags />,
        },
      ],
    },
    {
      is_title_head: true,
      title_head: "Sistema",
      items: [
        {
          title: "Sedes",
          url: "/sedes",
          icon: <FaHome />,
        },
        {
          title: "Ciclos",
          url: "/ciclos",
          icon: <FaTags />,
        },
        {
          title: "Configuracion Pagos",
          url: "/configuracion_pagos",
          icon: <FaTags />,
        },
        {
          title: "Usuarios",
          url: "/usuarios",
          icon: <FaUsers />,
        },
      ],
    },
  ];
  return (
    <div className="">
      <div
        className={` z-20 h-screen bg-white shadow-lg text-light-font p-5 pt-8 ${
          open
            ? "translate-x-0 md:translate-x-0 w-60 md:w-60"
            : "-translate-x-20 w-20 md:translate-x-0 md:block md:w-20"
        } duration-300 fixed md:relative block`}
      >
        {open ? (
          <BsArrowLeftShort
            onClick={handlerSidebar}
            className="hidden md:block bg-white text-dark-purple rounded-full absolute -right-3 top-9 text-3xl border border-dark-purple cursor-pointer"
          />
        ) : (
          <BsArrowRightShort
            onClick={handlerSidebar}
            className="hidden md:block bg-white text-dark-purple rounded-full absolute -right-3 top-9 text-3xl border border-dark-purple cursor-pointer"
          />
        )}

        <div className="overflow-hidden">
          {open ? (
            <div className="flex items-center justify-center bg-dark-purple rounded">
              {/* <img
                className="h-[100px] mx-auto object-contain block"
                src="../logo.jpg"
                alt=""
              /> */}
            </div>
          ) : (
            <div className="flex items-center justify-center bg-dark-purple rounded">
              {/* <img
                className="h-[100px] mx-auto object-contain block"
                src="../logo.jpg"
                alt=""
              /> */}
            </div>
            // <img className="w-[80px]" src="./iconapp.png" alt="" />
          )}
        </div>
        <div className="w-full py-[20px] inline-flex items-center gap-2 px-2 bg-gray-100 rounded">
          <img
            src="https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?size=338&ext=jpg&ga=GA1.1.1141335507.1718841600&semt=ais_user"
            className="w-6 h-6 rounded-full block cursor-pointer float-left mr-2 "
            alt=""
          />
          <div className={`${!open && "scale-0"} overflow-hidden`}>
            <h1 className="text-lg font-bold text-start overflow-hidden text-ellipsis">
              {auth.user.person.nombre}
            </h1>
            <h1 className="text-sm text-start">{auth.user.person.email}</h1>
            <span className="text-sm font-bold text-start">superadmin</span>
          </div>
        </div>
        <nav className="pt-2 flex flex-col gap-2">
          {menuSuperAdmin.map((item, index) => (
            <div key={index}>
              {item.is_title_head ? (
                <span className="font-bold text-sm">{item.title_head}</span>
              ) : null}
              <span>{}</span>
              {item.items.map((i, index) => {
                return (
                  <NavLink
                    key={index}
                    to={i.url}
                    className={({ isActive }) =>
                      isActive
                        ? "bg-gray-100 text-dark-purple  font-bold text-sm p-2 flex gap-3 items-center rounded duration-300 transition-all"
                        : "p-2 text-sm hover:bg-gray-100 hover:text-dark-purple  transition-all rounded duration-300 flex gap-3 items-center"
                    }
                  >
                    <span className="block float-left text-xl">{i.icon}</span>
                    <span className={`text-sm flex-1 ${!open && "hidden"}`}>
                      {i.title}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
          <LogoutButton open={open} />
        </nav>
      </div>
      <div
        onClick={() => setOpen(false)}
        className={`${
          open ? "" : "hidden"
        } block md:hidden w-full bg-gray-900 opacity-50 absolute top-0 h-full bottom-0 left-0 right-0 z-10`}
      ></div>
    </div>
  );
};

export default Sidebar;
