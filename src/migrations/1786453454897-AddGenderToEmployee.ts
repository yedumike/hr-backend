import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenderToEmployee1786453454897 implements MigrationInterface {
    name = 'AddGenderToEmployee1786453454897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "gender" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "gender"`);
    }

}
