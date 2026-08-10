import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Permission } from "./Permission";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];

  @ManyToMany(() => Permission)
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: Permission[];

  // automatically updates any time this row is saved — including when
  // its permissions relation changes. Used to detect "this token's
  // permission snapshot is now stale" in the authenticate middleware.
  @UpdateDateColumn({ type: "timestamp" })
  permissions_updated_at!: Date;
}

// Why @JoinTable only goes on Role, not Permission

// In a @ManyToMany relationship, TypeORM needs exactly one side to "own"
// the join table definition — we chose Role as the owning side, since roles
// are what get permissions attached to them, not the other way around.
// Permission doesn't need any decorator changes at all for
// this relationship to work.
