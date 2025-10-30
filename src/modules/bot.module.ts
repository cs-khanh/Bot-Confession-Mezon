import { HelpCommand } from '@app/command/help.command';
import { PingCommand } from '@app/command/ping.command';
import { AboutCommand } from '@app/command/about.command';
import { ConfessCommand } from '@app/command/confess.command';
import { TopConfessionCommand } from '@app/command/topconfession.command';
import { StatsCommand } from '@app/command/stats.command';
import { ApproveCommand } from '@app/command/approve.command';
import { RejectCommand } from '@app/command/reject.command';
import { DBStatusCommand } from '@app/command/dbstatus.command';
import { ClientConfigService } from '@app/config/client.config';
import { BotGateway } from '@app/gateway/bot.gateway';
import { EventListenerChannelMessage, EventListenerReaction } from '@app/listeners';
import { CommandService } from '@app/services/command.service';
import { MessageCommand } from '@app/services/message-command.service';
import { MessageQueue } from '@app/services/message-queue.service';
import { ModerationService } from '@app/services/moderation.service';
import { ConfessionService } from '@app/services/confession.service';
import { AnalyticsService } from '@app/services/analytics.service';
import { NewsCrawlerService } from '@app/services/news-crawler.service';
// import { SchedulerService } from '@app/services/scheduler.service';
import { AdminService } from '@app/services/admin.service';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { MezonClientService } from '@app/services/mezon-client.service';
import { Confession } from '@app/entities/confession.entity';
import { ReactionLog } from '@app/entities/reaction-log.entity';
import { WeeklyStats } from '@app/entities/weekly-stats.entity';
import { AutoModerationService } from '@app/services/auto-moderation.service';
import { NewsCommand } from '@app/command/news.command';
import { TikTokCommand } from '@app/command/tiktok.command';
import { CheckCommand } from '@app/command/check.command';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsModule } from './news.module';
import { TikTokModule } from './tiktok.module';
import { Reaction } from '@app/entities/reaction.entity';
import { ReactionUser } from '@app/entities/reaction-user.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([Confession, Reaction, ReactionUser, ReactionLog, WeeklyStats]),

        NewsModule,
        TikTokModule,
        // TypeOrmModule.forFeature([]),

    ],
    providers: [
        BotGateway,
        ClientConfigService,
        // MezonClientService, // Đã được cung cấp bởi MezonModule.forRootAsync()
        ConfigService,
        CommandService,

        MessageCommand,

        // Services
        ModerationService,
        ConfessionService,
        MessageQueue,
        AnalyticsService,
        NewsCrawlerService,
        AdminService,
        AutoModerationService,

        // Listeners
        EventListenerChannelMessage,
        EventListenerReaction,
        ConfigService,
        CommandService,
        MessageQueue,
        MessageCommand,

        // Listeners
        EventListenerChannelMessage,


        // Commands
        HelpCommand,
        PingCommand,
        AboutCommand,

        ConfessCommand,
        TopConfessionCommand,
        StatsCommand,
        ApproveCommand,
        RejectCommand,

        NewsCommand,
        TikTokCommand,
        CheckCommand,
        DBStatusCommand,

    ],
    controllers: [],
})
export class BotModule { }