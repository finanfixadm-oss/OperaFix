export type WorkflowRule = {
  field: string;
  value: string | number | boolean | null;
  action: string;
};

export type WorkflowResult = {
  executed: boolean;
  action?: string;
};

export type WorkflowRecord = Record<string, string | number | boolean | null | undefined>;

export const runWorkflow = (
  record: WorkflowRecord,
  rules: WorkflowRule[]
): WorkflowResult[] => {
  return rules.map((rule: WorkflowRule): WorkflowResult => {
    if (record[rule.field] === rule.value) {
      return {
        executed: true,
        action: rule.action,
      };
    }

    return {
      executed: false,
    };
  });
};