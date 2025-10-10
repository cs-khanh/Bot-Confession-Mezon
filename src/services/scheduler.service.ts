// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { ConfigService } from '@nestjs/config';
// import { AnalyticsService } from './analytics.service';
// import { NewsCrawlerService } from './news-crawler.service';
// import { ConfessionService } from './confession.service';
// import { MezonClientService } from './mezon-client.service';
// import { format, startOfWeek, endOfWeek } from 'date-fns';
// import { MessageQueue } from './message-queue.service';

// @Injectable()
// export class SchedulerService {
//     private readonly logger = new Logger(SchedulerService.name);
//     private readonly confessionChannelId: string;
//     private readonly hotNewsChannelId: string;
//     private readonly topConfessionChannelId: string;

//     constructor(
//         private configService: ConfigService,
//         private analyticsService: AnalyticsService,
//         private newsCrawlerService: NewsCrawlerService,
//         private confessionService: ConfessionService,
//         private mezonClientService: MezonClientService,
//         private messageQueue: MessageQueue
//     ) {
//         this.confessionChannelId = this.configService.get<string>('CONFESSION_CHANNEL_ID');
//         this.hotNewsChannelId = this.configService.get<string>('HOT_NEWS_CHANNEL_ID');
//         this.topConfessionChannelId = this.configService.get<string>('TOP_CONFESSION_CHANNEL_ID');
//     }

//     // Every day at 8:00 AM
//     @Cron(CronExpression.EVERY_DAY_AT_8AM)
//     async publishDailyHotNews() {
//         this.logger.log('Running daily hot news publishing task');
//         try {
//             // Get latest news from different categories
//             const newsByCategory = await this.newsCrawlerService.getNewsSources(3);

//             // Post each category as a separate message
//             for (const [category, newsItems] of Object.entries(newsByCategory)) {
//                 if (newsItems.length > 0) {
//                     const messageContent = await this.newsCrawlerService.formatNewsMessage(newsItems, category);
                    
//                     // Send to hot news channel
//                     await this.sendChannelMessage(
//                         this.hotNewsChannelId,
//                         messageContent,
//                         { threadTitle: `${this.newsCrawlerService.getCategoryTitle(category)} - ${format(new Date(), 'dd/MM/yyyy')}` }
//                     );
//                 }
//             }
            
//             this.logger.log('Daily hot news published successfully');
//         } catch (error) {
//             this.logger.error('Failed to publish daily hot news', error);
//         }
//     }

//     // Every Sunday at 9:00 PM
//     @Cron('0 21 * * 0')
//     async publishWeeklyTopConfessions() {
//         this.logger.log('Running weekly top confessions task');
//         try {
//             const now = new Date();
//             const startDate = startOfWeek(now, { weekStartsOn: 1 });
//             const endDate = endOfWeek(now, { weekStartsOn: 1 });
            
//             // Get top confessions for the week
//             const topConfessions = await this.confessionService.getTopConfessions({
//                 startDate,
//                 endDate,
//                 limit: 10,
//             });
            
//             if (topConfessions.length === 0) {
//                 this.logger.log('No top confessions to publish for this week');
//                 return;
//             }
            
//             const dateRange = `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM/yyyy')}`;
            
//             // Prepare message content
//             const content = [
//                 `🏆 **Top Confessions of the Week** (${dateRange})`,
//                 ''
//             ];
            
//             // Add top confessions to message
//             topConfessions.forEach((confession, index) => {
//                 content.push(`**#${index + 1}** (${confession.reactionCount} reactions)`);
//                 content.push(confession.content);
//                 content.push(''); // Empty line for spacing
//             });
            
//             content.push('Congratulations to this week\'s top confessions! 🎉');
            
//             const messageContent = content.join('\n');
            
//             // Send to top confession channel
//             await this.sendChannelMessage(
//                 this.topConfessionChannelId,
//                 messageContent
//             );
            
//             this.logger.log('Weekly top confessions published successfully');
//         } catch (error) {
//             this.logger.error('Failed to publish weekly top confessions', error);
//         }
//     }

//     // Every Sunday at 10:00 PM
//     @Cron('0 22 * * 0')
//     async publishWeeklyReport() {
//         this.logger.log('Running weekly analytics report task');
//         try {
//             // Generate weekly stats
//             const weeklyStats = await this.analyticsService.generateWeeklyStats();
            
//             // Generate report text
//             const reportText = await this.analyticsService.generateReportText(weeklyStats);
            
//             // Send report to confession channel
//             await this.sendChannelMessage(
//                 this.confessionChannelId,
//                 reportText
//             );
            
//             this.logger.log('Weekly report published successfully');
//         } catch (error) {
//             this.logger.error('Failed to publish weekly report', error);
//         }
//     }

//     private async sendChannelMessage(
//         channelId: string, 
//         content: string,
//         options: { threadTitle?: string } = {}
//     ): Promise<void> {
//         try {
//             const message = {
//                 channel_id: channelId,
//                 msg: { t: content },
//                 mentions: [],
//                 attachments: [],
//                 topic_id: options.threadTitle ? undefined : null,
//                 mention_everyone: false,
//                 code: 0
//             };

//             if (options.threadTitle) {
//                 // Create a thread with title
//                 message.msg['contentThread'] = {
//                     nt: options.threadTitle
//                 };
//             }

//             // Add message to queue
//             this.messageQueue.addMessage(message);
//         } catch (error) {
//             this.logger.error(`Error sending message to channel ${channelId}`, error);
//             throw error;
//         }
//     }
// }