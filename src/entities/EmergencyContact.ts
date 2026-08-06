import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("emergency_contacts")
export class EmergencyContact {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  relationship!: string; // e.g. "Spouse", "Friend", "Neighbor" — more casual than Dependent

  @Column({ type: "varchar" })
  phone!: string;

  // flags this specific contact as the designated "next of kin" —
  // an employee can have multiple emergency contacts, but typically one
  // formally recognized next of kin
  @Column({ type: "boolean", default: false })
  is_next_of_kin!: boolean;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
