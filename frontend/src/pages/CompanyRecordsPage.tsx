import { useEffect, useState } from "react";
import api from "../api";

export default function CompanyRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mandante, setMandante] = useState("Optimiza");

  useEffect(() => {
    fetchData();
  }, [mandante]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/records?mandante=${mandante}`);
      setRecords(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="zoho-container">
      <h1>Registros de empresas</h1>

      {/* 🔵 Tabs */}
      <div className="zoho-tabs">
        <button onClick={() => setMandante("Optimiza")}>Optimiza Consulting</button>
        <button onClick={() => setMandante("Mundo")}>Mundo Previsional</button>
        <button onClick={() => setMandante("Mis")}>Mis registros</button>
      </div>

      {/* 🔍 Filtros */}
      <div className="zoho-filter-box">
        <input placeholder="Buscar..." className="zoho-input" />
      </div>

      {/* 📊 Tabla */}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="zoho-table">
          <thead>
            <tr>
              <th>Entidad</th>
              <th>RUT</th>
              <th>Estado Gestión</th>
              <th>Monto</th>
              <th>Razón Social</th>
              <th>N° Solicitud</th>
              <th>Mes</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} onClick={() => window.location.href = `/company-records/${r.id}`}>
                <td>{r.entidad}</td>
                <td>{r.rut}</td>
                <td>{r.estado}</td>
                <td>{r.monto}</td>
                <td>{r.razon_social}</td>
                <td>{r.numero_solicitud}</td>
                <td>{r.mes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}