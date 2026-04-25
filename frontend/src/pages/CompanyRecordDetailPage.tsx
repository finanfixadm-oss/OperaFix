import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchJson } from "../api";

export default function CompanyRecordDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("notas");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const data = await fetchJson(`/records/${id}`);
    setData(data);
  };

  if (!data) return <div>Cargando ficha...</div>;

  return (
    <div className="zoho-detail">

      {/* 🟦 CABECERA */}
      <div className="zoho-header">
        <h1>{data.razon_social}</h1>
        <span>{data.motivo}</span>

        <button>Enviar correo</button>
        <button>Editar</button>
      </div>

      {/* 🔘 TABS */}
      <div className="zoho-tabs">
        <button onClick={() => setTab("notas")}>Notas</button>
        <button onClick={() => setTab("correos")}>Correos</button>
        <button onClick={() => setTab("cronologia")}>Cronología</button>
        <button onClick={() => setTab("archivos")}>Archivos</button>
      </div>

      {/* 📄 CONTENIDO TAB */}
      <div className="zoho-tab-content">
        {tab === "notas" && <textarea placeholder="Agregar nota..." />}
        {tab === "correos" && <div>Correos aquí</div>}
        {tab === "cronologia" && <div>Historial</div>}
        {tab === "archivos" && <div>Archivos generales</div>}
      </div>

      {/* 🔻 SECCIONES */}
      <div className="zoho-sections">

        <section>
          <h3>Datos empresa</h3>
          <p>RUT: {data.rut}</p>
          <p>Razón Social: {data.razon_social}</p>
        </section>

        <section>
          <h3>Datos bancarios</h3>
          <p>Banco: {data.banco}</p>
        </section>

        <section>
          <h3>Información de gestión</h3>
          <p>Estado: {data.estado}</p>
        </section>

        <section>
          <h3>Archivos</h3>
          {data.documents?.map((d: any) => (
            <div key={d.id}>{d.category}</div>
          ))}
        </section>

        <section>
          <h3>Montos</h3>
          <p>{data.monto}</p>
        </section>

        <section>
          <h3>Facturación</h3>
          <p>Factura: {data.factura}</p>
        </section>

      </div>
    </div>
  );
}