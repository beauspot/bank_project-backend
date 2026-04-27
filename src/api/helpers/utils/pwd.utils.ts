import { RefinementCtx } from "zod";
import zxcvbn from "zxcvbn";

import {
  PasswordStrengthUserCTX as PWDSCTX,
  PasswordStrengthResult as PWDSR,
} from "@/interface/userctx";

const M_A_S = 3; // minimum acceptable score

const scoreLabels: Record<number, string> = {
  0: "Very Weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very Strong",
};

/*
    Core evaluator  
    Ref this anywhere the full zxcvbn result will be needed - route handlers,
    real-time strength endpoint, tests, etc
*/

const evaluatePasswordStrength = (
  password: string,
  userCTX: PWDSCTX = {},
): PWDSR => {
  const userInputs = [
    userCTX.firstname,
    userCTX.middlename,
    userCTX.lastname,
    userCTX.username,
    userCTX.email,
  ].filter(Boolean) as string[];

  const result = zxcvbn(password, userInputs);

  return {
    score: result.score,
    label: scoreLabels[result.score],
    acceptable: result.score >= M_A_S,
    warning: result.feedback.warning || null,
    suggestions: result.feedback.suggestions,
    crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
  };
};

// Zod superRefine Handler
/**
 * Drop this directly into any .superRefine() call on an object that has
 * both password field and user identity field.
 */
const applyPasswordStrengthRefinement = (
  data: { password: string } & PWDSCTX,
  ctx: RefinementCtx,
): void => {
  const strength = evaluatePasswordStrength(data.password, {
    firstname: data.firstname,
    middlename: data.middlename,
    lastname: data.lastname,
    username: data.username,
    email: data.email,
  });

  if (!strength.acceptable) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message:
        strength.warning ||
        "Password is too weak. Try a longer passphrase or a mix of unrelated words.",
      params: {
        score: strength.score,
        label: strength.label,
        suggestions: strength.suggestions,
        crackTime: strength.crackTime,
      },
    });
  }
};

const applyResetPasswordStrengthRefinement = (
  data: { newpassword: string },
  ctx: RefinementCtx,
): void => {
  const strength = evaluatePasswordStrength(data.newpassword, {});

  if (!strength.acceptable) {
    ctx.addIssue({
      code: "custom",
      path: ["newpassword"],
      message:
        strength.warning ||
        "Password is too weak. Try a longer passphrase or a mix of unrelated words.",
      params: {
        score: strength.score,
        label: strength.label,
        suggestions: strength.suggestions,
        crackTime: strength.crackTime,
      },
    });
  }
};

export {
  evaluatePasswordStrength,
  applyPasswordStrengthRefinement,
  applyResetPasswordStrengthRefinement,
};
