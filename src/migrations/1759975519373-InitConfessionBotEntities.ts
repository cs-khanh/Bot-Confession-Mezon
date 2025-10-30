import { MigrationInterface, QueryRunner } from "typeorm";

export class InitConfessionBotEntities1759975519373 implements MigrationInterface {
    name = 'InitConfessionBotEntities1759975519373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension for Postgres
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        `);
        
        // Create enum type for confession status
        await queryRunner.query(`
            CREATE TYPE "public"."confession_status_enum" AS ENUM('pending', 'approved', 'rejected')
        `);
        
        // =============================
        // CONFESSION TABLE
        // =============================
        await queryRunner.query(`
            CREATE TABLE "confession" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "confession_number" SERIAL NOT NULL, 
                "content" text NOT NULL, 
                "author_hash" character varying NOT NULL,
                "messageId" character varying, 
                "moderationMessageId" character varying, 
                "channel_id" character varying,
                "status" "public"."confession_status_enum" NOT NULL DEFAULT 'pending',
                "reaction_count" integer NOT NULL DEFAULT '0',
                "tags" text[] DEFAULT '{}',
                "moderation_comment" text,
                "attachments" jsonb DEFAULT '[]',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "posted_at" TIMESTAMP,
                CONSTRAINT "PK_confession_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_confession_number" UNIQUE ("confession_number")
            )
        `);

        // =============================
        // REACTION TABLE (NEW)
        // =============================
        await queryRunner.query(`
            CREATE TABLE "reaction" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "messageId" character varying(255) NOT NULL,
                "confessionId" uuid,
                "emoji" character varying(255) NOT NULL,
                "count" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_reaction_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_reaction_message_emoji" UNIQUE ("messageId", "emoji"),
                CONSTRAINT "FK_reaction_confession" FOREIGN KEY ("confessionId") REFERENCES "confession"("id") ON DELETE CASCADE
            )
        `);
        // =============================
        // REACTION_USER TABLE
        // =============================
        await queryRunner.query(`
        CREATE TABLE "reaction_user" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "messageId" character varying(255) NOT NULL,
            "emoji" character varying(255) NOT NULL,
            "userId" character varying(255) NOT NULL,
            "count" integer NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_reaction_user_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_reaction_user_me_msg_emoji_user" UNIQUE ("messageId","emoji","userId")
        )
        `);
        // =============================
        // REACTION_LOG TABLE
        // =============================
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

        // =============================
        // WEEKLY_STATS TABLE
        // =============================
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

        // =============================
        // INDEXES
        // =============================
        await queryRunner.query(`CREATE INDEX "IDX_confession_status" ON "confession" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_confession_number" ON "confession" ("confession_number")`);
        await queryRunner.query(`CREATE INDEX "IDX_confession_createdAt" ON "confession" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_confession_postedAt" ON "confession" ("posted_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_created_at" ON "reaction" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_updated_at" ON "reaction" ("updated_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_user_message" ON "reaction_user" ("messageId");`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_user_emoji" ON "reaction_user" ("emoji");`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_user_user" ON "reaction_user" ("userId");`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_log_confessionId" ON "reaction_log" ("confession_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_message" ON "reaction" ("messageId")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_emoji" ON "reaction" ("emoji")`);
        await queryRunner.query(`CREATE INDEX "IDX_reaction_confessionId" ON "reaction" ("confessionId")`);
        await queryRunner.query(`CREATE INDEX "IDX_weekly_stats_week_year" ON "weekly_stats" ("week", "year")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_weekly_stats_week_year"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_confessionId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_emoji"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_message"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_log_confessionId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_confession_postedAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_confession_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_confession_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_confession_number"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_updated_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_user_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_user_emoji"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_user_message"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reaction_user_id"`);


        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "weekly_stats"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reaction_log"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reaction"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "confession"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reaction_user"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."confession_status_enum"`);
    }
}
