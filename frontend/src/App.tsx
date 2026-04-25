import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import MandantesPage from "./pages/MandantesPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />
          <Route path="/mandantes" element={<MandantesPage />} />

          <Route path="/company-records" element={<Navigate to="/records" replace />} />
          <Route path="/company-records/:id" element={<Navigate to="/records" replace />} />
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<Navigate to="/records" replace />} />
          <Route path="*" element={<Navigate to="/records" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
