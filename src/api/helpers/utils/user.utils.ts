import * as bcrypt from "bcryptjs";
import { injectable } from "tsyringe";

@injectable()
export class UserServiceUtils {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(
    inputPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(inputPassword, hashedPassword);
  }

  async hashOtp(otp: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(otp, saltRounds);
  }

  async verifyOtpHash(inputOtp: string, hashedOtp: string): Promise<boolean> {
    return bcrypt.compare(inputOtp, hashedOtp);
  }
}
