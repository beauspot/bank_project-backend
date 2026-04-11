enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
  AUDITOR = "AUDITOR",
}

/* export enum UserType {
  ADMIN = "admin",
  CUSTOMER = "customer",
} */

enum GenderType {
  MALE = "male",
  FEMALE = "female",
}

enum EmailStatus {
  VERIFIED = "Verified",
  NOT_VERIFIED = "Not_Verified",
}

enum AccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  BLOCKED = "BLOCKED",
  PENDING = "PENDING"
}

enum AccountType {
  SAVINGS = "savings",
  CURRENT = "current",
  VIRTUAL = "virtual",
}

export {
  UserRole,
  GenderType,
  EmailStatus,
  AccountStatus,
  AccountType,
}