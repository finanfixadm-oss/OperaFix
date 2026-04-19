import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
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
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/empresas" element={<CompaniesPage />} />
        <Route path="/colaboradores" element={<CollaboratorsPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/grupos-lm" element={<LmGroupsPage />} />
        <Route path="/registros-empresas" element={<LmRecordsPage />} />
        <Route path="/grupos-tp" element={<TpGroupsPage />} />
        <Route path="/gestiones-tp" element={<TpRecordsPage />} />
      </Route>
    </Routes>
  );
}
