import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOriginalFilenameToDocument1786451402577 implements MigrationInterface {
    name = 'AddOriginalFilenameToDocument1786451402577'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" ADD "original_filename" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "original_filename"`);
    }

}
