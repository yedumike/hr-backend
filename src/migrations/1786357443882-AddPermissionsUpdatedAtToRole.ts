import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermissionsUpdatedAtToRole1786357443882 implements MigrationInterface {
    name = 'AddPermissionsUpdatedAtToRole1786357443882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "permissions_updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "permissions_updated_at"`);
    }

}
