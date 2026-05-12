export type TaskStatus = "pendiente" | "en_proceso" | "completado";

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
};

export const createTask = (title: string): Task => {
  return {
    id: Date.now(),
    title,
    status: "pendiente",
  };
};