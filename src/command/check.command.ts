import { CommandMessage } from '@app/command/common/command.abstract';
import { Command } from '@app/decorators/command.decorator';
import { ChannelCheckerService } from '@app/utils/channel-checker';
import { ChannelJoinerService } from '@app/utils/channel-joiner';
import { ChannelMessage } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';

@Command('check', {
    description: 'Kiểm tra và quản lý quyền truy cập channel',
    usage: '!check <channels|join>',
    category: 'Admin',
    permissions: ['admin'],
})
@Injectable()
export class CheckCommand extends CommandMessage {
    constructor(
        private channelChecker: ChannelCheckerService,
        private channelJoiner: ChannelJoinerService,
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'channels':
                return await this.handleCheckChannels(message);
            case 'join':
                return await this.handleJoinChannels(message);
            default:
                return this.replyMessageGenerate(
                    {
                        messageContent: `### ⚙️ Lệnh kiểm tra và quản lý kênh\n\n` +
                            `#### Cách dùng:\n` +
                            `• \`!check channels\` - Kiểm tra quyền truy cập các channel\n` +
                            `• \`!check join\` - Tham gia vào các channel được cấu hình\n`,
                    },
                    message,
                );
        }
    }

    private async handleCheckChannels(message: ChannelMessage) {
        await this.replyMessageGenerate(
            {
                messageContent: '🔍 Đang kiểm tra quyền truy cập các channel...',
            },
            message,
        );

        try {
            await this.channelChecker.checkChannelAccess();
            
            return this.replyMessageGenerate(
                {
                    messageContent: '✅ Kiểm tra hoàn tất, vui lòng xem logs để biết chi tiết.',
                },
                message,
            );
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi kiểm tra: ${error.message}`,
                },
                message,
            );
        }
    }

    private async handleJoinChannels(message: ChannelMessage) {
        await this.replyMessageGenerate(
            {
                messageContent: '🔄 Đang tham gia vào các channel được cấu hình...',
            },
            message,
        );

        try {
            const results = await this.channelJoiner.joinAllChannels();
            
            // Tạo báo cáo chi tiết
            let reportContent = `### ✅ Kết quả tham gia channel\n\n`;
            reportContent += `Thành công: ${results.success} | Thất bại: ${results.failed}\n\n`;
            
            if (results.channels.length > 0) {
                reportContent += `#### Chi tiết:\n`;
                for (const channel of results.channels) {
                    const icon = channel.status.includes('success') ? '✅' : '❌';
                    reportContent += `${icon} **${channel.name}** (${channel.id}): ${channel.status}\n`;
                }
            }
            
            return this.replyMessageGenerate(
                {
                    messageContent: reportContent,
                },
                message,
            );
        } catch (error) {
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Lỗi khi tham gia channel: ${error.message}`,
                },
                message,
            );
        }
    }
}