import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepartmentDescriptionAndEmployeeDates1785750190681 implements MigrationInterface {
    name = 'AddDepartmentDescriptionAndEmployeeDates1785750190681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "probation_end_date" date`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "contract_renewal_date" date`);
        await queryRunner.query(`ALTER TABLE "departments" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "departments" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "contract_renewal_date"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "probation_end_date"`);
    }

}
