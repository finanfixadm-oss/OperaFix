import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function RecordDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + "/records/" + id)
      .then(res => res.json())
      .then(setData);
  }, [id]);

  if (!data) return <div>Cargando ficha...</div>;

  return (
    <div>
      <h1>{data.company}</h1>

      {/* TABS */}
      <div className="tabs">
        <button>Notas</button>
        <button>Correos</button>
        <button>Cronología</button>
        <button>Archivos</button>
      </div>

      {/* SECCIONES */}
      <div className="grid">

        <section>
          <h3>Datos empresa</h3>
          <p>RUT: {data.rut}</p>
          <p>Mandante: {data.mandante}</p>
        </section>

        <section>
          <h3>Datos bancarios</h3>
          <p>Banco: {data.bank}</p>
        </section>

        <section>
          <h3>Información gestión</h3>
          <p>Estado: {data.status}</p>
          <p>AFP: {data.entity}</p>
        </section>

        <section>
          <h3>Archivos</h3>
          <ul>
            {data.documents?.map((d: any) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Montos</h3>
          <p>Monto devolución: {data.amount}</p>
        </section>

        <section>
          <h3>Facturación</h3>
          <p>Factura: {data.invoice}</p>
        </section>

      </div>
    </div>
  );
}