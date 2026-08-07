import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentsTable1786097671839 implements MigrationInterface {
    name = 'AddDocumentsTable1786097671839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category" character varying NOT NULL, "related_entity_type" character varying, "related_entity_id" uuid, "file_url" character varying NOT NULL, "ocr_text" text, "ocr_status" character varying NOT NULL DEFAULT 'pending', "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_8b60169d17455c20823032dfb38" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_8b60169d17455c20823032dfb38"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
