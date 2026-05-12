export const calculateScore = (
  monto: number,
  antiguedad: number,
  probabilidad: number
): number => {
  return monto * 0.5 + antiguedad * 0.3 + probabilidad * 0.2;
};