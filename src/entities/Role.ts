import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./User";

@Entity("roles") // maps this class to a table named "roles"
export class Role {
  @PrimaryGeneratedColumn("uuid")
  // the "!" tells TS "trust me, this gets set" — TypeORM assigns it when it
  // loads a row from the DB, not via a constructor, so TS can't verify it itself
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: string; // e.g. "HR_ADMIN" | "MANAGER" | "EMPLOYEE"

  // this is the "reverse" side of the relationship defined in User.ts —
  // it doesn't create a column, it just lets you write `someRole.users` in code
  // to get all Users that have this role
  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}