import validator from "validator";
import { TypeOf, nativeEnum, object, string } from "zod";

import { AppDataSource } from "@/config/db.config";
import { UserRole, GenderType } from "@/enums/user";
import { User } from "@/models/userEntity";
import { applyPasswordStrengthRefinement } from "@/utils/pwd.utils";

const userRepo = AppDataSource.getRepository(User);

const createUserSchema = object({
  body: object({
    userData: object({
      firstname: string({
        required_error: "User's first name is required",
      }),
      middlename: string({
        required_error: "User's middle name is required",
      }),
      lastname: string({
        required_error: "User's last name is required",
      }),
      username: string({
        required_error: "User's username is required",
      }),
      phonenumber: string({
        required_error: "Your phone number is required",
      })
        .refine((phoneNo) => validator.isMobilePhone(phoneNo), {
          message: "Invalid phone number",
        })
        .refine(
          async (phonenumber) => {
            const existingPhoneNo = await userRepo.findOneBy({ phonenumber });
            return !existingPhoneNo;
          },
          {
            message:
              "This phone number already exists and cannot be used for signup.",
          },
        ),
      email: string({
        required_error: "User's email is required",
      })
        .refine((email) => validator.isEmail(email), {
          message: "Invalid email address",
        })
        .refine(
          async (email) => {
            const existingUser = await userRepo.findOneBy({ email });
            return !existingUser;
          },
          {
            message: "This Email already exists and cannot be used for signup.",
          },
        ),
      nin: string({
        required_error: "User's NIN is required",
      })
        .length(11, "NIN must be exactly an 11 digit number")
        .regex(/^\d{11}$/, "NIN must contain only digits")
        .refine(
          async (nin) => {
            const existingUser = await userRepo.findOneBy({ nin });
            return !existingUser;
          },
          { message: "This Nin is already in use" },
        ),
      gender: nativeEnum(GenderType, {
        required_error: "Please select your gender",
        invalid_type_error: "Invalid gender",
      }),
      bvn: string({
        required_error: "Your Bvn is required",
      })
        .length(11, "The BVN must be an 11-digit number")
        .regex(/^\d{11}$/, "BVN must contain only digits")
        .refine(
          async (bvn) => {
            const existingUser = await userRepo.findOneBy({ bvn });
            return !existingUser;
          },
          {
            message: "This User's BVN is already in use.",
          },
        ),
      date_of_birth: string({
        required_error: "Your Date of Birth is required",
      })
        .refine((dob) => !isNaN(Date.parse(dob)), {
          message: "Invalid date format",
        })
        .transform((dob) => new Date(dob))
        .refine(
          (dob) => {
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            const hasHadBdayThisYr =
              today.getMonth() > dob.getMonth() ||
              (today.getMonth() === dob.getMonth() &&
                today.getDate() >= dob.getDate());
            return age > 17 || (age === 17 && hasHadBdayThisYr);
          },
          {
            message: "You must be at least 17 years old to sign up",
          },
        ),
      role: nativeEnum(UserRole, {
        required_error: "User role is required",
        invalid_type_error: "Invalid role",
      }).default(UserRole.CUSTOMER),
      password: string({
        required_error: "Password is required",
      })
        .min(8, "Password is too short - should be 8 characters minimum")
        .max(12, "Password must not be more than 12 characters long")
        .regex(
          /[A-Z]/,
          "Password must contain at least one or more uppercase letters",
        )
        .regex(
          /[a-z]/,
          "Password must contain at least one or more lowercase letters",
        )
        .regex(/[0-9]/, "Password must contain at least one or more numbers")
        .regex(
          /[\W_]/,
          "Password must contain at least one or more special characters",
        ),
      confirmPassword: string({
        required_error: "Confirm your password",
      }),
    })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      })
      .superRefine(applyPasswordStrengthRefinement),
    transaction_pin: string({
      required_error: "Transaction pin is required",
    })
      .min(4, "Transaction pin must be 4 digits")
      .max(4, "Transaction pin must be 4 digits")
      .regex(/^\d{4}$/, "Transaction pin must contain only digits"),
    confirm_transaction_pin: string({
      required_error: "Confirm your transaction pin",
    }),
  }).refine((data) => data.transaction_pin === data.confirm_transaction_pin, {
    message: "Transaction pins do not match",
    path: ["confirm_transaction_pin"],
  }),
});

const loginUserSchema = object({
  body: object({
    userData: object({
      phonenumber: string({
        required_error: "Your Phone number email or username is required",
      }).refine((phoneNo) => validator.isMobilePhone(phoneNo), {
        message: "Invalid phone number: ",
      }),
      email: string({
        required_error: "Your email is required",
      }),
      password: string({
        required_error: "Password is required",
      }),
    }),
  }),
});

export { createUserSchema, loginUserSchema };
export type CreateUserInput = TypeOf<typeof createUserSchema>;
export type LoginSchema = TypeOf<typeof loginUserSchema>;
