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

function buildOcrSnippet(
  text: string | null,
  term: string,
  radius = 40,
): string {
  if (!text) return "";

  const index = text.toLowerCase().indexOf(term.toLowerCase());

  if (index === -1) {
    return text.slice(0, radius * 2) + "...";
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + term.length + radius);

  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet += "...";

  return snippet;
}

router.get("/search", authenticate, async (req: Request, res: Response) => {
  try {
    const q = req.query.q;
    const type = req.query.type;

    // ============================================================
    // VALIDATE SEARCH QUERY
    // ============================================================

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({
        error: "q (search keyword) is required",
      });
    }

    // ============================================================
    // VALIDATE TYPE FILTER
    // ============================================================

    let requestedTypes: string[] = [];

    if (type !== undefined) {
      if (typeof type !== "string") {
        return res.status(400).json({
          error: "type must be a comma-separated string",
        });
      }

      requestedTypes = type
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const invalidTypes = requestedTypes.filter(
        (t) => !validTypes.includes(t),
      );

      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: `Invalid type(s): ${invalidTypes.join(
            ", ",
          )}. Must be one of: ${validTypes.join(", ")}`,
        });
      }
    }

    // ============================================================
    // AUTHORIZATION
    // ============================================================

    const isAdmin = req.user!.permissions.includes("employees:view_sensitive");

    const keyword = `%${q.trim()}%`;
    const lowerQuery = q.trim().toLowerCase();

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);
    const certRepo = AppDataSource.getRepository(Certification);
    const educationRepo = AppDataSource.getRepository(EducationRecord);
    const documentRepo = AppDataSource.getRepository(Document);

    const results: Record<string, unknown> = {};

    const shouldSearch = (searchType: string) =>
      requestedTypes.length === 0 || requestedTypes.includes(searchType);

    // ============================================================
    // 1. EMPLOYEES
    // ============================================================

    if (shouldSearch("employees")) {
      const employeeWhere = [
        { first_name: ILike(keyword) },
        { last_name: ILike(keyword) },
        { role_title: ILike(keyword) },

        ...(isAdmin
          ? [
              { national_id: ILike(keyword) },
              { personal_email: ILike(keyword) },
            ]
          : []),
      ];

      const allEmployees = await employeeRepo.find({
        where: employeeWhere,
        relations: {
          department: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          role_title: true,
          status: true,
          department: {
            id: true,
            name: true,
          },
          ...(isAdmin
            ? {
                national_id: true,
                personal_email: true,
              }
            : {}),
        },
        take: 20,
      });

      results.employees = allEmployees.map((emp) => {
        const matchedBy: string[] = [];

        const firstName = emp.first_name?.toLowerCase() || "";
        const lastName = emp.last_name?.toLowerCase() || "";
        const roleTitle = emp.role_title?.toLowerCase() || "";
        const nationalId = emp.national_id?.toLowerCase() || "";
        const personalEmail = emp.personal_email?.toLowerCase() || "";

        if (firstName.includes(lowerQuery)) {
          matchedBy.push("first_name");
        }

        if (lastName.includes(lowerQuery)) {
          matchedBy.push("last_name");
        }

        if (roleTitle.includes(lowerQuery)) {
          matchedBy.push("role_title");
        }

        if (isAdmin && nationalId.includes(lowerQuery)) {
          matchedBy.push("national_id");
        }

        if (isAdmin && personalEmail.includes(lowerQuery)) {
          matchedBy.push("personal_email");
        }

        return {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          role_title: emp.role_title,
          status: emp.status,
          department: emp.department
            ? {
                id: emp.department.id,
                name: emp.department.name,
              }
            : null,

          // Only expose sensitive values to authorized users.
          ...(isAdmin
            ? {
                national_id: emp.national_id,
                personal_email: emp.personal_email,
              }
            : {}),

          matchedBy,
        };
      });
    }

    // ============================================================
    // 2. DEPARTMENTS
    // ============================================================

    if (shouldSearch("departments")) {
      const allDepartments = await departmentRepo.find({
        where: [{ name: ILike(keyword) }, { description: ILike(keyword) }],
        select: {
          id: true,
          name: true,
          description: true,
          is_active: true,
        },
        take: 20,
      });

      results.departments = allDepartments.map((dept) => {
        const matchedBy: string[] = [];

        const name = dept.name?.toLowerCase() || "";
        const description = dept.description?.toLowerCase() || "";

        if (name.includes(lowerQuery)) {
          matchedBy.push("name");
        }

        if (description.includes(lowerQuery)) {
          matchedBy.push("description");
        }

        return {
          id: dept.id,
          name: dept.name,
          description: dept.description,
          is_active: dept.is_active,
          matchedBy,
        };
      });
    }

    // ============================================================
    // 3. CERTIFICATIONS
    // ============================================================

    if (shouldSearch("certifications")) {
      const allCertifications = await certRepo.find({
        where: [{ name: ILike(keyword) }, { issued_by: ILike(keyword) }],
        relations: {
          employee: true,
        },
        select: {
          id: true,
          name: true,
          issued_by: true,
          issue_date: true,
          employee: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        take: 20,
      });

      results.certifications = allCertifications.map((cert) => {
        const matchedBy: string[] = [];

        const name = cert.name?.toLowerCase() || "";
        const issuedBy = cert.issued_by?.toLowerCase() || "";

        if (name.includes(lowerQuery)) {
          matchedBy.push("name");
        }

        if (issuedBy.includes(lowerQuery)) {
          matchedBy.push("issued_by");
        }

        return {
          id: cert.id,
          name: cert.name,
          issued_by: cert.issued_by,
          issue_date: cert.issue_date,
          employee: cert.employee
            ? {
                id: cert.employee.id,
                first_name: cert.employee.first_name,
                last_name: cert.employee.last_name,
              }
            : null,
          matchedBy,
        };
      });
    }

    // ============================================================
    // 4. EDUCATION
    // ============================================================

    if (shouldSearch("education")) {
      const allEducation = await educationRepo.find({
        where: [
          { institution: ILike(keyword) },
          { degree: ILike(keyword) },
          { field_of_study: ILike(keyword) },
        ],
        relations: {
          employee: true,
        },
        select: {
          id: true,
          institution: true,
          degree: true,
          field_of_study: true,
          employee: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        take: 20,
      });

      results.education = allEducation.map((edu) => {
        const matchedBy: string[] = [];

        const institution = edu.institution?.toLowerCase() || "";
        const degree = edu.degree?.toLowerCase() || "";
        const fieldOfStudy = edu.field_of_study?.toLowerCase() || "";

        if (institution.includes(lowerQuery)) {
          matchedBy.push("institution");
        }

        if (degree.includes(lowerQuery)) {
          matchedBy.push("degree");
        }

        if (fieldOfStudy.includes(lowerQuery)) {
          matchedBy.push("field_of_study");
        }

        return {
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          employee: edu.employee
            ? {
                id: edu.employee.id,
                first_name: edu.employee.first_name,
                last_name: edu.employee.last_name,
              }
            : null,
          matchedBy,
        };
      });
    }

    // ============================================================
    // 5. DOCUMENTS
    // ============================================================

    // Documents/OCR are restricted to users with sensitive access.
    if (shouldSearch("documents") && isAdmin) {
      const allDocuments = await documentRepo.find({
        where: {
          ocr_text: ILike(keyword),
        },
        relations: {
          employee: true,
        },
        select: {
          id: true,
          category: true,
          ocr_text: true,
          employee: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        take: 20,
      });

      results.documents = allDocuments.map((doc) => ({
        id: doc.id,
        category: doc.category,
        snippet: buildOcrSnippet(doc.ocr_text, q.trim()),
        employee: doc.employee
          ? {
              id: doc.employee.id,
              first_name: doc.employee.first_name,
              last_name: doc.employee.last_name,
            }
          : null,
        matchedBy: ["ocr_text"],
      }));
    }

    return res.json({
      query: q.trim(),
      results,
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      error: "An error occurred while performing the search",
    });
  }
});

export default router;
