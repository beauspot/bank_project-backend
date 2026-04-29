interface VerificationOTPJobData {
  type: "verification-otp";
  email: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

interface WelcomeEmailJobData {
  type: "welcome";
  email: string;
  name: string;
  message: string;
}

interface PasswordResetOTPJobData {
  type: "password-reset-otp";
  email: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

interface PasswordChangedJobData {
  type: "password-changed";
  email: string;
  name: string;
}

interface ContactChangedJobData {
  type: "contact-changed";
  email: string;
  name: string;
  changedField: string;
}

export {
  VerificationOTPJobData,
  WelcomeEmailJobData,
  PasswordResetOTPJobData,
  PasswordChangedJobData,
  ContactChangedJobData,
};
