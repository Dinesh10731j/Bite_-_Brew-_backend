import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import { envConfig } from "./env.config";

let cachedTransporter: Transporter | null = null;

export const getSmtpTransporter = (): Transporter => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: envConfig.SMTP_HOST || "localhost",
    port: Number(envConfig.SMTP_PORT || 587),
    secure: Number(envConfig.SMTP_PORT || 587) === 465,
    pool:true,
    auth: envConfig.SMTP_USER && envConfig.SMTP_PASS ? {
      user: envConfig.SMTP_USER,
      pass: envConfig.SMTP_PASS,
    } : undefined,
  });

  return cachedTransporter;
};

export const sendSmtpMail = async (mail: SendMailOptions): Promise<void> => {
  const transporter = getSmtpTransporter();
  const from = envConfig.SMTP_USER || "no-reply@bitebrew.local";
  await transporter.sendMail({ from, ...mail });
};

export const verifySmtpConnection = async (): Promise<void> => {
  const transporter = getSmtpTransporter();
  await transporter.verify();
};
