import React, { useEffect, useState } from "react";

type LmRecord = {
  id: string;
  razon_social?: string | null;
  company_name?: string | null;
  refund_amount?: number | string | null;
  monto_devolucion?: number | string | null;
  estado_gestion?: string | null;
  status?: string | null;
  management_status?: string | null;
};

export default function KanbanPro() {
  const [data, setData] = useState<LmRecord[]>([]);

  useEffect(() => {
    const loadRecords = async () => {
      const response = await fetch("/api/lm-records");
      const records = (await response.json()) as LmRecord[];
      setData(Array.isArray(records) ? records : []);
    };

    loadRecords().catch(console.error);
  }, []);

  const estados = ["Pendiente", "En gestión", "Pagado"];

  const getEstado = (item: LmRecord): string => {
    return (
      item.estado_gestion ||
      item.management_status ||
      item.status ||
      "Pendiente"
    );
  };

  const getNombre = (item: LmRecord): string => {
    return item.razon_social || item.company_name || "Sin razón social";
  };

  const getMonto = (item: LmRecord): number => {
    return Number(item.refund_amount || item.monto_devolucion || 0);
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {estados.map((estado) => (
        <div key={estado} style={{ width: 300 }}>
          <h3>{estado}</h3>

          {data
            .filter((item) =>
              getEstado(item).toLowerCase().includes(estado.toLowerCase())
            )
            .map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 10,
                  marginBottom: 10,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
              >
                <strong>{getNombre(item)}</strong>
                <div>
                  {getMonto(item).toLocaleString("es-CL", {
                    style: "currency",
                    currency: "CLP",
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}