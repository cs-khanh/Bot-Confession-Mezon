import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTikTokVideosTable1759987000000 implements MigrationInterface {
    name = 'CreateTikTokVideosTable1759987000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create tiktok_videos table
        await queryRunner.createTable(
            new Table({
                name: 'tiktok_videos',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'videoId',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'authorUsername',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'authorDisplayName',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'likeCount',
                        type: 'bigint',
                        default: 0,
                    },
                    {
                        name: 'viewCount',
                        type: 'bigint',
                        default: 0,
                    },
                    {
                        name: 'shareCount',
                        type: 'bigint',
                        default: 0,
                    },
                    {
                        name: 'commentCount',
                        type: 'bigint',
                        default: 0,
                    },
                    {
                        name: 'videoUrl',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'coverImageUrl',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'tiktokCreatedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'posted',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'hotScore',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'tiktok_videos',
            new TableIndex({
                name: 'IDX_TIKTOK_VIDEO_ID',
                columnNames: ['videoId'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'tiktok_videos',
            new TableIndex({
                name: 'IDX_TIKTOK_POSTED',
                columnNames: ['posted'],
            }),
        );

        await queryRunner.createIndex(
            'tiktok_videos',
            new TableIndex({
                name: 'IDX_TIKTOK_HOT_SCORE',
                columnNames: ['hotScore'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('tiktok_videos', 'IDX_TIKTOK_HOT_SCORE');
        await queryRunner.dropIndex('tiktok_videos', 'IDX_TIKTOK_POSTED');
        await queryRunner.dropIndex('tiktok_videos', 'IDX_TIKTOK_VIDEO_ID');

        // Drop table
        await queryRunner.dropTable('tiktok_videos');
    }
}

