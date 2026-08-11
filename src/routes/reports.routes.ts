import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

router.get(
  "/analytics",
  authenticate,
  authorize("employees:view_sensitive"),
  async (req: Request, res: Response) => {
    try {
      const { from, to, department_id } = req.query;

      // ------------------------------------------------------------
      // VALIDATE QUERY PARAMETERS
      // ------------------------------------------------------------

      if (from !== undefined && typeof from !== "string") {
        res.status(400).json({
          error: "from must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (to !== undefined && typeof to !== "string") {
        res.status(400).json({
          error: "to must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (department_id !== undefined && typeof department_id !== "string") {
        res.status(400).json({
          error: "department_id must be a valid department ID",
        });
        return;
      }

      const fromDate = from as string | undefined;
      const toDate = to as string | undefined;
      const departmentId = department_id as string | undefined;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (fromDate && !dateRegex.test(fromDate)) {
        res.status(400).json({
          error: "from must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (toDate && !dateRegex.test(toDate)) {
        res.status(400).json({
          error: "to must be a date in YYYY-MM-DD format",
        });
        return;
      }

      if (fromDate && toDate && fromDate > toDate) {
        res.status(400).json({
          error: "from cannot be later than to",
        });
        return;
      }

      // ------------------------------------------------------------
      // BASE QUERY
      // ------------------------------------------------------------

      const employeeRepo = AppDataSource.getRepository(Employee);

      const baseQuery = employeeRepo
        .createQueryBuilder("employee")
        .leftJoin("employee.department", "department");

      if (departmentId) {
        baseQuery.andWhere("department.id = :departmentId", {
          departmentId,
        });
      }

      if (fromDate) {
        baseQuery.andWhere("employee.hire_date >= :fromDate", {
          fromDate,
        });
      }

      if (toDate) {
        baseQuery.andWhere("employee.hire_date <= :toDate", {
          toDate,
        });
      }

      // ------------------------------------------------------------
      // AGE DISTRIBUTION
      // ------------------------------------------------------------

      const ageDistribution = await baseQuery
        .clone()
        .select(
          `
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) BETWEEN 18 AND 24
              THEN '18-24'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) BETWEEN 25 AND 34
              THEN '25-34'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) BETWEEN 35 AND 44
              THEN '35-44'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) BETWEEN 45 AND 54
              THEN '45-54'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) BETWEEN 55 AND 64
              THEN '55-64'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, employee.date_of_birth)) >= 65
              THEN '65+'
            ELSE 'Under 18'
          END
          `,
          "range",
        )
        .addSelect("COUNT(employee.id)", "count")
        .groupBy("range")
        .getRawMany();

      // ------------------------------------------------------------
      // GENDER DISTRIBUTION
      // ------------------------------------------------------------

      const genderDistribution = await baseQuery
        .clone()
        .select(
          `
          COALESCE(employee.gender, 'not_specified')
          `,
          "gender",
        )
        .addSelect("COUNT(employee.id)", "count")
        .groupBy("gender")
        .getRawMany();

      // ------------------------------------------------------------
      // DEPARTMENT DISTRIBUTION
      // ------------------------------------------------------------

      const departmentDistribution = await baseQuery
        .clone()
        .select("department.name", "department")
        .addSelect("COUNT(employee.id)", "count")
        .groupBy("department.id")
        .addGroupBy("department.name")
        .getRawMany();

      // ------------------------------------------------------------
      // EMPLOYEE STATUS DISTRIBUTION
      // ------------------------------------------------------------

      const statusDistribution = await baseQuery
        .clone()
        .select("employee.status", "status")
        .addSelect("COUNT(employee.id)", "count")
        .groupBy("employee.status")
        .getRawMany();

      // ------------------------------------------------------------
      // HIRING TREND
      // ------------------------------------------------------------

      const hiringTrend = await baseQuery
        .clone()
        .select(`TO_CHAR(employee.hire_date, 'YYYY-MM')`, "month")
        .addSelect("COUNT(employee.id)", "count")
        .groupBy("month")
        .orderBy("month", "ASC")
        .getRawMany();

      // ------------------------------------------------------------
      // NORMALIZE COUNTS
      // ------------------------------------------------------------

      const normalizedAgeDistribution = ageDistribution.map((item) => ({
        range: item.range,
        count: Number(item.count),
      }));

      const normalizedGenderDistribution = genderDistribution.map((item) => ({
        gender: item.gender,
        count: Number(item.count),
      }));

      const normalizedDepartmentDistribution = departmentDistribution.map(
        (item) => ({
          department: item.department,
          count: Number(item.count),
        }),
      );

      const normalizedStatusDistribution = statusDistribution.map((item) => ({
        status: item.status,
        count: Number(item.count),
      }));

      const normalizedHiringTrend = hiringTrend.map((item) => ({
        month: item.month,
        count: Number(item.count),
      }));

      // ------------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------------

      res.json({
        filters: {
          from: fromDate ?? null,
          to: toDate ?? null,
          department_id: departmentId ?? null,
        },
        data: {
          ageDistribution: normalizedAgeDistribution,
          genderDistribution: normalizedGenderDistribution,
          departmentDistribution: normalizedDepartmentDistribution,
          statusDistribution: normalizedStatusDistribution,
          hiringTrend: normalizedHiringTrend,
        },
      });
    } catch (error) {
      console.error("Failed to generate workforce analytics:", error);

      res.status(500).json({
        error: "Failed to generate workforce analytics",
      });
    }
  },
);

export default router;
