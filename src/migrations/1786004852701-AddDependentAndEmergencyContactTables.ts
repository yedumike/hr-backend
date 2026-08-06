import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDependentAndEmergencyContactTables1786004852701 implements MigrationInterface {
    name = 'AddDependentAndEmergencyContactTables1786004852701'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dependents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "relationship" character varying NOT NULL, "date_of_birth" date NOT NULL, "contact" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_9ecb9400bc31d2e3955aa944a9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "emergency_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "relationship" character varying NOT NULL, "phone" character varying NOT NULL, "is_next_of_kin" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, CONSTRAINT "PK_8be191845b6fca1c4e5ba5bd7d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "dependents" ADD CONSTRAINT "FK_43d148e0128ed47a69483f0005b" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emergency_contacts" ADD CONSTRAINT "FK_b4f14c83553a59e73d0ceb3b8fe" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emergency_contacts" DROP CONSTRAINT "FK_b4f14c83553a59e73d0ceb3b8fe"`);
        await queryRunner.query(`ALTER TABLE "dependents" DROP CONSTRAINT "FK_43d148e0128ed47a69483f0005b"`);
        await queryRunner.query(`DROP TABLE "emergency_contacts"`);
        await queryRunner.query(`DROP TABLE "dependents"`);
    }

}
