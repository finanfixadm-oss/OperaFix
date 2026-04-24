import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ModulePlaceholderPage from "./pages/ModulePlaceholderPage";
import ManagementLinesPage from "./pages/ManagementLinesPage";
import ManagementLineAfpsPage from "./pages/ManagementLineAfpsPage";
import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<RecordsPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />

          {/* Compatibilidad con rutas anteriores */}
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<RecordDetailPage />} />
          <Route path="/management-lines" element={<ManagementLinesPage />} />
          <Route path="/management-lines/:lineId/afps" element={<ManagementLineAfpsPage />} />

          <Route path="/mandantes" element={<ModulePlaceholderPage title="Mandantes" subtitle="Módulo en preparación" />} />
          <Route path="/company-groups" element={<ModulePlaceholderPage title="Grupos de empresas" subtitle="Módulo en preparación" />} />
          <Route path="/companies" element={<ModulePlaceholderPage title="Empresas" subtitle="Módulo en preparación" />} />
          <Route path="/documents" element={<ModulePlaceholderPage title="Documentos" subtitle="Buscador general de documentos en preparación" />} />
          <Route path="/analysis" element={<ModulePlaceholderPage title="Análisis" subtitle="Módulo en preparación" />} />
          <Route path="/reports" element={<ModulePlaceholderPage title="Informes" subtitle="Módulo en preparación" />} />
          <Route path="/jerarquia" element={<ModulePlaceholderPage title="Jerarquía" subtitle="Módulo en preparación" />} />

          <Route path="*" element={<Navigate to="/records" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
