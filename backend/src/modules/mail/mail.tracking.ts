export type MailTracking = {
  id: number;
  to: string;
  subject: string;
  opened: boolean;
};

let logs: MailTracking[] = [];

export const sendTrackedMail = (to: string, subject: string) => {
  const mail = {
    id: Date.now(),
    to,
    subject,
    opened: false,
  };

  logs.push(mail);

  return mail;
};

export const markAsOpened = (id: number) => {
  const mail = logs.find(m => m.id === id);
  if (mail) mail.opened = true;
};

export const getMailLogs = () => logs;