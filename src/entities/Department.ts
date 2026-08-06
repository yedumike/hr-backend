import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string; // e.g. "Engineering", "Finance", "HR"

  // optional free-text description of what the department does —
  // "text" type instead of "varchar" since there's no fixed length limit,
  // matches the "up to 300 characters" note from the mockup, though we're
  // not enforcing that limit at the DB level, just letting the frontend guide it
  @Column({ type: "text", nullable: true })
  description!: string | null;

  // the employee who heads this department — optional, since a department
  // might temporarily have no assigned head
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "head_of_department_id" })
  head_of_department!: Employee | null;

  // soft-delete flag — consistent with how we handle Employee.status
  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  // reverse relationship — not a real column, just lets us write department.employees in code
  @OneToMany(() => Employee, (employee) => employee.department)
  employees!: Employee[];
}
