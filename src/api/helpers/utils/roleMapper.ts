import { UserRole } from "@/enums/user";
import AppError from "@/utils/appErrors";

// Map URL param to UserRole enum
const mapParamToRole = (roleParam: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    customer: UserRole.CUSTOMER,
    admin: UserRole.ADMIN,
    auditor: UserRole.AUDITOR,
    super_admin: UserRole.SUPER_ADMIN,
  };

  const role = roleMap[roleParam.toLowerCase()];

  if (!role)
    throw new AppError(
      `Invalid Role "${roleParam}". Must be one of: customers, admin, auditor, super_admin`,
      400,
    );

  return role;
};

const mapRoleToParam = (role: UserRole): string => {
  const paramMap: Record<UserRole, string> = {
    [UserRole.CUSTOMER]: "customer",
    [UserRole.ADMIN]: "admin",
    [UserRole.AUDITOR]: "auditor",
    [UserRole.SUPER_ADMIN]: "super_admin",
  };

  return paramMap[role];
};

export { mapParamToRole, mapRoleToParam };
