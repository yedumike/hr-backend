import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// same pattern as our other required-env-var checks —
// returns a guaranteed string, throws immediately if missing
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

const RESEND_API_KEY = getRequiredEnv("RESEND_API_KEY");
const EMAIL_FROM = getRequiredEnv("EMAIL_FROM");

// Nodemailer "transporter" — this is the object that actually knows how
// to connect to Resend's SMTP servers and send mail through them
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true, // true for port 465 (SSL)
  auth: {
    user: "resend", // fixed literal value required by Resend's SMTP setup, not your own name
    pass: RESEND_API_KEY,
  },
});

// reads an HTML template file, and replaces {{placeholders}} with real values
function renderTemplate(
  templateName: string,
  variables: Record<string, string>,
): string {
  const templatePath = path.join(
    __dirname,
    "templates",
    `${templateName}.html`,
  );
  let html = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    // replaces every occurrence of {{key}} in the template with its value
    html = html.split(`{{${key}}}`).join(value);
  }

  return html;
}

interface SendEmailParams {
  to: string;
  subject: string;
  templateName: string;
  variables: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const html = renderTemplate(params.templateName, params.variables);

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html,
  });
}
