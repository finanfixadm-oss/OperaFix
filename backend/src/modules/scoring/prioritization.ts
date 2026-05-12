export type RecordLM = {
  monto_devolucion: number;
  antiguedad_dias: number;
  probabilidad_pago: number;
};

export const calculatePriority = (r: RecordLM): number => {
  return (
    r.monto_devolucion * 0.5 +
    r.antiguedad_dias * 0.3 +
    r.probabilidad_pago * 0.2
  );
};