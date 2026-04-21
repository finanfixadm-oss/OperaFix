import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ReportsPage from "./pages/ReportsPage";
import AnalysisPage from "./pages/AnalysisPage";
import DocumentsPage from "./pages/DocumentsPage";
import CompaniesPage from "./pages/CompaniesPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import LmGroupsPage from "./pages/LmGroupsPage";
import LmRecordsPage from "./pages/LmRecordsPage";
import TpGroupsPage from "./pages/TpGroupsPage";
import TpRecordsPage from "./pages/TpRecordsPage";
import RequestsPage from "./pages/RequestsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/empresas" element={<CompaniesPage />} />
        <Route path="/colaboradores" element={<CollaboratorsPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/grupos-lm" element={<LmGroupsPage />} />
        <Route path="/registros-empresas" element={<LmRecordsPage />} />
        <Route path="/grupos-tp" element={<TpGroupsPage />} />
        <Route path="/gestiones-tp" element={<TpRecordsPage />} />
        <Route path="/informes" element={<ReportsPage />} />
        <Route path="/analisis" element={<AnalysisPage />} />
        <Route path="/mis-solicitudes" element={<RequestsPage />} />
      </Route>
    </Routes>
  );
}
