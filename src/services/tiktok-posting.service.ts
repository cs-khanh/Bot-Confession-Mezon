import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TikTokService } from './tiktok.service';
import { MezonClientService } from './mezon-client.service';

@Injectable()
export class TikTokPostingService {
    private readonly logger = new Logger(TikTokPostingService.name);

    constructor(
        private tiktokService: TikTokService,
        private mezonClient: MezonClientService,
        private configService: ConfigService,
    ) {}

    /**
     * Đăng video TikTok hot nhất chưa đăng
     */
    async postHottestVideo(): Promise<void> {
        const channelId = this.configService.get<string>('TIKTOK_CHANNEL_ID');
        
        if (!channelId || channelId === 'your_channel_id_here') {
            this.logger.warn('⚠️ TIKTOK_CHANNEL_ID not configured, skipping post');
            return;
        }

        try {
            const video = await this.tiktokService.getHottestVideoToday();
            
            if (!video) {
                this.logger.log('📭 No unposted TikTok videos available');
                return;
            }

            this.logger.log(`🎬 Posting hottest TikTok video: ${video.title}`);

            // Format message
            const messageContent = this.formatVideoMessage(video);

            // Gửi message
            await this.mezonClient.sendMessage({
                channel_id: channelId,
                msg: {
                    t: messageContent,
                },
            });

            // Đánh dấu đã đăng
            await this.tiktokService.markAsPosted(video.videoId);

            this.logger.log(`✅ Posted TikTok video: ${video.title}`);

        } catch (error) {
            this.logger.error(`Error posting TikTok video: ${error.message}`);
            throw error;
        }
    }

    /**
     * Đăng top N video hot nhất
     */
    async postTopVideos(count: number = 5): Promise<number> {
        const channelId = this.configService.get<string>('TIKTOK_CHANNEL_ID');
        
        if (!channelId || channelId === 'your_channel_id_here') {
            this.logger.warn('⚠️ TIKTOK_CHANNEL_ID not configured');
            return 0;
        }

        try {
            const videos = await this.tiktokService.getUnpostedVideos(count);
            
            if (videos.length === 0) {
                this.logger.log('📭 No unposted TikTok videos');
                return 0;
            }

            this.logger.log(`🎬 Posting ${videos.length} TikTok videos...`);

            let postedCount = 0;

            for (const video of videos) {
                try {
                    const messageContent = this.formatVideoMessage(video);
                    await this.mezonClient.sendMessage({
                        channel_id: channelId,
                        msg: {
                            t: messageContent,
                        },
                    });
                    await this.tiktokService.markAsPosted(video.videoId);
                    postedCount++;
                    
                    // Delay giữa các post để tránh spam
                    await this.delay(2000);

                } catch (error) {
                    this.logger.error(`Error posting video ${video.videoId}: ${error.message}`);
                }
            }

            this.logger.log(`✅ Posted ${postedCount}/${videos.length} TikTok videos`);
            return postedCount;

        } catch (error) {
            this.logger.error(`Error in postTopVideos: ${error.message}`);
            return 0;
        }
    }

    /**
     * Gửi tổng hợp video hot trong ngày
     */
    async sendDailySummary(): Promise<void> {
        const channelId = this.configService.get<string>('TIKTOK_CHANNEL_ID');
        
        if (!channelId || channelId === 'your_channel_id_here') {
            return;
        }

        try {
            const stats = await this.tiktokService.getStats();
            const topVideos = await this.tiktokService.getUnpostedVideos(10);

            const currentTime = new Date().toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                dateStyle: 'full',
                timeStyle: 'short',
            });

            let message = `### 🎵 TikTok Daily Summary - ${currentTime}\n\n`;
            message += `#### 📊 Thống Kê:\n`;
            message += `• Tổng video: ${stats.total}\n`;
            message += `• Chưa đăng: ${stats.unposted}\n`;
            message += `• Đã đăng: ${stats.posted}\n\n`;

            if (topVideos.length > 0) {
                message += `#### 🔥 Top ${topVideos.length} Video Hot Nhất:\n\n`;
                
                topVideos.forEach((video, index) => {
                    message += `##### ${index + 1}. ${video.title}\n`;
                    message += `👤 @${video.authorUsername}\n`;
                    message += `❤️ ${this.formatNumber(video.likeCount)} | `;
                    message += `👀 ${this.formatNumber(video.viewCount)} | `;
                    message += `🔗 ${video.videoUrl}\n\n`;
                });
            } else {
                message += `📭 Chưa có video nào trong ngày\n`;
            }

            await this.mezonClient.sendMessage({
                channel_id: channelId,
                msg: {
                    t: message,
                },
            });

            this.logger.log('✅ TikTok daily summary sent');

        } catch (error) {
            this.logger.error(`Error sending TikTok summary: ${error.message}`);
        }
    }

    /**
     * Format video message để đăng
     */
    private formatVideoMessage(video: any): string {
        const title = video.title || 'Untitled Video';
        const author = video.authorDisplayName || video.authorUsername;
        
        let message = `### 🔥 Video TikTok Hot 🎵\n\n`;
        message += `#### 📱 ${title}\n\n`;
        message += `👤 Tác giả: @${video.authorUsername} (${author})\n\n`;
        message += `#### 📊 Thống Kê:\n`;
        message += `• ❤️ Like: ${this.formatNumber(video.likeCount)}\n`;
        message += `• 👀 View: ${this.formatNumber(video.viewCount)}\n`;
        message += `• 🔄 Share: ${this.formatNumber(video.shareCount)}\n`;
        message += `• 💬 Comment: ${this.formatNumber(video.commentCount)}\n`;
        message += `• 🔥 Hot Score: ${this.formatNumber(video.hotScore)}\n\n`;
        message += `#### 🔗 Link: ${video.videoUrl}\n`;

        return message;
    }

    /**
     * Format số lớn (1000 -> 1K, 1000000 -> 1M)
     */
    private formatNumber(num: number): string {
        const n = Number(num);
        if (n >= 1000000) {
            return (n / 1000000).toFixed(1) + 'M';
        }
        if (n >= 1000) {
            return (n / 1000).toFixed(1) + 'K';
        }
        return n.toString();
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

