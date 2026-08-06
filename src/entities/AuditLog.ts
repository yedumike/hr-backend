import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // nullable — in case an action ever happens without an authenticated user
  // attached (e.g. a future automated/system process)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @Column({ type: "varchar" })
  action!: string; // "CREATE" | "UPDATE" | "DELETE"

  @Column({ type: "varchar" })
  entity_type!: string; // "Employee" | "Department" | etc

  @Column({ type: "uuid" })
  entity_id!: string;

  // human-readable summary — this is what directly powers the "Recent Activities" feed
  @Column({ type: "text" })
  description!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
