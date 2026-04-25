import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import CompanyRecordsPage from "./pages/CompanyRecordsPage";
import CompanyRecordDetailPage from "./pages/CompanyRecordDetailPage";
import MandantesPage from "./pages/MandantesPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<CompanyRecordsPage />} />
          <Route path="/records/:id" element={<CompanyRecordDetailPage />} />
          <Route path="/company-records" element={<Navigate to="/records" replace />} />
          <Route path="/company-records/:id" element={<CompanyRecordDetailPage />} />
          <Route path="/mandantes" element={<MandantesPage />} />
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<CompanyRecordDetailPage />} />
          <Route path="*" element={<Navigate to="/records" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
