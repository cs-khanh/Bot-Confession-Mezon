import { CommandMessage } from '@app/command/common/command.abstract';
import { Command } from '@app/decorators/command.decorator';
import { NewsScheduler } from '@app/services/news-scheduler.service';
import { NewsService } from '@app/services/news.service';
import { ChannelMessage } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';

@Command('news', {
    description: 'Quản lý tin tức',
    usage: '!news <crawl|post|status>',
    category: 'News',
    permissions: ['admin'],
})
@Injectable()
export class NewsCommand extends CommandMessage {
    constructor(
        private newsScheduler: NewsScheduler,
        private newsService: NewsService,
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'crawl':
                return await this.handleCrawl(message);
            case 'post':
                return await this.handlePost(message);
            case 'status':
                return await this.handleStatus(message);
            case 'clear':
                return await this.handleDelete(message);
            default:
                return this.replyMessageGenerate(
                    {
                        messageContent: `### 📰 Lệnh Tin Tức\n\n` +
                            `#### Cách dùng:\n` +
                            `• \`!news crawl\` - Crawl tin tức ngay\n` +
                            `• \`!news post\` - Đăng tin tức chưa post\n` +
                            `• \`!news status\` - Xem thống kê tin tức\n` +
                            `• \`!news clear\` - Xóa tất cả tin tức\n\n` +
                            `#### Lịch tự động:\n` +
                            `• Crawl: Mỗi 30 phút\n` +
                            `• Post: 8h sáng, 12h trưa, 4h chiều\n` +
                            `• Tổng hợp: 8h sáng & 6h chiều\n` +
                            `• Dọn dẹp: 2h sáng hàng ngày`,
                    },
                    message,
                );
        }
    }

    private async handleCrawl(message: ChannelMessage) {
        try {
            // Trigger crawl với thông tin reply
            await this.newsScheduler.triggerManualCrawl({
                channelId: message.channel_id,
                messageId: message.message_id,
            });

            // Không cần reply ở đây vì triggerManualCrawl sẽ tự reply
            return;
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi crawl tin: ${error.message}`,
                },
                message,
            );
        }
    }

    private async handlePost(message: ChannelMessage) {
        try {
            const unpostedBefore = await this.newsService.getUnpostedNews(1000);

            await this.replyMessageGenerate(
                {
                    messageContent: `📤 Đang đăng ${unpostedBefore.length} tin tức...`,
                },
                message,
            );

            await this.newsScheduler.triggerManualPost();

            const unpostedAfter = await this.newsService.getUnpostedNews(1000);
            const posted = unpostedBefore.length - unpostedAfter.length;

            let responseMessage = `### ✅ Đăng tin hoàn tất!\n\n` +
                `📝 Đã đăng: ${posted} bài\n` +
                `📰 Còn lại: ${unpostedAfter.length} bài`;
                
            // Nếu không có bài nào được đăng, có thể là vấn đề quyền truy cập channel
            if (posted === 0 && unpostedBefore.length > 0) {
                responseMessage += `\n\n⚠️ **Lưu ý**: Không có bài nào được đăng thành công. Có thể bot chưa tham gia vào các channel.\n`;
                responseMessage += `Hãy thử sử dụng lệnh \`!check join\` để bot tham gia vào các channel và thử lại.`;
            }

            return this.replyMessageGenerate(
                {
                    messageContent: responseMessage,
                },
                message,
            );
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi đăng tin: ${error.message}\n\n` +
                        `Nếu lỗi liên quan đến việc không thể gửi tin nhắn vào channel, ` +
                        `hãy thử sử dụng lệnh \`!check join\` để bot tham gia vào các channel và thử lại.`,
                },
                message,
            );
        }
    }

    private async handleStatus(message: ChannelMessage) {
        try {
            const categories = await this.newsService.getAllCategories();
            const total = await this.newsService.countAll();
            const posted = await this.newsService.countPosted();
            const unposted = await this.newsService.countUnposted();

            let statusMessage = `### 📊 Thống Kê Tin Tức\n\n`;
            statusMessage += `📰 **Tổng số tin**: ${total} bài\n`;
            statusMessage += `✅ Đã đăng: ${posted} bài\n`;
            statusMessage += `📝 Chưa đăng: ${unposted} bài\n\n`;
            statusMessage += `#### Phân loại theo chủ đề (chưa đăng):\n`;

            for (const category of categories) {
                const categoryNews = await this.newsService.getUnpostedNewsByCategory(category, 1000);
                if (categoryNews.length > 0) {
                    statusMessage += `• ${category}: ${categoryNews.length} bài\n`;
                }
            }

            return this.replyMessageGenerate(
                {
                    messageContent: statusMessage,
                },
                message,
            );
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi lấy thống kê: ${error.message}`,
                },
                message,
            );
        }
    }

    private async handleDelete(message: ChannelMessage) {
        try {
            const totalCount = await this.newsService.countAll();
            const postedCount = await this.newsService.countPosted();
            const unpostedCount = await this.newsService.countUnposted();
            
            if (totalCount === 0) {
                return this.replyMessageGenerate(
                    {
                        messageContent: `ℹ️ Không có tin tức nào trong database.`,
                    },
                    message,
                );
            }

            await this.replyMessageGenerate(
                {
                    messageContent: `🗑️ Đang xóa ${totalCount} tin tức...\n` +
                        `(Đã đăng: ${postedCount}, Chưa đăng: ${unpostedCount})`,
                },
                message,
            );

            const deleted = await this.newsService.deleteAll();

            return this.replyMessageGenerate(
                {
                    messageContent: `### ✅ Xóa tin tức hoàn tất!\n\n` +
                        `🗑️ Đã xóa: ${deleted} tin tức\n` +
                        `📝 Trong đó:\n` +
                        `• Đã đăng: ${postedCount} bài\n` +
                        `• Chưa đăng: ${unpostedCount} bài`,
                },
                message,
            );
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi xóa tin: ${error.message}`,
                },
                message,
            );
        }
    }
}

