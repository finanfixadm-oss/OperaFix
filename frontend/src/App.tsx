import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ModulePlaceholderPage from "./pages/ModulePlaceholderPage";
import ManagementLinesPage from "./pages/ManagementLinesPage";
import ManagementLineAfpsPage from "./pages/ManagementLineAfpsPage";
import ManagementsPage from "./pages/ManagementsPage";
import ManagementDocumentsPage from "./pages/ManagementDocumentsPage";
import "./styles/zoho-modules.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <ModulePlaceholderPage
                title="OperaFix CRM"
                subtitle="Migración frontend en curso"
              />
            }
          />

          <Route
            path="/mandantes"
            element={
              <ModulePlaceholderPage
                title="Mandantes"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/company-groups"
            element={
              <ModulePlaceholderPage
                title="Grupos de empresas"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/companies"
            element={
              <ModulePlaceholderPage
                title="Empresas"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/documents"
            element={
              <ModulePlaceholderPage
                title="Documentos"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/analysis"
            element={
              <ModulePlaceholderPage
                title="Análisis"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/reports"
            element={
              <ModulePlaceholderPage
                title="Informes"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route
            path="/jerarquia"
            element={
              <ModulePlaceholderPage
                title="Jerarquía"
                subtitle="Vista temporal mientras se rehace el módulo"
              />
            }
          />

          <Route path="/management-lines" element={<ManagementLinesPage />} />
          <Route
            path="/management-lines/:lineId/afps"
            element={<ManagementLineAfpsPage />}
          />
          <Route path="/managements" element={<ManagementsPage />} />
          <Route
            path="/managements/:managementId/documents"
            element={<ManagementDocumentsPage />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}