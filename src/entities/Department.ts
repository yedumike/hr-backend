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

  // the employee who heads this department — optional, since a department
  // might temporarily have no assigned head
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "head_of_department_id" })
  head_of_department!: Employee | null;

  // soft-delete flag — consistent with how we handle Employee.status
  // "deleting" a department just flips this to false, the row stays in the DB
  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  // reverse relationship — not a real column, just lets us write department.employees in code
  @OneToMany(() => Employee, (employee) => employee.department)
  employees!: Employee[];
}
