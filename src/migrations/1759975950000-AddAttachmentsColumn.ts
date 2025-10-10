import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttachmentsColumn1759975950000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the column already exists before adding it
        const table = await queryRunner.getTable("confession");
        const attachmentsColumn = table?.findColumnByName("attachments");
        
        if (!attachmentsColumn) {
            // Add the attachments column if it doesn't exist
            await queryRunner.query(`ALTER TABLE "confession" ADD COLUMN "attachments" JSONB`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the column if it exists
        const table = await queryRunner.getTable("confession");
        const attachmentsColumn = table?.findColumnByName("attachments");
        
        if (attachmentsColumn) {
            await queryRunner.query(`ALTER TABLE "confession" DROP COLUMN "attachments"`);
        }
    }
}