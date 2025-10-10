import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TikTokVideo } from '../entities/tiktok-video.entity';
import { TikTokService } from '../services/tiktok.service';
import { TikTokCrawlerService } from '../services/tiktok-crawler.service';
import { TikTokPostingService } from '../services/tiktok-posting.service';
import { TikTokScheduler } from '../services/tiktok-scheduler.service';
import { MezonModule } from './mezon.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TikTokVideo]),
        ConfigModule,
        MezonModule,
    ],
    providers: [
        TikTokService,
        TikTokCrawlerService,
        TikTokPostingService,
        TikTokScheduler,
    ],
    exports: [
        TikTokService,
        TikTokCrawlerService,
        TikTokPostingService,
        TikTokScheduler,
    ],
})
export class TikTokModule {}

