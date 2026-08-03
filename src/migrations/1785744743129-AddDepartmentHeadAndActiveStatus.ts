import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepartmentHeadAndActiveStatus1785744743129 implements MigrationInterface {
  name = "AddDepartmentHeadAndActiveStatus1785744743129";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "departments" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD "head_of_department_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "FK_97b53044888fa04e179cb19f641" FOREIGN KEY ("head_of_department_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "departments" DROP CONSTRAINT "FK_97b53044888fa04e179cb19f641"`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" DROP COLUMN "head_of_department_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" DROP COLUMN "is_active"`,
    );
  }
}
