import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { Department } from "../entities/Department";
import { authenticate, authorize } from "../middleware/authenticate";
import { Not } from "typeorm";
import { logAudit } from "../utils/audit";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { generateTempPassword } from "../utils/generatePassword";
import bcrypt from "bcrypt";
import { sendEmail } from "../emails/sendEmail";

const router = Router();

interface CreateEmployeeBody {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  national_id?: string;
  phone?: string;
  personal_email?: string;
  address?: string;
  role_title?: string;
  department_id?: string;
  hire_date?: string;
  salary?: string;
  manager_id?: string;
}

router.post(
  "/",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("employees:create"),
  async (req: Request, res: Response) => {
    const {
      first_name,
      last_name,
      date_of_birth,
      national_id,
      phone,
      personal_email,
      address,
      role_title,
      department_id,
      hire_date,
      salary,
      manager_id, // optional — not included in the required check below
    } = req.body as CreateEmployeeBody;

    // ONE compound check, naming every required field directly.
    // TypeScript CAN follow this — after this block, every variable listed
    // here is narrowed from `string | undefined` to just `string`,
    // because every path where any of them is falsy already returned.
    if (
      !first_name ||
      !last_name ||
      !date_of_birth ||
      !national_id ||
      !phone ||
      !personal_email ||
      !address ||
      !role_title ||
      !department_id ||
      !hire_date ||
      !salary
    ) {
      res.status(400).json({ error: "Missing required employee fields" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);

    const department = await departmentRepo.findOne({
      where: { id: department_id },
    });
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    // manager is optional — only look it up if provided
    let manager: Employee | null = null;
    if (manager_id) {
      manager = await employeeRepo.findOne({ where: { id: manager_id } });
      if (!manager) {
        res.status(404).json({ error: "Manager not found" });
        return;
      }
    }

    // duplicate check — national_id and personal_email are both narrowed
    // to `string` here already, thanks to the compound check above
    const existing = await employeeRepo.findOne({
      where: [{ national_id }, { personal_email }],
    });
    if (existing) {
      res.status(409).json({
        error: "An employee with this national ID or email already exists",
      });
      return;
    }

    const employee = employeeRepo.create({
      first_name,
      last_name,
      date_of_birth,
      national_id,
      phone,
      personal_email,
      address,
      role_title,
      department,
      hire_date,
      salary,
      manager,
      status: "active",
    });

    await employeeRepo.save(employee);

    // req.user is guaranteed to exist here, since this route is behind `authenticate`
    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Employee",
      entityId: employee.id,
      description: `Added a new employee record for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ employee });
  },
);

//----------------------------------------------

// list all employees — any authenticated user can view this for now
// (we can restrict fields shown per-role later, e.g. hide salary from non-admins)
router.get("/", authenticate, async (req: Request, res: Response) => {
  const employeeRepo = AppDataSource.getRepository(Employee);

  const includeTerminated = req.query.includeTerminated === "true";
  // const isAdmin = req.user!.role === "HR_ADMIN";
  const isAdmin =
    req.user!.permissions.includes("employees:view_sensitive") ||
    req.user!.role === "SUPER_ADMIN";

  const restrictedSelect = {
    id: true,
    first_name: true,
    last_name: true,
    role_title: true,
    status: true,
    department: { id: true, name: true },
    manager: { id: true, first_name: true, last_name: true },
  } as const;

  const employees = isAdmin
    ? await employeeRepo.find({
        where: includeTerminated ? {} : { status: Not("terminated") },
        relations: { department: true, manager: true },
      })
    : await employeeRepo.find({
        where: includeTerminated ? {} : { status: Not("terminated") },
        relations: { department: true, manager: true },
        select: restrictedSelect,
      });

  res.json({ employees });
});

// get a single employee by ID
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  const employeeRepo = AppDataSource.getRepository(Employee);
  // const isAdmin = req.user!.role === "HR_ADMIN";
  const isAdmin =
    req.user!.permissions.includes("employees:view_sensitive") ||
    req.user!.role === "SUPER_ADMIN";

  const restrictedSelect = {
    id: true,
    first_name: true,
    last_name: true,
    role_title: true,
    status: true,
    department: { id: true, name: true },
    manager: { id: true, first_name: true, last_name: true },
  } as const;

  const employee = isAdmin
    ? await employeeRepo.findOne({
        where: { id },
        relations: { department: true, manager: true },
      })
    : await employeeRepo.findOne({
        where: { id },
        relations: { department: true, manager: true },
        select: restrictedSelect,
      });

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json({ employee });
});

interface UpdateEmployeeBody {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  national_id?: string;
  phone?: string;
  personal_email?: string;
  address?: string;
  role_title?: string;
  department_id?: string;
  hire_date?: string;
  salary?: string;
  manager_id?: string;
}

router.put(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("employees:update"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);

    const employee = await employeeRepo.findOne({
      where: { id },
      relations: { department: true, manager: true },
    });

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const body = req.body as UpdateEmployeeBody;

    // update is "partial" by design — only overwrite fields that were actually sent
    // each check narrows the type before assigning, same pattern as before
    if (body.first_name) employee.first_name = body.first_name;
    if (body.last_name) employee.last_name = body.last_name;
    if (body.date_of_birth) employee.date_of_birth = body.date_of_birth;
    if (body.national_id) employee.national_id = body.national_id;
    if (body.phone) employee.phone = body.phone;
    if (body.personal_email) employee.personal_email = body.personal_email;
    if (body.address) employee.address = body.address;
    if (body.role_title) employee.role_title = body.role_title;
    if (body.hire_date) employee.hire_date = body.hire_date;
    if (body.salary) employee.salary = body.salary;

    // department, if provided, needs a fresh lookup (same as create)
    if (body.department_id) {
      const department = await departmentRepo.findOne({
        where: { id: body.department_id },
      });
      if (!department) {
        res.status(404).json({ error: "Department not found" });
        return;
      }
      employee.department = department;
    }

    // manager, if provided, same pattern — also look up fresh
    if (body.manager_id) {
      const manager = await employeeRepo.findOne({
        where: { id: body.manager_id },
      });
      if (!manager) {
        res.status(404).json({ error: "Manager not found" });
        return;
      }
      employee.manager = manager;
    }

    await employeeRepo.save(employee);
    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Employee",
      entityId: employee.id,
      description: `Updated employment information for ${employee.first_name} ${employee.last_name}`,
    });

    res.json({ employee });
  },
);

router.delete(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("employees:delete"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const employee = await employeeRepo.findOne({ where: { id } });

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    // soft delete — the row stays, only status changes
    // this preserves the record for audit/reporting purposes
    employee.status = "terminated";
    await employeeRepo.save(employee);
    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "Employee",
      entityId: employee.id,
      description: `Marked ${employee.first_name} ${employee.last_name} as terminated`,
    });
    res.json({ message: "Employee marked as terminated", employee });
  },
);

interface CreateAccountBody {
  role?: string; // "HR_ADMIN" | "MANAGER" | "EMPLOYEE"
}

router.post(
  "/:id/create-account",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("employees:create_account"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const { role } = req.body as CreateAccountBody;

    const roleName = role ?? "EMPLOYEE";

    const employeeRepo = AppDataSource.getRepository(Employee);
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);

    const employee = await employeeRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    if (employee.user) {
      res.status(409).json({ error: "This employee already has an account" });
      return;
    }

    const roleEntity = await roleRepo.findOne({ where: { name: roleName } });
    if (!roleEntity) {
      res.status(400).json({ error: "Invalid role specified" });
      return;
    }

    // check the login email isn't already taken by someone else
    const existingUser = await userRepo.findOne({
      where: { email: employee.personal_email },
    });
    if (existingUser) {
      res
        .status(409)
        .json({ error: "A user account with this email already exists" });
      return;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = userRepo.create({
      email: employee.personal_email,
      password_hash: passwordHash,
      role: roleEntity,
      must_change_password: true,
    });

    await userRepo.save(user);

    // link the new User back to this Employee
    employee.user = user;
    await employeeRepo.save(employee);

    // send the credentials email — if this fails, we don't roll back the
    // account creation, but we do let HR know so they can manually share
    // the credentials instead
    try {
      await sendEmail({
        to: employee.personal_email,
        subject: "Your HR System Account Has Been Created",
        templateName: "accountCreated",
        variables: {
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.personal_email,
          tempPassword,
        },
      });
    } catch (err) {
      console.error("Failed to send account creation email:", err);
      res.status(201).json({
        message:
          "Account created, but the email failed to send. Share credentials manually.",
        email: employee.personal_email,
        tempPassword,
      });
      return;
    }

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      description: `Created a login account for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({
      message: "Account created and credentials emailed to the employee",
    });
  },
);

export default router;
