import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Department } from "./Department";
import { User } from "./User";

// a plain string union — TypeScript will only allow these exact values,
// which helps catch typos like "Actve" at compile time instead of runtime
export type EmployeeStatus = "active" | "inactive" | "terminated";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // --- Personal details ---
  @Column({ type: "varchar" })
  first_name!: string;

  @Column({ type: "varchar" })
  last_name!: string;

  @Column({ type: "date" })
  date_of_birth!: string; // stored as a DATE column; TypeORM returns/accepts these as "YYYY-MM-DD" strings

  @Column({ type: "varchar", unique: true })
  national_id!: string;

  @Column({ type: "varchar" })
  phone!: string;

  @Column({ type: "varchar", unique: true })
  personal_email!: string; // separate from login email (User.email) — this is their personal contact

  @Column({ type: "varchar" })
  address!: string;

  // --- Employment details ---
  @Column({ type: "varchar" })
  role_title!: string; // e.g. "Software Engineer" — free text, not the same as auth Role (HR_ADMIN etc)

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: false, //every employee must belong to a department,
  })
  department!: Department;

  @Column({ type: "date" })
  hire_date!: string;

  // decimal, never float — floats lose precision on money values
  @Column({ type: "decimal", precision: 12, scale: 2 })
  salary!: string; // TypeORM returns decimal columns as strings by default, to avoid JS float rounding issues

  // self-referencing relation — an employee's manager is also an Employee
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "manager_id" })
  manager!: Employee | null;

  @Column({ type: "varchar", default: "active" })
  status!: EmployeeStatus;

  // --- Optional link to a login account ---
  // nullable: true means this employee record can exist with no linked User at all
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;
}
