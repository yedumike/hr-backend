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

export type EmployeeStatus = "active" | "inactive" | "terminated";
export type EmployeeGender = "male" | "female";

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
  date_of_birth!: string;

  @Column({ type: "varchar", unique: true })
  national_id!: string;

  @Column({ type: "varchar" })
  phone!: string;

  @Column({ type: "varchar", unique: true })
  personal_email!: string;

  @Column({ type: "varchar" })
  address!: string;

  // --- Employment details ---
  @Column({ type: "varchar" })
  role_title!: string;

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: false,
  })
  department!: Department;

  @Column({ type: "date" })
  hire_date!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  salary!: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "manager_id" })
  manager!: Employee | null;

  @Column({ type: "varchar", default: "active" })
  status!: EmployeeStatus;

  // date probation is expected to end — nullable, since not every employee
  // is currently in a probation period (e.g. long-tenured staff)
  @Column({ type: "date", nullable: true })
  probation_end_date!: string | null;

  // date a fixed-term contract needs renewing — nullable, since not every
  // employee is on a fixed-term contract (e.g. permanent staff)
  @Column({ type: "date", nullable: true })
  contract_renewal_date!: string | null;

  // --- Optional link to a login account ---
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @Column({ type: "varchar", nullable: true })
  gender!: EmployeeGender;
}
