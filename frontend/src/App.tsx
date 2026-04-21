import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CompaniesPage from "./pages/CompaniesPage";
import MandantesPage from "./pages/MandantesPage";
import CompanyGroupsPage from "./pages/CompanyGroupsPage";
import HierarchyPage from "./pages/HierarchyPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import DocumentsPage from "./pages/DocumentsPage";
import LmGroupsPage from "./pages/LmGroupsPage";
import LmRecordsPage from "./pages/LmRecordsPage";
import TpGroupsPage from "./pages/TpGroupsPage";
import TpRecordsPage from "./pages/TpRecordsPage";
import AnalysisPage from "./pages/AnalysisPage";
import ReportsPage from "./pages/ReportsPage";
import RequestsPage from "./pages/RequestsPage";
import LmRecordDetailPage from "./pages/LmRecordDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/mandantes" element={<MandantesPage />} />
        <Route path="/jerarquia" element={<HierarchyPage />} />
        <Route path="/company-groups" element={<CompanyGroupsPage />} />
        <Route path="/empresas" element={<CompaniesPage />} />
        <Route path="/colaboradores" element={<CollaboratorsPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/grupos-lm" element={<LmGroupsPage />} />
        <Route path="/registros-empresas" element={<LmRecordsPage />} />
        <Route path="/lm-records/:id" element={<LmRecordDetailPage />} />
        <Route path="/grupos-tp" element={<TpGroupsPage />} />
        <Route path="/gestiones-tp" element={<TpRecordsPage />} />
        <Route path="/analisis" element={<AnalysisPage />} />
        <Route path="/informes" element={<ReportsPage />} />
        <Route path="/mis-solicitudes" element={<RequestsPage />} />
      </Route>
    </Routes>
  );
}
