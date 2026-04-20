import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CompaniesPage from "./pages/CompaniesPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import DocumentsPage from "./pages/DocumentsPage";
import LmGroupsPage from "./pages/LmGroupsPage";
import LmRecordsPage from "./pages/LmRecordsPage";
import TpGroupsPage from "./pages/TpGroupsPage";
import TpRecordsPage from "./pages/TpRecordsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="colaboradores" element={<CollaboratorsPage />} />
        <Route path="documentos" element={<DocumentsPage />} />
        <Route path="grupos-lm" element={<LmGroupsPage />} />
        <Route path="registros-empresas" element={<LmRecordsPage />} />
        <Route path="grupos-tp" element={<TpGroupsPage />} />
        <Route path="gestiones-tp" element={<TpRecordsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
