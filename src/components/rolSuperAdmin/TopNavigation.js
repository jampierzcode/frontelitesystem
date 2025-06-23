import dayjs from "dayjs";
import React from "react";
import { BsBellFill, BsJustifyRight } from "react-icons/bs";

import { useAuth } from "../AuthContext";

const TopNavigation = ({ open, setOpen }) => {
  const { auth } = useAuth();

  const last_conection = dayjs().format("DD/MM • HH:mm");
  return (
    <>
      <div className="hidden bg-white lg:block p-6 border-solid border-b-2 border-gray-8">
        <div className="hidden lg:flex items-center justify-between">
          <div className="hidden lg:block">
            <h1 className="text-gray-2 text-xl font-semibold mr-4 leading-3 inline-block">
              ¡Hola, {auth?.user?.name}!
            </h1>
            <span className="text-gray-5 text-xs rounded-lg bg-gray-9 px-3 inline-block">
              Tu última conexión: {last_conection}
            </span>
          </div>
          <div className="hidden lg:flex justify-end self-start">
            <div className="self-center">
              <div className="cursor-pointer counter-icon relative">
                <div className="rounded-full bg-dark-purple text-white text-sm flex items-center justify-center w-5 h-5 text-center absolute -top-2 -right-2">
                  <span className="text-white text-xs">2</span>
                </div>
                <BsBellFill className="text-xl ml-2 active-bell text-gray-400" />
              </div>
            </div>
            <div className="ml-3">
              <div className="flex flex-col items-end">
                <div>
                  <button className="flex flex-row items-center outline-none">
                    <div className="rounded-full flex justify-center items-center self-center border-2 border-gray-2 h-10 w-10 text-16 avatar-background">
                      <span className="text-gray-2 text-sm font-semibold uppercase">
                        VL
                      </span>
                    </div>
                    <div className="flex flex-col ml-2 mr-1 text-left">
                      <h3 className="text-sm font-semibold text-gray-2 -mb-1">
                        {auth.user.nombre}
                      </h3>
                      <span className="text-gray-5 text-xs my-0">
                        {auth.user.email}
                      </span>
                    </div>
                    <i className="fas fa-chevron-down pl-7 text-gray-5 text-12 border-gray-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex ">
          <span className="title text-18 lg:text-26"></span>
        </div>
      </div>
      <div className="block md:hidden p-6">
        {open ? (
          <BsJustifyRight
            onClick={() => setOpen(false)}
            className="bg-white text-dark-purple rounded-full text-3xl border border-dark-purple cursor-pointer"
          />
        ) : (
          <BsJustifyRight
            onClick={() => setOpen(true)}
            className="bg-white text-dark-purple text-3xl cursor-pointer"
          />
        )}
      </div>
    </>
  );
};

export default TopNavigation;
