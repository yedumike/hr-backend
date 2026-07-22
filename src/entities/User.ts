import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Role } from "./Role";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password_hash!: string; // never store the raw password — only the bcrypt hash

  // this side actually creates a foreign key column (role_id) on the users table,
  // pointing to a row in the roles table
  @ManyToOne(() => Role, (role) => role.users)
  role!: Role;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date; // auto-set by TypeORM when the row is first inserted
}