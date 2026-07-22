import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Employee } from "./Employee";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string; // e.g. "Engineering", "Finance", "HR"

  // reverse side of the relationship — lets us write department.employees
  // to get everyone in that department. Doesn't create a column itself.
  @OneToMany(() => Employee, (employee) => employee.department)
  employees!: Employee[];
}