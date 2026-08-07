import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMustChangePasswordToUser1786070922744 implements MigrationInterface {
    name = 'AddMustChangePasswordToUser1786070922744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "must_change_password" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "must_change_password"`);
    }

}
