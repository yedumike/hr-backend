import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { Department } from "../entities/Department";
import { Certification } from "../entities/Certification";
import { EducationRecord } from "../entities/EducationRecord";
import { Document } from "../entities/Document";
import { authenticate } from "../middleware/authenticate";
import { ILike } from "typeorm";

const router = Router();

const validTypes = [
  "employees",
  "departments",
  "certifications",
  "education",
  "documents",
];

router.get("/", authenticate, async (req: Request, res: Response) => {
  const q = req.query.q;
  const type = req.query.type;

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    res.status(400).json({ error: "q (search keyword) is required" });
    return;
  }

  if (
    type !== undefined &&
    (typeof type !== "string" || !validTypes.includes(type))
  ) {
    res
      .status(400)
      .json({ error: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const isAdmin = req.user!.role === "HR_ADMIN";
  const keyword = `%${q.trim()}%`; // ILike wildcard pattern for partial, case-insensitive matching

  const employeeRepo = AppDataSource.getRepository(Employee);
  const departmentRepo = AppDataSource.getRepository(Department);
  const certRepo = AppDataSource.getRepository(Certification);
  const educationRepo = AppDataSource.getRepository(EducationRecord);
  const documentRepo = AppDataSource.getRepository(Document);

  const results: Record<string, unknown> = {};

  const shouldSearch = (t: string) => type === undefined || type === t;

  if (shouldSearch("employees")) {
    const restrictedSelect = {
      id: true,
      first_name: true,
      last_name: true,
      role_title: true,
      status: true,
      department: { id: true, name: true },
    } as const;

    const employeeWhere = [
      { first_name: ILike(keyword) },
      { last_name: ILike(keyword) },
      { role_title: ILike(keyword) },
      ...(isAdmin
        ? [{ national_id: ILike(keyword) }, { personal_email: ILike(keyword) }]
        : []),
    ];

    results.employees = isAdmin
      ? await employeeRepo.find({
          where: employeeWhere,
          relations: { department: true },
          take: 20,
        })
      : await employeeRepo.find({
          where: employeeWhere,
          relations: { department: true },
          select: restrictedSelect,
          take: 20,
        });
  }

  if (shouldSearch("departments")) {
    results.departments = await departmentRepo.find({
      where: [{ name: ILike(keyword) }, { description: ILike(keyword) }],
      take: 20,
    });
  }

  if (shouldSearch("certifications")) {
    results.certifications = await certRepo.find({
      where: [{ name: ILike(keyword) }, { issued_by: ILike(keyword) }],
      relations: { employee: true },
      select: {
        id: true,
        name: true,
        issued_by: true,
        issue_date: true,
        employee: { id: true, first_name: true, last_name: true },
      },
      take: 20,
    });
  }

  if (shouldSearch("education")) {
    results.education = await educationRepo.find({
      where: [
        { institution: ILike(keyword) },
        { degree: ILike(keyword) },
        { field_of_study: ILike(keyword) },
      ],
      relations: { employee: true },
      select: {
        id: true,
        institution: true,
        degree: true,
        field_of_study: true,
        employee: { id: true, first_name: true, last_name: true },
      },
      take: 20,
    });
  }

  if (shouldSearch("documents") && isAdmin) {
    // documents (via OCR text) are admin-only — could contain sensitive
    // scanned content like IDs, salary-adjacent paperwork, etc.
    results.documents = await documentRepo.find({
      where: [{ ocr_text: ILike(keyword) }],
      relations: { employee: true },
      select: {
        id: true,
        category: true,
        ocr_text: true,
        employee: { id: true, first_name: true, last_name: true },
      },
      take: 20,
    });
  }

  res.json({ query: q, results });
});

export default router;
