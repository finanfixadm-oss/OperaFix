
import { parseMoney } from "../utils/number.js";

export function mapRow(row:any){
  return {
    mandante: row["Mandante"],
    razon_social: row["Razón Social"],
    rut: String(row["RUT"]).replace(/\./g,""),
    entidad: row["Entidad"],
    estado_gestion: row["Estado Gestión"],
    monto_devolucion: parseMoney(row["Monto Devolución"]),
    monto_real_pagado: parseMoney(row["Monto Real Pagado"]),
  };
}
