import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClientService } from './mezon-client.service';
import { NewsService } from './news.service';
import { News } from '@app/entities/news.entity';
import * as fs from 'fs';
import * as path from 'path';

interface ChannelsConfig {
    channels: {
        default: string;
        categories: Record<string, string>;
    };
}

@Injectable()
export class NewsPostingService {
    private readonly logger = new Logger(NewsPostingService.name);
    private readonly defaultChannelId: string;
    private channelsConfig: ChannelsConfig | null = null;

    // Emoji icons cho các chủ đề
    private readonly categoryEmojis: Record<string, string> = {
        'Công Nghệ': '💻',
        'Kinh Doanh': '💼',
        'Giải Trí': '🎬',
        'Thể Thao': '⚽',
        'Đời Sống': '🌸',
        'Giáo Dục': '📚',
        'Sức Khỏe': '🏥',
        'Du Lịch': '✈️',
        'Tổng hợp': '📰',
    };

    constructor(
        private configService: ConfigService,
        private mezonClient: MezonClientService,
        private newsService: NewsService,
    ) {
        this.defaultChannelId = this.configService.get<string>('NEWS_CHANNEL_ID') || '';
        this.loadChannelsConfig();
    }

    /**
     * Load channels config từ JSON file
     */
    private loadChannelsConfig(): void {
        try {
            const configPath = path.join(process.cwd(), 'channels-config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf-8');
                this.channelsConfig = JSON.parse(configData);
                this.logger.log('Loaded channels config from channels-config.json');
            } else {
                this.logger.warn('channels-config.json not found, using default channel for all categories');
            }
        } catch (error) {
            this.logger.error(`Error loading channels config: ${error.message}`);
        }
    }

    /**
     * Lấy channel ID cho category
     */
    private getChannelIdForCategory(category: string): string {
        this.logger.debug(`Getting channel ID for category: ${category}`);
        
        if (this.channelsConfig?.channels?.categories?.[category]) {
            this.logger.debug(`Found dedicated channel for ${category}: ${this.channelsConfig.channels.categories[category]}`);
            return this.channelsConfig.channels.categories[category];
        }
        
        // Fallback to default channel from config file or env
        if (this.channelsConfig?.channels?.default) {
            this.logger.debug(`Using default channel from config: ${this.channelsConfig.channels.default}`);
            return this.channelsConfig.channels.default;
        }
        
        this.logger.debug(`Using default channel from env: ${this.defaultChannelId}`);
        return this.defaultChannelId;
    }

    /**
     * Đăng tất cả tin chưa post theo categories
     */
    async postUnpostedNews(): Promise<void> {
        if (!this.defaultChannelId && !this.channelsConfig) {
            this.logger.warn('No channel configuration found, skipping news posting');
            return;
        }

        this.logger.log('Starting to post unposted news...');

        try {
            const categories = await this.newsService.getAllCategories();
            this.logger.log(`Found ${categories.length} categories: ${categories.join(', ')}`);

            if (categories.length === 0) {
                this.logger.warn('No categories found, nothing to post');
                return;
            }

            for (const category of categories) {
                this.logger.log(`Processing category: ${category}`);
                await this.postNewsByCategory(category);
            }

            this.logger.log('Finished posting unposted news');
        } catch (error) {
            this.logger.error(`Error posting news: ${error.message}`);
            this.logger.error(error.stack);
        }
    }

    /**
     * Đăng tin theo category (tạo thread riêng)
     */
    async postNewsByCategory(category: string, limit: number = 5): Promise<void> {
        try {
            this.logger.log(`Getting news for category: ${category} with limit: ${limit}`);
            const news = await this.newsService.getUnpostedNewsByCategory(category, limit);
            this.logger.log(`Found ${news.length} unposted news for category: ${category}`);

            if (news.length === 0) {
                this.logger.log(`No unposted news for category: ${category}`);
                return;
            }

            // Lấy channel ID cho category này
            const channelId = this.getChannelIdForCategory(category);
            this.logger.log(`Channel ID for ${category}: ${channelId}`);
            
            if (!channelId) {
                this.logger.warn(`No channel configured for category: ${category}`);
                return;
            }

            this.logger.log(`Posting ${news.length} news for category: ${category} to channel: ${channelId}`);

            // Tạo thread message cho category
            const emoji = this.categoryEmojis[category] || '📰';
            const threadTitle = `### 🧵 ${emoji} ${category} - ${new Date().toLocaleDateString('vi-VN')}`;

            // Kiểm tra truy cập channel trước khi gửi
            try {
                // Gửi thread header
                const threadMessage = await this.mezonClient.sendMessage({
                    channel_id: channelId,
                    msg: {
                        t: threadTitle,
                    },
                    code: 0,
                });

                if (!threadMessage) {
                    this.logger.error(`Failed to create thread for ${category} in channel ${channelId}`);
                    return;
                }

                // Đợi một chút để thread được tạo
                await this.sleep(1000);

                // Đăng từng tin vào thread
                for (const article of news) {
                    try {
                        await this.postArticleToThread(article, threadMessage, channelId);
                        await this.newsService.markAsPosted(article.id);
                        await this.sleep(500); // Delay giữa các tin
                    } catch (error) {
                        this.logger.error(`Error posting article ${article.id}: ${error.message}`);
                    }
                }
            } catch (channelError) {
                this.logger.error(`Error accessing channel ${channelId} for ${category}: ${channelError.message}`);
                this.logger.warn('Please ensure bot has joined this channel. Use !check join command to join channels.');
            }            this.logger.log(`Successfully posted ${news.length} articles for ${category}`);
        } catch (error) {
            this.logger.error(`Error posting category ${category}: ${error.message}`);
        }
    }

    /**
     * Đăng một bài viết vào thread
     */
    private async postArticleToThread(article: News, threadMessage: any, channelId: string): Promise<void> {
        try {
            // Format tin tức
            const emoji = this.categoryEmojis[article.category] || '📰';
            
            let messageContent = `#### ${emoji} ${article.title}\n\n`;
            messageContent += `📝 ${article.summary}\n\n`;
            messageContent += `🔗 [Đọc thêm](${article.link})\n`;
            messageContent += `📰 Nguồn: ${article.source}`;

            // Gửi message reply vào thread
            await this.mezonClient.sendMessage({
                channel_id: channelId,
                message_id: threadMessage?.message_id,
                ref: [threadMessage?.message_id],
                msg: {
                    t: messageContent,
                },
                code: 0,
            });

            this.logger.log(`Posted article: ${article.title}`);
        } catch (error) {
            this.logger.error(`Error posting article to thread: ${error.message}`);
            throw error;
        }
    }

    /**
     * Đăng tin nổi bật (không theo thread)
     */
    async postBreakingNews(article: News): Promise<void> {
        const channelId = this.getChannelIdForCategory(article.category);
        if (!channelId) {
            this.logger.warn('No channel configured for breaking news');
            return;
        }

        try {
            const emoji = this.categoryEmojis[article.category] || '📰';
            
            let messageContent = `### 🔥 TIN NỔI BẬT 🔥\n\n`;
            messageContent += `#### ${emoji} ${article.title}\n\n`;
            messageContent += `📝 ${article.summary}\n\n`;
            messageContent += `🔗 [Đọc thêm](${article.link})\n`;
            messageContent += `📰 Nguồn: ${article.source}`;

            await this.mezonClient.sendMessage({
                channel_id: channelId,
                msg: {
                    t: messageContent,
                },
                code: 0,
            });

            await this.newsService.markAsPosted(article.id);
            this.logger.log(`Posted breaking news: ${article.title}`);
        } catch (error) {
            this.logger.error(`Error posting breaking news: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gửi tổng hợp tin trong ngày
     */
    async sendDailySummary(): Promise<void> {
        const channelId = this.channelsConfig?.channels?.default || this.defaultChannelId;
        if (!channelId) {
            this.logger.warn('No default channel configured for daily summary');
            return;
        }

        try {
            const categories = await this.newsService.getAllCategories();
            const today = new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            let summaryContent = `### 📰 TỔNG HỢP TIN TỨC - ${today}\n\n`;

            for (const category of categories) {
                const news = await this.newsService.getNewsByCategory(category, 3);
                if (news.length > 0) {
                    const emoji = this.categoryEmojis[category] || '📰';
                    summaryContent += `#### ${emoji} ${category}\n`;
                    
                    news.forEach((article, index) => {
                        summaryContent += `${index + 1}. [${article.title}](${article.link})\n`;
                    });
                    
                    summaryContent += `\n`;
                }
            }

            summaryContent += `\n💡 _Cập nhật tin tức mới nhất mỗi ngày!_`;

            await this.mezonClient.sendMessage({
                channel_id: channelId,
                msg: {
                    t: summaryContent,
                },
                code: 0,
            });

            this.logger.log('Sent daily summary');
        } catch (error) {
            this.logger.error(`Error sending daily summary: ${error.message}`);
        }
    }

    /**
     * Helper function để delay
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


