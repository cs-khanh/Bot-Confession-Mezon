import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';

@Command('about', {
    description: 'Information about the Mezon bot',
    usage: '!about',
    category: 'General',
    aliases: ['info'],
})
export class AboutCommand extends CommandMessage {
    execute(args: string[], message: ChannelMessage) {
        const messageContent = [
            '### 🤖 Mezon Bot Confession & News',
            '',
            '**Version:** 2.1.0',
            '**Cập nhật:** 10 tháng 10, 2025',
            '**Framework:** NestJS với TypeScript',
            '**Platform:** Mezon Chat',
            '',
            '### Tính năng:',
            '- ✅ **Confession ẩn danh:** Gửi và quản lý confession một cách ẩn danh',
            '- ✅ **Tin tức tự động:** Crawl và đăng tin tức từ các nguồn đáng tin cậy',
            '- ✅ **Nội dung TikTok:** Tìm kiếm và chia sẻ video TikTok thịnh hành',
            '- ✅ **Kiểm duyệt thông minh:** Lọc nội dung không phù hợp tự động',
            '- ✅ **Hệ thống phân tích:** Thống kê về confession và tin tức',
            '',
            '### Phát triển bởi Team:',
                '- Phạm Gia Khánh',
                '- Nguyễn Thành Trọng',
                '- Nguyễn Minh Phúc',
            '',
            '### Liên hệ & Hỗ trợ:',
            '- **Email:** support@mezon-bot.vn',
            '- **Repository:** https://github.com/cs-khanh/Bot-Confession-Mezon.git',
            '',
            '### Lưu ý:',
            '⚠️ Bot đang được phát triển liên tục. Vui lòng dùng lệnh `!check join` khi vừa cài đặt bot hoặc thay đổi cấu hình channel để đảm bảo hoạt động tốt nhất.',
            '                                    ',
        ].join('\n');

        return this.replyMessageGenerate({
            messageContent,
            mk: [{ type: 'pre', s: 0, e: messageContent.length }],
        }, message);
    }
}
