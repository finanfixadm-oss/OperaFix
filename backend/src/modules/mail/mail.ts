export type MailResult = {
  success: boolean;
  to: string;
  subject: string;
};

export const sendMail = (to: string, subject: string): MailResult => {
  return {
    success: true,
    to,
    subject,
  };
};