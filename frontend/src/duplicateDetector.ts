
export function detectDuplicates(rows:any[]){
  const seen = new Map();
  const duplicates:any[] = [];

  for(const r of rows){
    const key = `${r.rut}_${r.periodo || ""}`;
    if(seen.has(key)){
      duplicates.push(r);
    } else {
      seen.set(key,true);
    }
  }

  return duplicates;
}
