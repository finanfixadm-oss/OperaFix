
export function detectOpportunities(rows:any[]){
  return rows.filter(r=>r.monto_devolucion > 1000000);
}
