import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RecordsPage from "./pages/RecordsPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import MandantesPage from "./pages/MandantesPage";
import DashboardExecutivePage from "./pages/DashboardExecutivePage";
import ClientPortalPage from "./pages/ClientPortalPage";
import AiGestionesPage from "./pages/AiGestionesPage";
import MassImportPage from "./pages/MassImportPage";
import UsersPage from "./pages/UsersPage";
import ReportsBuilderPage from "./pages/ReportsBuilderPage";
import LoginPage from "./pages/LoginPage";
import { defaultPathForUser, getCurrentUser } from "./auth";
import V66AutomationPage from "./pages/V66AutomationPage";
import AICommandCenterPage from "./pages/AICommandCenterPage";
import "./styles/zoho-modules.css";

function RootRedirect() {
  return <Navigate to={defaultPathForUser(getCurrentUser())} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/v66-automation" element={<V66AutomationPage />} />

          <Route
            path="/ai-command-center"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam"]}>
                <AICommandCenterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam"]}>
                <DashboardExecutivePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/records"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam"]}>
                <RecordsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/records/:id"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam"]}>
                <RecordDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal-cliente"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam", "cliente"]}>
                <ClientPortalPage />
              </ProtectedRoute>
            }
          />

          <Route path="/ia-gestiones" element={<Navigate to="/ai-command-center" replace />} />
                       

          <Route
            path="/carga-masiva"
            element={
              <ProtectedRoute roles={["admin", "interno"]}>
                <MassImportPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/informes"
            element={
              <ProtectedRoute roles={["admin", "interno", "kam", "cliente"]}>
                <ReportsBuilderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/usuarios"
            element={
              <ProtectedRoute roles={["admin", "interno"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mandantes"
            element={
              <ProtectedRoute roles={["admin", "interno"]}>
                <MandantesPage />
              </ProtectedRoute>
            }
          />

          <Route path="/company-records" element={<Navigate to="/records" replace />} />
          <Route path="/company-records/:id" element={<Navigate to="/records" replace />} />
          <Route path="/managements" element={<Navigate to="/records" replace />} />
          <Route path="/managements/:managementId/documents" element={<Navigate to="/records" replace />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}