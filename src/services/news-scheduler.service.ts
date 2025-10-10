import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsCrawlerService } from './news-crawler.service';
import { NewsPostingService } from './news-posting.service';
import { NewsService } from './news.service';
import { MezonClientService } from './mezon-client.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsScheduler {
    private readonly logger = new Logger(NewsScheduler.name);
    private crawlErrors: string[] = [];

    constructor(
        private crawlerService: NewsCrawlerService,
        private postingService: NewsPostingService,
        private newsService: NewsService,
        private mezonClient: MezonClientService,
        private configService: ConfigService,
    ) {}

    /**
     * Crawl tin tức mỗi 30 phút
     */
    @Cron('0 */30 * * * *', {
        name: 'crawl-news',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleNewsCrawling() {
        this.logger.log('Starting scheduled news crawling...');
        
        const countBefore = await this.newsService.getUnpostedNews(10000);
        const countBeforeTotal = countBefore.length;
        
        try {
            await this.crawlerService.crawlAllSources();
            
            const countAfter = await this.newsService.getUnpostedNews(10000);
            const countAfterTotal = countAfter.length;
            const newArticles = countAfterTotal - countBeforeTotal;
            
            this.logger.log('Scheduled news crawling completed');
            
            // Gửi báo cáo vào channel
            await this.sendCrawlReport(newArticles, countAfterTotal);
        } catch (error) {
            this.logger.error(`Error in scheduled news crawling: ${error.message}`);
            await this.sendCrawlReport(0, 0, error.message);
        }
    }
    
    /**
     * Gửi báo cáo crawl vào channel mặc định
     */
    private async sendCrawlReport(newArticles: number, totalUnposted: number, errorMessage?: string) {
        const defaultChannelId = this.configService.get<string>('NEWS_CHANNEL_ID');
        this.logger.debug(`🔍 DEBUG: Trying to send crawl report to channel: ${defaultChannelId}`);
        
        if (!defaultChannelId) {
            this.logger.warn('⚠️ NEWS_CHANNEL_ID not configured, skipping crawl report');
            return;
        }
        
        try {
            const currentTime = new Date().toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
            });
            
            let reportContent = `### 🤖 Báo Cáo Crawl Tin - ${currentTime}\n\n`;
            
            if (errorMessage) {
                reportContent += `❌ #### Lỗi: ${errorMessage}\n`;
            } else {
                reportContent += `#### ✅ Crawl thành công!\n\n`;
                reportContent += `📰 Tin mới: ${newArticles} bài\n`;
                reportContent += `📊 Tổng chưa đăng: ${totalUnposted} bài\n`;
                
                // Thêm thông tin theo category
                const categories = await this.newsService.getAllCategories();
                if (categories.length > 0) {
                    reportContent += `\n#### Phân loại:\n`;
                    for (const category of categories) {
                        const news = await this.newsService.getUnpostedNewsByCategory(category, 1000);
                        if (news.length > 0) {
                            reportContent += `• ${category}: ${news.length} bài\n`;
                        }
                    }
                }
            }
            
            await this.mezonClient.sendMessage({
                channel_id: defaultChannelId,
                msg: {
                    t: reportContent,
                },
                code: 0,
            });
        } catch (error) {
            this.logger.error(`Error sending crawl report: ${error.message}`);
        }
    }

    /**
     * Đăng tin lúc 8h sáng, 12h trưa, 4h chiều mỗi ngày
     */
    @Cron('0 0 8,12,16 * * *', {
        name: 'post-news',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleNewsPosting() {
        this.logger.log('Starting scheduled news posting...');
        try {
            await this.postingService.postUnpostedNews();
            this.logger.log('Scheduled news posting completed');
        } catch (error) {
            this.logger.error(`Error in scheduled news posting: ${error.message}`);
        }
    }

    /**
     * Gửi tổng hợp tin tức lúc 8h sáng và 6h chiều
     */
    @Cron('0 0 8,18 * * *', {
        name: 'daily-summary',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleDailySummary() {
        this.logger.log('Starting daily news summary...');
        try {
            await this.postingService.sendDailySummary();
            this.logger.log('Daily news summary sent');
        } catch (error) {
            this.logger.error(`Error sending daily summary: ${error.message}`);
        }
    }

    /**
     * Xóa tin cũ (hơn 30 ngày) mỗi ngày lúc 2h sáng
     */
    @Cron('0 0 2 * * *', {
        name: 'cleanup-old-news',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleCleanup() {
        this.logger.log('Starting cleanup of old news...');
        try {
            const deleted = await this.newsService.deleteOldNews(30);
            this.logger.log(`Cleanup completed: ${deleted} old news deleted`);
        } catch (error) {
            this.logger.error(`Error in cleanup: ${error.message}`);
        }
    }

    /**
     * Crawl ngay lập tức (manual trigger)
     */
    async triggerManualCrawl() {
        this.logger.log('Manual crawl triggered');
        await this.crawlerService.crawlAllSources();
    }

    /**
     * Post ngay lập tức (manual trigger)
     */
    async triggerManualPost() {
        this.logger.log('Manual post triggered');
        await this.postingService.postUnpostedNews();
    }
}


