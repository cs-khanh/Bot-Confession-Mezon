import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateNewsTable1759974246345 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'news',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'link',
                        type: 'varchar',
                        length: '1000',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'summary',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'source',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                    },
                    {
                        name: 'imageUrl',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'posted',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Create indexes
        await queryRunner.createIndex(
            'news',
            new TableIndex({
                name: 'IDX_NEWS_LINK',
                columnNames: ['link'],
            })
        );

        await queryRunner.createIndex(
            'news',
            new TableIndex({
                name: 'IDX_NEWS_CATEGORY',
                columnNames: ['category'],
            })
        );

        await queryRunner.createIndex(
            'news',
            new TableIndex({
                name: 'IDX_NEWS_POSTED',
                columnNames: ['posted'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('news', 'IDX_NEWS_POSTED');
        await queryRunner.dropIndex('news', 'IDX_NEWS_CATEGORY');
        await queryRunner.dropIndex('news', 'IDX_NEWS_LINK');
        await queryRunner.dropTable('news');
    }

}
