import { dataSourceOption } from '@app/config/data-source.config';
import config, { envFilePath } from '@app/config/env.config';
import * as Joi from '@hapi/joi';
import { BotModule } from '@app/modules/bot.module';
import { MezonModule } from '@app/modules/mezon.module';
import { NewsModule } from '@app/modules/news.module';
import { HealthController } from '@app/controllers/health.controller';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [config],
            validationSchema: Joi.object({
                POSTGRES_HOST: Joi.string().required(),
                POSTGRES_PORT: Joi.number().required(),
                POSTGRES_USER: Joi.string().required(),
                POSTGRES_PASSWORD: Joi.string().required(),
                POSTGRES_DB: Joi.string().required(),
                BOT_ID: Joi.string().required(),
                MEZON_TOKEN: Joi.string().required(),
                
                // Confession Bot required fields
                CONFESSION_CHANNEL_ID: Joi.string().required(),
                MODERATION_CHANNEL_ID: Joi.string().required(),
                ANNOUNCEMENT_CHANNEL_ID: Joi.string().required(),
                
                // Optional fields with defaults
                OPENAI_API_KEY: Joi.string().allow('').optional(),
                GEMINI_API_KEY: Joi.string().allow('').optional(),
                USE_GEMINI: Joi.string().optional().valid('true', 'false').default('false'),
                NEWS_RSS_FEED_URL: Joi.string().optional(),
                WEEKLY_REPORT_CRON: Joi.string().optional().default('0 18 * * SUN'),
                MODERATION_ENABLED: Joi.string().optional().default('true'),
                AI_MODERATION_ENABLED: Joi.string().optional().default('false'),
                AI_SUMMARY_ENABLED: Joi.string().optional().default('false'),
                AUTO_MODERATION_ENABLED: Joi.string().optional().default('false'),
                ADMIN_USER_IDS: Joi.string().optional().default(''),
                NEWS_CHANNEL_ID: Joi.string().optional(),
                TIKTOK_ACCESS_TOKEN: Joi.string().optional(),
                TIKTOK_CHANNEL_ID: Joi.string().optional(),
            }),
            isGlobal: true,
            envFilePath: envFilePath,
        }),
        TypeOrmModule.forRoot(dataSourceOption),
        EventEmitterModule.forRoot(),
        MezonModule.forRootAsync({
            imports: [ConfigModule],
        }),
        BotModule,
        NewsModule,

    ],
    controllers: [HealthController],
})
export class AppModule { }