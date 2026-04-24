import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + "/records")
      .then(res => res.json())
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  return (
    <div>
      <h1>Registros de empresas</h1>

      <div className="zoho-layout">
        <div className="zoho-filters">
          <input placeholder="Buscar..." />

          <button>Filtrar</button>
        </div>

        <table className="zoho-table">
          <thead>
            <tr>
              <th>Entidad</th>
              <th>RUT</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Razón social</th>
            </tr>
          </thead>

          <tbody>
            {records.map(r => (
              <tr key={r.id} onClick={() => navigate(`/records/${r.id}`)}>
                <td>{r.entity}</td>
                <td>{r.rut}</td>
                <td>{r.status}</td>
                <td>{r.amount}</td>
                <td>{r.company}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}