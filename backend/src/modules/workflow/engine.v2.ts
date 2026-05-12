export type Trigger = "onCreate" | "onUpdate" | "cron";

export type Condition = {
  field: string;
  op: "eq" | "contains" | "gt" | "lt";
  value: any;
};

export type Action =
  | { type: "update"; data: Record<string, any> }
  | { type: "email"; toField: string; subject: string }
  | { type: "tag"; tag: string };

export type Rule = {
  id: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
};

export const match = (record: Record<string, any>, c: Condition) => {
  const v = record[c.field];
  if (v === undefined || v === null) return false;

  switch (c.op) {
    case "eq":
      return String(v) === String(c.value);
    case "contains":
      return String(v).toLowerCase().includes(String(c.value).toLowerCase());
    case "gt":
      return Number(v) > Number(c.value);
    case "lt":
      return Number(v) < Number(c.value);
    default:
      return false;
  }
};

export const evaluateRule = (
  record: Record<string, any>,
  rule: Rule
) => {
  if (!rule.enabled) return false;
  return rule.conditions.every((c) => match(record, c));
};