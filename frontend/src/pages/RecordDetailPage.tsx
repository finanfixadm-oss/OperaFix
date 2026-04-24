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
    <h1>{data.company?.razon_social || "Sin nombre"}</h1>

    {/* TABS */}
    <div className="tabs">
      <button>Notas</button>
      <button>Correos</button>
      <button>Cronología</button>
      <button>Archivos</button>
    </div>

    <div className="grid">

      <section>
        <h3>Datos empresa</h3>
        <p>RUT: {data.company?.rut}</p>
        <p>Mandante: {data.mandante?.nombre}</p>
        <p>Razón Social: {data.company?.razon_social}</p>
      </section>

      <section>
        <h3>Datos bancarios</h3>
        <p>Banco: {data.banco}</p>
        <p>Tipo cuenta: {data.tipo_cuenta}</p>
        <p>N° cuenta: {data.numero_cuenta}</p>
      </section>

      <section>
        <h3>Información gestión</h3>
        <p>Estado: {data.estado_gestion}</p>
        <p>AFP: {data.lineAfp?.afp}</p>
        <p>Tipo: {data.tipo}</p>
        <p>N° Solicitud: {data.numero_solicitud}</p>
      </section>

      <section>
        <h3>Archivos / respaldo</h3>
        <ul>
          {data.documents?.map((d: any) => (
            <li key={d.id}>{d.nombre}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Montos</h3>
        <p>Monto devolución: {data.monto_devolucion}</p>
        <p>Monto pagado: {data.monto_pagado}</p>
      </section>

      <section>
        <h3>Facturación</h3>
        <p>Factura: {data.numero_factura}</p>
        <p>OC: {data.numero_oc}</p>
      </section>

    </div>
  </div>
);
}