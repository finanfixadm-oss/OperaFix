
import { detectDuplicates } from "./duplicateDetector";

export async function processRows(data:any[], prisma:any){
  const duplicates = detectDuplicates(data);

  let inserted = 0;

  for(const row of data){
    const exists = duplicates.find(d=>d.rut===row.rut);

    if(exists){
      continue;
    }

    await prisma.management.create({
      data: row
    });

    inserted++;
  }

  return {
    inserted,
    duplicates: duplicates.length
  };
}
