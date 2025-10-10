import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTotalCountColumn1759975900000 implements MigrationInterface {
    name = 'AddTotalCountColumn1759975900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "reaction_log" ADD "total_count" integer NOT NULL DEFAULT '0'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "reaction_log" DROP COLUMN "total_count"
        `);
    }
}