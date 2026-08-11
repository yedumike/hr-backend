import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { In } from "typeorm";

const router = Router();

const validStatuses = ["active", "inactive", "terminated"] as const;

// GET /reports/analytics
router.get(
  "/analytics",
  authenticate,
  authorize("employees:view_sensitive"),
  async (req: Request, res: Response) => {
    try {
      const rawFrom = req.query.from;
      const rawTo = req.query.to;
      const rawDepartmentId = req.query.department_id;
      const rawStatus = req.query.status;

      // ============================================================
      // VALIDATE FILTERS
      // ============================================================

      if (rawFrom !== undefined && typeof rawFrom !== "string") {
        res.status(400).json({
          error: "from must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (rawTo !== undefined && typeof rawTo !== "string") {
        res.status(400).json({
          error: "to must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (
        rawDepartmentId !== undefined &&
        typeof rawDepartmentId !== "string"
      ) {
        res.status(400).json({
          error: "department_id must be a string",
        });
        return;
      }

      if (rawStatus !== undefined && typeof rawStatus !== "string") {
        res.status(400).json({
          error: "status must be a string",
        });
        return;
      }

      const from = rawFrom as string | undefined;
      const to = rawTo as string | undefined;
      const departmentId = rawDepartmentId as string | undefined;
      const status = rawStatus as string | undefined;

      // Basic date validation
      if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
        res.status(400).json({
          error: "from must be in YYYY-MM-DD format",
        });
        return;
      }

      if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        res.status(400).json({
          error: "to must be in YYYY-MM-DD format",
        });
        return;
      }

      if (from && to && from > to) {
        res.status(400).json({
          error: "from cannot be later than to",
        });
        return;
      }

      if (status && !validStatuses.includes(status as any)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const employeeRepo = AppDataSource.getRepository(Employee);

      // ============================================================
      // BUILD BASE QUERY
      // ============================================================

      const baseQuery = employeeRepo
        .createQueryBuilder("employee")
        .leftJoinAndSelect("employee.department", "department");

      if (from) {
        baseQuery.andWhere("employee.hire_date >= :from", { from });
      }

      if (to) {
        baseQuery.andWhere("employee.hire_date <= :to", { to });
      }

      if (departmentId) {
        baseQuery.andWhere("department.id = :departmentId", {
          departmentId,
        });
      }

      if (status) {
        baseQuery.andWhere("employee.status = :status", { status });
      }

      const employees = await baseQuery.getMany();

      // ============================================================
      // SUMMARY
      // ============================================================

      const totalEmployees = employees.length;

      const activeEmployees = employees.filter(
        (employee) => employee.status === "active",
      ).length;

      const terminatedEmployees = employees.filter(
        (employee) => employee.status === "terminated",
      ).length;

      // New hire = employment has lasted less than 3 months
      const today = new Date();

      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const newHires = employees.filter((employee) => {
        const hireDate = new Date(employee.hire_date);

        return hireDate > threeMonthsAgo && hireDate <= today;
      }).length;

      // ============================================================
      // AGE DISTRIBUTION
      // ============================================================

      const ageRanges = [
        { range: "Under 18", min: 0, max: 17 },
        { range: "18-24", min: 18, max: 24 },
        { range: "25-34", min: 25, max: 34 },
        { range: "35-44", min: 35, max: 44 },
        { range: "45-54", min: 45, max: 54 },
        { range: "55+", min: 55, max: Infinity },
      ];

      const ageDistribution = ageRanges.map((range) => {
        const count = employees.filter((employee) => {
          const birthDate = new Date(employee.date_of_birth);

          let age = today.getFullYear() - birthDate.getFullYear();

          const monthDifference = today.getMonth() - birthDate.getMonth();

          if (
            monthDifference < 0 ||
            (monthDifference === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }

          return age >= range.min && age <= range.max;
        }).length;

        return {
          range: range.range,
          count,
        };
      });

      // ============================================================
      // GENDER DISTRIBUTION
      // ============================================================

      const genderCounts = new Map<string, number>();

      for (const employee of employees) {
        // Uses the gender field if it exists.
        // Falls back to not_specified for existing records.
        const gender =
          (employee as Employee & { gender?: string | null }).gender ||
          "not_specified";

        genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
      }

      const genderDistribution = Array.from(genderCounts.entries()).map(
        ([gender, count]) => ({
          gender,
          count,
        }),
      );

      // ============================================================
      // DEPARTMENT DISTRIBUTION
      // ============================================================

      const departmentCounts = new Map<string, number>();

      for (const employee of employees) {
        const departmentName = employee.department?.name || "Unknown";

        departmentCounts.set(
          departmentName,
          (departmentCounts.get(departmentName) || 0) + 1,
        );
      }

      const departmentDistribution = Array.from(departmentCounts.entries()).map(
        ([department, count]) => ({
          department,
          count,
        }),
      );

      // ============================================================
      // STATUS DISTRIBUTION
      // ============================================================

      const statusCounts = new Map<string, number>();

      for (const employee of employees) {
        statusCounts.set(
          employee.status,
          (statusCounts.get(employee.status) || 0) + 1,
        );
      }

      const statusDistribution = Array.from(statusCounts.entries()).map(
        ([status, count]) => ({
          status,
          count,
        }),
      );

      // ============================================================
      // HIRING TREND
      // ============================================================

      /*
       * If from/to are supplied, use that period.
       * Otherwise, use the last 12 months.
       */

      let trendStart: Date;
      let trendEnd: Date;

      if (from) {
        trendStart = new Date(`${from}T00:00:00`);
      } else {
        trendStart = new Date(today);
        trendStart.setMonth(trendStart.getMonth() - 11);
        trendStart.setDate(1);
      }

      if (to) {
        trendEnd = new Date(`${to}T23:59:59`);
      } else {
        trendEnd = new Date(today);
      }

      const hiringTrendMap = new Map<string, number>();

      // Generate every month in the range first.
      const cursor = new Date(
        trendStart.getFullYear(),
        trendStart.getMonth(),
        1,
      );

      while (cursor <= trendEnd) {
        const month = `${cursor.getFullYear()}-${String(
          cursor.getMonth() + 1,
        ).padStart(2, "0")}`;

        hiringTrendMap.set(month, 0);

        cursor.setMonth(cursor.getMonth() + 1);
      }

      for (const employee of employees) {
        const hireDate = new Date(employee.hire_date);

        if (hireDate < trendStart || hireDate > trendEnd) {
          continue;
        }

        const month = `${hireDate.getFullYear()}-${String(
          hireDate.getMonth() + 1,
        ).padStart(2, "0")}`;

        if (hiringTrendMap.has(month)) {
          hiringTrendMap.set(month, hiringTrendMap.get(month)! + 1);
        }
      }

      const hiringTrend = Array.from(hiringTrendMap.entries()).map(
        ([month, count]) => ({
          month,
          count,
        }),
      );

      // ============================================================
      // RESPONSE
      // ============================================================

      res.json({
        filters: {
          from: from ?? null,
          to: to ?? null,
          department_id: departmentId ?? null,
          status: status ?? null,
        },

        summary: {
          totalEmployees,
          activeEmployees,
          terminatedEmployees,
          newHires,
        },

        data: {
          ageDistribution,
          genderDistribution,
          departmentDistribution,
          statusDistribution,
          hiringTrend,
        },
      });
    } catch (error) {
      console.error("Analytics report error:", error);

      res.status(500).json({
        error: "Failed to generate analytics report",
      });
    }
  },
);

export default router;
