import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./User";
import { Permission } from "./Permission";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string; // e.g. "HR_ADMIN", "MANAGER", "EMPLOYEE", or any custom role name

  @OneToMany(() => User, (user) => user.role)
  users!: User[];

  // many-to-many: a role can have many permissions, a permission can belong to many roles
  @ManyToMany(() => Permission)
  @JoinTable({
    name: "role_permissions", // explicit name for the join table
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: Permission[];
}

// Why @JoinTable only goes on Role, not Permission

// In a @ManyToMany relationship, TypeORM needs exactly one side to "own"
// the join table definition — we chose Role as the owning side, since roles
// are what get permissions attached to them, not the other way around.
// Permission doesn't need any decorator changes at all for
// this relationship to work.
