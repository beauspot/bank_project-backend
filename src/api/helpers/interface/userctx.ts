export interface PasswordStrengthUserCTX {
  firstname?: string;
  middlename?: string;
  lastname?: string;
  username?: string;
  email?: string;
}

export interface PasswordStrengthResult {
  score: number;
  label: string;
  acceptable: boolean;
  warning: string | null;
  suggestions: string[];
  crackTime: string | number;
}
