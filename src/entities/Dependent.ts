import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("dependents")
export class Dependent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  relationship!: string; // e.g. "Spouse", "Child", "Parent"

  @Column({ type: "date" })
  date_of_birth!: string;

  // nullable — a young child dependent may not have their own contact info
  @Column({ type: "varchar", nullable: true })
  contact!: string | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
