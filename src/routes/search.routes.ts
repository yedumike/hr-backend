import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Employee } from "../entities/Employee";
import { Department } from "../entities/Department";
import { Certification } from "../entities/Certification";
import { EducationRecord } from "../entities/EducationRecord";
import { Document } from "../entities/Document";
import { ILike } from "typeorm";

const router = Router();

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

router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = ((req.query.q as string) || "").trim();

    if (!query) {
      return res.json({
        query: "",
        results: {
          employees: [],
          departments: [],
          certifications: [],
          education: [],
          documents: [],
        },
      });
    }

    const searchTerm = `%${query}%`;
    const lowerQuery = query.toLowerCase();

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);
    const certRepo = AppDataSource.getRepository(Certification);
    const eduRepo = AppDataSource.getRepository(EducationRecord);
    const docRepo = AppDataSource.getRepository(Document);

    // ============================================================
    // 1. EMPLOYEES
    // ============================================================

    const allEmployees = await employeeRepo.find({
      where: [
        { first_name: ILike(searchTerm) },
        { last_name: ILike(searchTerm) },
        { role_title: ILike(searchTerm) },
        { national_id: ILike(searchTerm) },
      ],
      relations: {
        department: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role_title: true,
        status: true,
        national_id: true,
        department: {
          id: true,
          name: true,
        },
      },
    });

    const employees = allEmployees.map((emp) => {
      const matchedBy: string[] = [];

      const firstName = emp.first_name?.toLowerCase() || "";
      const lastName = emp.last_name?.toLowerCase() || "";
      const roleTitle = emp.role_title?.toLowerCase() || "";
      const nationalId = emp.national_id?.toLowerCase() || "";

      if (firstName.includes(lowerQuery)) {
        matchedBy.push("first_name");
      }

      if (lastName.includes(lowerQuery)) {
        matchedBy.push("last_name");
      }

      if (roleTitle.includes(lowerQuery)) {
        matchedBy.push("role_title");
      }

      if (nationalId.includes(lowerQuery)) {
        matchedBy.push("national_id");
      }

      return {
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        role_title: emp.role_title,
        status: emp.status,
        national_id: emp.national_id,
        department: emp.department
          ? {
              id: emp.department.id,
              name: emp.department.name,
            }
          : null,
        matchedBy,
      };
    });

    // ============================================================
    // 2. DEPARTMENTS
    // ============================================================

    const allDepartments = await departmentRepo.find({
      where: [{ name: ILike(searchTerm) }, { description: ILike(searchTerm) }],
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
      },
    });

    const departments = allDepartments.map((dept) => {
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

    // ============================================================
    // 3. CERTIFICATIONS
    // ============================================================

    const allCertifications = await certRepo.find({
      where: [{ name: ILike(searchTerm) }, { issued_by: ILike(searchTerm) }],
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
    });

    const certifications = allCertifications.map((cert) => {
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

    // ============================================================
    // 4. EDUCATION
    // ============================================================

    const allEducation = await eduRepo.find({
      where: [
        { institution: ILike(searchTerm) },
        { degree: ILike(searchTerm) },
        { field_of_study: ILike(searchTerm) },
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
    });

    const education = allEducation.map((edu) => {
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

    // ============================================================
    // 5. DOCUMENTS
    // ============================================================

    const allDocuments = await docRepo.find({
      where: {
        ocr_text: ILike(searchTerm),
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
    });

    const documents = allDocuments.map((doc) => ({
      id: doc.id,
      category: doc.category,
      snippet: buildOcrSnippet(doc.ocr_text, query),
      employee: doc.employee
        ? {
            id: doc.employee.id,
            first_name: doc.employee.first_name,
            last_name: doc.employee.last_name,
          }
        : null,
      matchedBy: ["ocr_text"],
    }));

    // ============================================================
    // FINAL RESPONSE
    // ============================================================

    return res.json({
      query,
      results: {
        employees,
        departments,
        certifications,
        education,
        documents,
      },
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      message: "An error occurred while performing the search.",
    });
  }
});

export default router;
