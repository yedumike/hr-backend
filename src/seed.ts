import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Role } from "./entities/Role";
import { Permission } from "./entities/Permission";
import { User } from "./entities/User";
import bcrypt from "bcrypt";

// the full list of permissions our system understands — this is the
// authoritative, code-defined list; which ROLE has which permission is
// what's actually dynamic/data-driven
const ALL_PERMISSIONS = [
  // Employees
  "employees:create",
  "employees:view",
  "employees:view_sensitive",
  "employees:update",
  "employees:delete",
  "employees:create_account",
  // Departments
  "departments:create",
  "departments:view",
  "departments:update",
  "departments:delete",
  // Education & Certifications
  "education:create",
  "education:view",
  "education:update",
  "education:delete",
  "certifications:create",
  "certifications:view",
  "certifications:update",
  "certifications:delete",
  // Family & Emergency
  "dependents:create",
  "dependents:view",
  "dependents:update",
  "dependents:delete",
  "emergency_contacts:create",
  "emergency_contacts:view",
  "emergency_contacts:update",
  "emergency_contacts:delete",
  // Documents
  "documents:upload",
  "documents:view",
  "documents:delete",
  // Audit & Reporting
  "audit_logs:view",
  "dashboard:view_stats",
  // Administration
  "roles:manage",
  "users:manage",
];

// default permission sets per role — HR_ADMIN gets everything except
// roles:manage (shouldn't redefine the permission system itself).
// MANAGER is read-only across the board. EMPLOYEE starts with nothing,
// pending the self-service/ownership decision we'll build later.
const ROLE_DEFAULTS: Record<string, string[]> = {
  HR_ADMIN: ALL_PERMISSIONS.filter((p) => p !== "roles:manage"),
  MANAGER: [
    "employees:view",
    "education:view",
    "certifications:view",
    "dependents:view",
    "emergency_contacts:view",
    "documents:view",
    "dashboard:view_stats",
  ],
  EMPLOYEE: [],
};

async function seed() {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const permissionRepo = AppDataSource.getRepository(Permission);
  const userRepo = AppDataSource.getRepository(User);

  // 1. create every permission if it doesn't already exist
  const permissionMap: Record<string, Permission> = {};

  for (const name of ALL_PERMISSIONS) {
    let permission = await permissionRepo.findOne({ where: { name } });
    if (!permission) {
      permission = permissionRepo.create({ name });
      await permissionRepo.save(permission);
      console.log(`Created permission: ${name}`);
    }
    permissionMap[name] = permission;
  }

  // 2. create SUPER_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE roles, with their
  // default permissions attached
  const roleNames = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];
  const roles: Record<string, Role> = {};

  for (const name of roleNames) {
    let role = await roleRepo.findOne({
      where: { name },
      relations: { permissions: true },
    });

    if (!role) {
      role = roleRepo.create({ name });
    }

    // SUPER_ADMIN gets every permission that exists; others get their
    // defined default set
    const defaultPermissionNames =
      name === "SUPER_ADMIN" ? ALL_PERMISSIONS : ROLE_DEFAULTS[name];

    if (!defaultPermissionNames) {
      throw new Error(`No default permissions defined for role: ${name}`);
    }

    role.permissions = defaultPermissionNames.map((permName) => {
      const perm = permissionMap[permName];
      if (!perm) {
        throw new Error(`Permission not found: ${permName}`);
      }
      return perm;
    });

    await roleRepo.save(role);
    console.log(
      `Configured role: ${name} with ${role.permissions.length} permissions`,
    );

    roles[name] = role;
  }

  // 3. create the first SUPER_ADMIN account, if none exists
  const superAdminRole = roles["SUPER_ADMIN"];
  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role was not created — seeding failed");
  }

  const existingSuperAdmin = await userRepo.findOne({
    where: { email: "admin@yourcompany.com" },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
    const superAdmin = userRepo.create({
      email: "admin@yourcompany.com",
      password_hash: passwordHash,
      role: superAdminRole,
    });
    await userRepo.save(superAdmin);
    console.log(
      "Created first SUPER_ADMIN: admin@yourcompany.com / ChangeMe123!",
    );
  } else {
    console.log("SUPER_ADMIN already exists, skipping.");
  }

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
