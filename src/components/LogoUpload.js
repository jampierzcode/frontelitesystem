import React from "react";
import { FaTimes } from "react-icons/fa";

const LogoUpload = ({ logo, setLogo, setLogoFile }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    console.log(url);
    console.log(file);
    setLogo(url);
    setLogoFile(file);
  };

  const handleDelete = () => {
    setLogo("");
    setLogoFile("");
    let file = document.getElementById("perfil_upload");
    file.value = "";
  };

  return (
    <div className="relative" id="content-perfil">
      <div id="img-profile" className="w-[80px]">
        <input
          id="perfil_upload"
          className="hidden"
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.heif"
          onChange={handleFileChange}
        />
        {logo ? (
          <>
            <img
              className="w-[80px] h-[80px] object-cover shadow-md p-1 rounded-full"
              src={logo}
              alt="Profile"
            />
            <span
              id="delete_perfil_photo"
              className="inline-block translate-x-[50%] translate-y-[-50%] rounded-full w-[30px] h-[30px] p-2 absolute top-[0] right-[0] shadow-lg z-[5000] bg-white cursor-pointer"
              onClick={handleDelete}
            >
              <FaTimes />
            </span>
          </>
        ) : (
          <div
            id="perfil_overlay"
            className="w-[90px] h-[90px] p-1 rounded-full ring-2 ring-gray-200 dark:ring-gray-500 flex items-center flex-col bg-gray-100 text-gray-400 gap-2 justify-center cursor-pointer"
            onClick={() => document.getElementById("perfil_upload").click()}
          >
            <ion-icon
              className="text-[25px]"
              name="business-outline"
            ></ion-icon>
            <p className="text-[8px] w-[70%] text-center">
              Selecciona un logo para tu empresa
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoUpload;
