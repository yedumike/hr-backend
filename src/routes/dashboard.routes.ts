// src/routes/dashboard.routes.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { Department } from "../entities/Department";
import { authenticate, authorize } from "../middleware/authenticate";
import { Not } from "typeorm";

const router = Router();

router.get(
  "/stats",
  authenticate,
  authorize("dashboard:view_stats"),
  async (req: Request, res: Response) => {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);

    // total employees — excludes terminated (soft-deleted), same rule we use everywhere else
    const totalEmployees = await employeeRepo.count({
      where: { status: Not("terminated") },
    });

    // active departments only
    const totalDepartments = await departmentRepo.count({
      where: { is_active: true },
    });

    // strictly "active" status employees (distinct from "inactive", which also excludes terminated)
    const activeEmployees = await employeeRepo.count({
      where: { status: "active" },
    });

    // largest department by employee count — uses TypeORM's query builder
    // since this needs a GROUP BY + COUNT + ORDER BY that the simple repository API can't express
    const largest = await employeeRepo
      .createQueryBuilder("employee")
      .select("department.name", "name")
      .addSelect("COUNT(employee.id)", "employeeCount")
      .innerJoin("employee.department", "department")
      .where("employee.status != :terminated", { terminated: "terminated" })
      .groupBy("department.id")
      .addGroupBy("department.name")
      .orderBy('"employeeCount"', "DESC")
      .limit(1)
      .getRawOne();

    res.json({
      totalEmployees,
      totalDepartments,
      activeEmployees,
      // employeesOnLeave will be added once the leave request module exists
      largestDepartment: largest
        ? {
            name: largest.name,
            employeeCount: parseInt(largest.employeeCount, 10),
          }
        : null,
    });
  },
);

export default router;
