import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import nodemailer from "nodemailer";

import config from "@/api/helpers/config/env";
import AppError from "@/utils/appErrors";
import log from "@/utils/logging";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  private transporter: nodemailer.Transporter;

  // __dirname is src/api/services/
  // going up one level lands us in src/api/
  // then into helpers/templates/
  private readonly templatesDir = path.join(
    __dirname,
    "..",
    "helpers",
    "templates",
  );

  constructor() {
    log.info(
      `Mail config: host=${config.mail.host}, port=${config.mail.port}, user=${config.mail.user}`,
    );
    log.info(`Templates dir: ${this.templatesDir}`);

    this.transporter = nodemailer.createTransport({
      host: config.mail.host || "smtp.gmail.com",
      port: parseInt(config.mail.port || "587"),
      secure: false, // false for 587, true for 465
      auth: {
        user: config.mail.user,
        pass: config.mail.password,
      },
      tls: {
        // Only for development, not recommended for production
        rejectUnauthorized: false,
      },
    } as nodemailer.TransportOptions);

    this.transporter.verify((error: unknown) => {
      if (error) {
        log.error(`Mail Transporter connection failed: ${error}`);
      } else {
        log.info("Mail transporter is ready to send emails");
      }
    });

    // un-comment to test if the env variables get loaded here!
    /*     console.log("RAW ENV CHECK:", {
      MAIL_HOST: process.env.MAIL_HOST,
      MAIL_PORT: process.env.MAIL_PORT,
      MAIL_USER: process.env.MAIL_USER,
      MAIL_PASSWORD: process.env.MAIL_PASSWORD ? "✅ loaded" : "❌ undefined",
      MAIL_FROM: process.env.MAIL_FROM,
      MAIL_SUPPORT: process.env.MAIL_SUPPORT,
    }); */
  }

  private loadTemplate(templateName: string): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);

    // uncomment to test if the templates get loaded correctly
    /*   log.info(`Loading template from: ${templatePath}`);
    log.info(`Template exists: ${fs.existsSync(templatePath)}`); */

    if (!fs.existsSync(templatePath)) {
      throw new AppError(
        `Email template "${templateName}" not found at path: ${templatePath}`,
        500,
        false,
      );
    }

    return fs.readFileSync(templatePath, "utf-8");
  }

  private replacePlaceholders(
    template: string,
    replacements: Record<string, string>,
  ): string {
    return Object.entries(replacements).reduce(
      (html, [key, value]) => html.replaceAll(`#${key}#`, value),
      template,
    );
  }

  async sendVerificationOTP(data: {
    email: string;
    name: string;
    otp: string;
    expiryMinutes: number;
  }): Promise<void> {
    try {
      const template = this.loadTemplate("verifymail");

      const html = this.replacePlaceholders(template, {
        NAME: data.name,
        OTP: data.otp,
        EXPIRY_MINUTES: data.expiryMinutes.toString(),
        SUPPORT_MAIL: config.mail.support_email!,
      });

      const info = await this.transporter.sendMail({
        from: `"Bank-Hub" <${config.mail.from}>`,
        to: data.email,
        subject: "Verify Your Email Address",
        html,
      });

      log.info(
        `Verification OTP email sent to ${data.email}: ${info.messageId}`,
      );
    } catch (error: any) {
      if (error instanceof Error) {
        log.error(`Real error sending mail: ${error.message}`);
        log.error(`Error Stack: ${error.stack}`);
      } else {
        log.error(`Unknown error type: ${JSON.stringify(error)}`);
      }
      // log.error(`Failed to send verification email to ${data.email}: ${error}`);
      throw new AppError("Failed to send verification email", 500, false);
    }
  }

  // TODO: once the otp is confirmed, this mail should be sent ie add to a queue and process it after the otp is verified, not immediately after registration
  async sendWelcomeEmail(data: {
    email: string;
    name: string;
    message: string;
  }): Promise<void> {
    try {
      const template = this.loadTemplate("welcome");

      const html = this.replacePlaceholders(template, {
        NAME: data.name,
        MESSAGE: data.message,
        SUPPORT_MAIL: config.mail.support_email,
        APPURL: config.app.app_url,
      });

      await this.transporter.sendMail({
        from: `"Bank-Hub" <${config.mail.from}>`,
        to: data.email,
        subject: "Welcome to Bank-Hub!",
        html,
      });

      log.info(`Welcome email sent to ${data.email}`);
    } catch (error: unknown) {
      log.error(`Failed to send welcome email to ${data.email}: ${error}`);
      throw new AppError("Failed to send welcome email", 500, false);
    }
  }
}
