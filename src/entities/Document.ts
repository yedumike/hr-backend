import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

export type DocumentCategory =
  | "cv"
  | "certificate"
  | "transcript"
  | "id_card"
  | "birth_cert"
  | "marriage_cert";

export type OcrStatus = "pending" | "completed" | "failed";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // every document always belongs to exactly one employee
  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: "employee_id" })
  employee!: Employee;

  @Column({ type: "varchar" })
  category!: DocumentCategory;

  // nullable — only set when this document is tied to a MORE specific
  // record than just the employee generally (e.g. a specific certification)
  @Column({ type: "varchar", nullable: true })
  related_entity_type!:
    | "education_record"
    | "certification"
    | "dependent"
    | null;

  @Column({ type: "uuid", nullable: true })
  related_entity_id!: string | null;

  @Column({ type: "varchar" })
  file_url!: string; // where the actual file lives in R2

  @Column({ type: "text", nullable: true })
  ocr_text!: string | null;

  @Column({ type: "varchar", default: "pending" })
  ocr_status!: OcrStatus;

  @CreateDateColumn({ type: "timestamp" })
  uploaded_at!: Date;
}
