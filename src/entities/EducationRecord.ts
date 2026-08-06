import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("education_records")
export class EducationRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @Column({ type: "varchar" })
  institution!: string; // e.g. "University of Ghana"

  @Column({ type: "varchar" })
  degree!: string; // e.g. "BSc", "MSc", "PhD"

  @Column({ type: "varchar" })
  field_of_study!: string; // e.g. "Computer Science"

  @Column({ type: "int" })
  year_completed!: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
