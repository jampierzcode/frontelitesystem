import React from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import "@ant-design/v5-patch-for-react-19";

import { AuthProvider } from "./components/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Usuarios from "./pages/superadmin/Usuarios";
import LayoutSuperadmin from "./components/rolSuperAdmin/Layout";
import NotFoundPage from "./pages/NotFoundPage";
import Identy from "./pages/Identy";
import PedidoManager from "./pages/superadmin/PedidoManager";
import CampaignDetails from "./pages/superadmin/CampaignDetail";
import BarcodeScanner from "./components/rolSuperAdmin/BarCodeScanner";
import Generador from "./pages/superadmin/Generador";
import SqlGenerator from "./pages/superadmin/SqlGenerator";
import ExcelUpload from "./pages/superadmin/ExcelUpload";
import SedesManager from "./pages/superadmin/SedesManager";
import InscritosManager from "./pages/superadmin/InscritosManager";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/identy" element={<Identy />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* RUTAS PARA USUARIO SUPERADMIN */}
          <Route
            path="/sedes"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <LayoutSuperadmin>
                  <SedesManager />
                </LayoutSuperadmin>
              </PrivateRoute>
            }
          />
          <Route
            path="/inscritos"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <LayoutSuperadmin>
                  <InscritosManager />
                </LayoutSuperadmin>
              </PrivateRoute>
            }
          />
          <Route
            path="/pedidos"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <LayoutSuperadmin>
                  <PedidoManager />
                </LayoutSuperadmin>
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <LayoutSuperadmin>
                  <Usuarios />
                </LayoutSuperadmin>
              </PrivateRoute>
            }
          />
          <Route path="/scanner" element={<BarcodeScanner />} />
          <Route path="/generator-codigos/:id" element={<Generador />} />
          <Route path="/generator-sqls" element={<SqlGenerator />} />
          <Route path="/generator-update" element={<ExcelUpload />} />
          <Route
            path="/campaigns/:id"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <LayoutSuperadmin>
                  <CampaignDetails />
                </LayoutSuperadmin>
              </PrivateRoute>
            }
          />
          {/* RUTA DE FORBIDDEN */}
          <Route path="/forbidden" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
