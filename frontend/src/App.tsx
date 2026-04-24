import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />

          {/* Compatibilidad: rutas antiguas redirigen al módulo vigente */}
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<RecordDetailPage />} />
          <Route path="*" element={<Navigate to="/records" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
