import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TikTokCrawlerService } from './tiktok-crawler.service';
import { TikTokPostingService } from './tiktok-posting.service';

@Injectable()
export class TikTokScheduler {
    private readonly logger = new Logger(TikTokScheduler.name);

    constructor(
        private crawlerService: TikTokCrawlerService,
        private postingService: TikTokPostingService,
    ) {}

    /**
     * Crawl video TikTok hot mỗi 2 giờ
     */
    @Cron('0 0 */2 * * *', {
        name: 'crawl-tiktok',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleTikTokCrawling() {
        this.logger.log('🎵 Starting scheduled TikTok crawling...');
        try {
            const newVideos = await this.crawlerService.crawlHotVideosToday();
            this.logger.log(`✅ TikTok crawl completed: ${newVideos} new videos`);
        } catch (error) {
            this.logger.error(`❌ Error in TikTok crawling: ${error.message}`);
        }
    }

    /**
     * Đăng video TikTok hot nhất lúc 10h sáng, 3h chiều, 8h tối
     */
    @Cron('0 0 10,15,20 * * *', {
        name: 'post-tiktok-hot',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handlePostHottestVideo() {
        this.logger.log('🎬 Posting hottest TikTok video...');
        try {
            await this.postingService.postHottestVideo();
            this.logger.log('✅ TikTok video posted successfully');
        } catch (error) {
            this.logger.error(`❌ Error posting TikTok video: ${error.message}`);
        }
    }

    /**
     * Gửi tổng hợp TikTok lúc 9h tối mỗi ngày
     */
    @Cron('0 0 21 * * *', {
        name: 'tiktok-daily-summary',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handleDailySummary() {
        this.logger.log('📊 Sending TikTok daily summary...');
        try {
            await this.postingService.sendDailySummary();
            this.logger.log('✅ TikTok daily summary sent');
        } catch (error) {
            this.logger.error(`❌ Error sending summary: ${error.message}`);
        }
    }

    /**
     * Manual triggers
     */
    async triggerManualCrawl() {
        this.logger.log('🎵 Manual TikTok crawl triggered');
        return await this.crawlerService.crawlHotVideosToday();
    }

    async triggerManualPost() {
        this.logger.log('🎬 Manual TikTok post triggered');
        await this.postingService.postHottestVideo();
    }
}

