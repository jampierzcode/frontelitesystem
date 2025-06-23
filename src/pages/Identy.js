import React, { useState } from "react";

const Identy = () => {
  const [email, setEmail] = useState(null);

  const handleSendCode = async () => {
    try {
      console.log(email);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="w-full flex items-center min-h-screen px-6">
      <div className="w-full flex items-center justify-center bg-white max-w-[650px] mx-auto px-6 py-6">
        <div className="w-full">
          <h1 className="text-xl font-bold text-center mb-4">
            Para reestablecer tu contraseña, ingresa tu correo electrónico para
            enviar un codigo de recuperacion
          </h1>
          <div className="group mb-4">
            <label className="w-full mb-2 inline-block" htmlFor="email">
              Correo electronico
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 bg-gray-200 rounded w-full"
              type="text"
            />
          </div>
          <button
            onClick={handleSendCode}
            className="w-full px-3 py-2 rounded bg-dark-purple text-white text-lg"
          >
            Send code
          </button>
        </div>
      </div>
    </div>
  );
};

export default Identy;
