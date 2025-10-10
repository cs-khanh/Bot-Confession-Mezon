import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { News } from '@app/entities/news.entity';
import { NewsService } from '@app/services/news.service';
import { GeminiService } from '@app/services/gemini.service';
import { NewsCrawlerService } from '@app/services/news-crawler.service';
import { NewsPostingService } from '@app/services/news-posting.service';
import { NewsScheduler } from '@app/services/news-scheduler.service';
import { MezonModule } from './mezon.module';
import { ChannelCheckerService } from '@app/utils/channel-checker';
import { ChannelJoinerService } from '@app/utils/channel-joiner';

@Module({
    imports: [
        TypeOrmModule.forFeature([News]),
        ScheduleModule.forRoot(),
        MezonModule,
    ],
    providers: [
        NewsService,
        GeminiService,
        NewsCrawlerService,
        NewsPostingService,
        NewsScheduler,
        ChannelCheckerService,
        ChannelJoinerService,
    ],
    exports: [
        NewsService,
        GeminiService,
        NewsCrawlerService,
        NewsPostingService,
        NewsScheduler,
        ChannelCheckerService,
        ChannelJoinerService,
    ],
})
export class NewsModule {}

