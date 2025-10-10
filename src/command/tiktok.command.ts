import { Injectable } from '@nestjs/common';
import { CommandMessage } from './common/command.abstract';
import { Command } from '@app/decorators/command.decorator';
import { TikTokScheduler } from '../services/tiktok-scheduler.service';
import { TikTokService } from '../services/tiktok.service';
import { ChannelMessage } from 'mezon-sdk';

@Command('tiktok', {
    description: 'Quản lý TikTok video hot',
    usage: '!tiktok <crawl|post|status>',
    category: 'TikTok',
    permissions: ['admin'],
})
@Injectable()
export class TikTokCommand extends CommandMessage {
    constructor(
        private tiktokScheduler: TikTokScheduler,
        private tiktokService: TikTokService,
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage): Promise<string> {
        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'crawl':
                return await this.handleCrawl();
            
            case 'post':
                return await this.handlePost();
            
            case 'status':
            case 'stats':
                return await this.handleStatus();
            
            case 'help':
            default:
                return this.showHelp();
        }
    }

    private async handleCrawl(): Promise<string> {
        try {
            const newVideos = await this.tiktokScheduler.triggerManualCrawl();
            
            return `### 🎵 TikTok Crawl Hoàn Tất!\n\n` +
                   `✅ Đã crawl: ${newVideos} video mới\n\n` +
                   `📌 Dùng \`!tiktok post\` để đăng video hot nhất`;
        } catch (error) {
            return `### ❌ Lỗi khi crawl TikTok:\n${error.message}`;
        }
    }

    private async handlePost(): Promise<string> {
        try {
            await this.tiktokScheduler.triggerManualPost();
            
            return `### ✅ Đã đăng video TikTok hot nhất! 🔥`;
        } catch (error) {
            return `### ❌ Lỗi khi đăng video:\n${error.message}`;
        }
    }

    private async handleStatus(): Promise<string> {
        try {
            const stats = await this.tiktokService.getStats();
            const hottestVideo = await this.tiktokService.getHottestVideoToday();

            let statusMsg = `### 📊 Trạng Thái TikTok Bot\n\n`;
            statusMsg += `#### 📹 Thống Kê Video:\n`;
            statusMsg += `• Tổng cộng: ${stats.total} video\n`;
            statusMsg += `• Chưa đăng: ${stats.unposted} video\n`;
            statusMsg += `• Đã đăng: ${stats.posted} video\n\n`;

            if (hottestVideo) {
                statusMsg += `#### 🔥 Video Hot Nhất (chưa đăng):\n`;
                statusMsg += `• Tiêu đề: ${hottestVideo.title}\n`;
                statusMsg += `• Tác giả: @${hottestVideo.authorUsername}\n`;
                statusMsg += `• ❤️ Like: ${this.formatNumber(hottestVideo.likeCount)}\n`;
                statusMsg += `• 👀 View: ${this.formatNumber(hottestVideo.viewCount)}\n`;
                statusMsg += `• 🔥 Hot Score: ${this.formatNumber(hottestVideo.hotScore)}\n`;
            } else {
                statusMsg += `📭 Chưa có video nào chưa đăng\n`;
            }

            statusMsg += `\n#### 📅 Lịch Tự Động:\n`;
            statusMsg += `• Crawl: Mỗi 2 giờ\n`;
            statusMsg += `• Post: 10h sáng, 3h chiều, 8h tối\n`;
            statusMsg += `• Tổng hợp: 9h tối mỗi ngày\n`;

            return statusMsg;
        } catch (error) {
            return `### ❌ Lỗi khi lấy trạng thái:\n${error.message}`;
        }
    }

    private showHelp(): Promise<string> {
        const helpMsg = `### 🎵 TikTok Bot - Hướng Dẫn Sử Dụng\n\n` +
            `#### 📝 Các Lệnh:\n\n` +
            `• \`!tiktok crawl\` - Crawl video TikTok hot ngay\n` +
            `• \`!tiktok post\` - Đăng video hot nhất\n` +
            `• \`!tiktok status\` - Xem trạng thái & thống kê\n` +
            `• \`!tiktok help\` - Hiển thị trợ giúp này\n\n` +
            `#### ⏰ Lịch Tự Động:\n` +
            `• Crawl: Mỗi 2 giờ\n` +
            `• Post: 10h sáng, 3h chiều, 8h tối mỗi ngày\n` +
            `• Tổng hợp: 9h tối mỗi ngày\n\n` +
            `#### 💡 Lưu Ý:\n` +
            `• Cần cấu hình TIKTOK_ACCESS_TOKEN trong .env\n` +
            `• Cần cấu hình TIKTOK_CHANNEL_ID để đăng video\n`;

        return Promise.resolve(helpMsg);
    }

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
}

