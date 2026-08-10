import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { EmergencyContact } from "../entities/EmergencyContact";
import { Employee } from "../entities/Employee";
import { authenticate, authorize } from "../middleware/authenticate";
import { logAudit } from "../utils/audit";

const router = Router();

interface CreateEmergencyContactBody {
  employee_id?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  is_next_of_kin?: boolean;
}

router.post(
  "/",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("emergency_contacts:create"),
  async (req: Request, res: Response) => {
    const { employee_id, name, relationship, phone, is_next_of_kin } =
      req.body as CreateEmergencyContactBody;

    if (!employee_id || !name || !relationship || !phone) {
      res
        .status(400)
        .json({ error: "Missing required emergency contact fields" });
      return;
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const contactRepo = AppDataSource.getRepository(EmergencyContact);

    const employee = await employeeRepo.findOne({ where: { id: employee_id } });
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const contact = contactRepo.create({
      employee,
      name,
      relationship,
      phone,
      is_next_of_kin: is_next_of_kin ?? false,
    });

    await contactRepo.save(contact);

    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "EmergencyContact",
      entityId: contact.id,
      description: `Added emergency contact "${name}" (${relationship}) for ${employee.first_name} ${employee.last_name}`,
    });

    res.status(201).json({ emergencyContact: contact });
  },
);

router.get(
  "/",
  authenticate,
  authorize("emergency_contacts:view"),
  async (req: Request, res: Response) => {
    const employeeId = req.query.employee_id;

    if (!employeeId || typeof employeeId !== "string") {
      res
        .status(400)
        .json({ error: "employee_id query parameter is required" });
      return;
    }

    const contactRepo = AppDataSource.getRepository(EmergencyContact);
    const contacts = await contactRepo.find({
      where: { employee: { id: employeeId } },
      order: { created_at: "DESC" },
    });

    res.json({ emergencyContacts: contacts });
  },
);

interface UpdateEmergencyContactBody {
  name?: string;
  relationship?: string;
  phone?: string;
  is_next_of_kin?: boolean;
}

router.put(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("emergency_contacts:update"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid emergency contact id" });
      return;
    }

    const contactRepo = AppDataSource.getRepository(EmergencyContact);
    const contact = await contactRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!contact) {
      res.status(404).json({ error: "Emergency contact not found" });
      return;
    }

    const body = req.body as UpdateEmergencyContactBody;

    if (body.name) contact.name = body.name;
    if (body.relationship) contact.relationship = body.relationship;
    if (body.phone) contact.phone = body.phone;
    if (body.is_next_of_kin !== undefined)
      contact.is_next_of_kin = body.is_next_of_kin;

    await contactRepo.save(contact);

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "EmergencyContact",
      entityId: contact.id,
      description: `Updated emergency contact "${contact.name}" for ${contact.employee.first_name} ${contact.employee.last_name}`,
    });

    res.json({ emergencyContact: contact });
  },
);

router.delete(
  "/:id",
  authenticate,
  // authorize("HR_ADMIN"),
  authorize("emergency_contacts:delete"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid emergency contact id" });
      return;
    }

    const contactRepo = AppDataSource.getRepository(EmergencyContact);
    const contact = await contactRepo.findOne({
      where: { id },
      relations: { employee: true },
    });

    if (!contact) {
      res.status(404).json({ error: "Emergency contact not found" });
      return;
    }

    const employeeName = `${contact.employee.first_name} ${contact.employee.last_name}`;
    const contactName = contact.name;

    await contactRepo.remove(contact);

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "EmergencyContact",
      entityId: id,
      description: `Removed emergency contact "${contactName}" for ${employeeName}`,
    });

    res.json({ message: "Emergency contact deleted" });
  },
);

export default router;
