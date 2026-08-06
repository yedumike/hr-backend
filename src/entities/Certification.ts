import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("certifications")
export class Certification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @Column({ type: "varchar" })
  name!: string; // e.g. "AWS Certified Solutions Architect"

  @Column({ type: "varchar" })
  issued_by!: string; // e.g. "Amazon Web Services"

  @Column({ type: "date" })
  issue_date!: string;

  // nullable — not every certification expires (some are one-time/permanent)
  @Column({ type: "date", nullable: true })
  expiry_date!: string | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
