
const memory = new Map();

export function saveConversation(userId: string, payload: any) {
  memory.set(userId, payload);
}

export function getConversation(userId: string) {
  return memory.get(userId);
}
