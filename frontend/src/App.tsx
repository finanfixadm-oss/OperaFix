import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LmRecordsPage from "./pages/LmRecordsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<LmRecordsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}