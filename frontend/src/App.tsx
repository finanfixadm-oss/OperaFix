import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import MandantesPage from "./pages/MandantesPage";
import DashboardExecutivePage from "./pages/DashboardExecutivePage";
import ClientPortalPage from "./pages/ClientPortalPage";
import AiGestionesPage from "./pages/AiGestionesPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardExecutivePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />
          <Route path="/portal-cliente" element={<ClientPortalPage />} />
          <Route path="/ia-gestiones" element={<AiGestionesPage />} />
          <Route path="/mandantes" element={<MandantesPage />} />

          <Route path="/company-records" element={<Navigate to="/records" replace />} />
          <Route path="/company-records/:id" element={<Navigate to="/records" replace />} />
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<Navigate to="/records" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
