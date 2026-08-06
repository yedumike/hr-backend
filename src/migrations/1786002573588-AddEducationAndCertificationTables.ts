import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEducationAndCertificationTables1786002573588 implements MigrationInterface {
    name = 'AddEducationAndCertificationTables1786002573588'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "education_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "institution" character varying NOT NULL, "degree" character varying NOT NULL, "field_of_study" character varying NOT NULL, "year_completed" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_bbd101410ab2d8f8a62f6dfe4ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "certifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "issued_by" character varying NOT NULL, "issue_date" date NOT NULL, "expiry_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_fd763d412e4a1fb1b6dadd6e72b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "education_records" ADD CONSTRAINT "FK_e8611e42aa490f1a5fbfcccfbfd" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "certifications" ADD CONSTRAINT "FK_207dbeb7981b44c831eeac7b464" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certifications" DROP CONSTRAINT "FK_207dbeb7981b44c831eeac7b464"`);
        await queryRunner.query(`ALTER TABLE "education_records" DROP CONSTRAINT "FK_e8611e42aa490f1a5fbfcccfbfd"`);
        await queryRunner.query(`DROP TABLE "certifications"`);
        await queryRunner.query(`DROP TABLE "education_records"`);
    }

}
