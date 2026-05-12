type MailLog = {
  id: number;
  to: string;
  subject: string;
  opened: boolean;
};

const logs: MailLog[] = [];

export const sendMailTracked = (to: string, subject: string) => {
  const id = Date.now();

  const pixel = `<img src="/api/mail/open/${id}" width="1" height="1" />`;

  logs.push({
    id,
    to,
    subject,
    opened: false,
  });

  return {
    id,
    to,
    subject,
    html: `<p>${subject}</p>${pixel}`,
  };
};

export const markOpened = (id: number): void => {
  const mail = logs.find((x) => x.id === id);

  if (mail) {
    mail.opened = true;
  }
};

export const getMailLogs = (): MailLog[] => {
  return logs;
};