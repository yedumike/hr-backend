import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string; // e.g. "employees:create", "departments:view"

  @Column({ type: "varchar", nullable: true })
  description!: string | null; // human-readable explanation, for the admin UI
}
