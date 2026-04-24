import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<RecordsPage />} />

          {/* LISTA */}
          <Route path="/records" element={<RecordsPage />} />

          {/* DETALLE */}
          <Route path="/records/:id" element={<RecordDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}