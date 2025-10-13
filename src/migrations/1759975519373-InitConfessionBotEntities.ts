import { MigrationInterface, QueryRunner } from "typeorm";

export class InitConfessionBotEntities1759975519373 implements MigrationInterface {
    name = 'InitConfessionBotEntities1759975519373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add UUID extension if it doesn't exist
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        `);
        
        // Create enum type for confession status
        await queryRunner.query(`
            CREATE TYPE "public"."confession_status_enum" AS ENUM('pending', 'approved', 'rejected')
        `);
        
        // Create confession table
        await queryRunner.query(`
            CREATE TABLE "confession" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "confession_number" SERIAL NOT NULL, 
                "content" text NOT NULL, 
                "author_hash" character varying NOT NULL,
                "messageId" character varying, 
                "moderationMessageId" character varying, 
                "channel_id" character varying,
                "status" "confession_status_enum" NOT NULL DEFAULT 'pending',
                "reaction_count" integer NOT NULL DEFAULT '0',
                "tags" text[] DEFAULT '{}',
                "moderation_comment" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "posted_at" TIMESTAMP,
                CONSTRAINT "PK_confession_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_confession_number" UNIQUE ("confession_number")
            )
        `);

        // Create reaction_log table
        await queryRunner.query(`
            CREATE TABLE "reaction_log" (
                "id" SERIAL NOT NULL, 
                "message_id" character varying NOT NULL, 
                "confession_id" uuid,
                "reactions" jsonb NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_reaction_log_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_reaction_log_messageId" UNIQUE ("message_id"),
                CONSTRAINT "FK_reaction_log_confession" FOREIGN KEY ("confession_id") 
                    REFERENCES "confession"("id") ON DELETE SET NULL
            )
        `);

        // Create weekly_stats table
        await queryRunner.query(`
            CREATE TABLE "weekly_stats" (
                "id" SERIAL NOT NULL, 
                "week" integer NOT NULL,
                "year" integer NOT NULL,
                "startDate" TIMESTAMP NOT NULL,
                "endDate" TIMESTAMP NOT NULL,
                "totalConfessions" integer NOT NULL DEFAULT '0',
                "approvedConfessions" integer NOT NULL DEFAULT '0',
                "rejectedConfessions" integer NOT NULL DEFAULT '0',
                "totalReactions" integer NOT NULL DEFAULT '0',
                "topConfessions" jsonb NOT NULL DEFAULT '[]',
                "topTags" jsonb NOT NULL DEFAULT '[]',
                "reactionDistribution" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_weekly_stats_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_weekly_stats_week_year" UNIQUE ("week", "year")
            )
        `);

        // Create indices for better performance
        await queryRunner.query(`
            CREATE INDEX "IDX_confession_status" ON "confession" ("status")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_confession_number" ON "confession" ("confession_number")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_confession_createdAt" ON "confession" ("created_at")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_confession_postedAt" ON "confession" ("posted_at")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_reaction_log_confessionId" ON "reaction_log" ("confession_id")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_weekly_stats_week_year" ON "weekly_stats" ("week", "year")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_weekly_stats_week_year"`);
        await queryRunner.query(`DROP INDEX "IDX_reaction_log_confessionId"`);
        await queryRunner.query(`DROP INDEX "IDX_confession_postedAt"`);
        await queryRunner.query(`DROP INDEX "IDX_confession_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_confession_status"`);
        
        await queryRunner.query(`DROP TABLE "weekly_stats"`);
        await queryRunner.query(`DROP TABLE "reaction_log"`);
        await queryRunner.query(`DROP TABLE "confession"`);
        await queryRunner.query(`DROP TYPE "public"."confession_status_enum"`);
    }
}
