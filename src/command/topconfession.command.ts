import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { ConfessionService } from '@app/services/confession.service';
import { Injectable, Logger } from '@nestjs/common';
import { addWeeks, format, startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
@Command('topconfession', {
    description: 'Hiển thị top confessions của tuần hiện tại hoặc tuần trước',
    usage: '!topconfession [week]',
    category: 'Confession',
    aliases: ['top', 'topcf'],
    permissions: ['admin'],
})
export class TopConfessionCommand extends CommandMessage {
    private readonly logger = new Logger(TopConfessionCommand.name);

    constructor(private confessionService: ConfessionService) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        try {
        // === Xác định tuần ===
        let weekOffset = 0;
        if (args.length > 0) {
            const requestedWeek = parseInt(args[0]);
            if (!isNaN(requestedWeek) && requestedWeek <= 0) weekOffset = requestedWeek;
        }

        const targetDate = addWeeks(new Date(), weekOffset);
        const startDate = startOfWeek(targetDate, { weekStartsOn: 1 });
        const endDate = endOfWeek(targetDate, { weekStartsOn: 1 });
        const dateRange = `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM/yyyy')}`;

        // === Lấy top confession ===
        const topConfessions = await this.confessionService.getTopConfessionsWithReactionDetails({
            startDate,
            endDate,
            limit: 5,
        });

        if (!topConfessions?.length) {
            return this.replyMessageGenerate(
            { messageContent: `Không tìm thấy confession nào trong tuần ${dateRange}.` },
            message,
            );
        }

        // === Xây dựng nội dung ===
        const lines: string[] = [`🏆 #### Top Confessions (${dateRange})`, ''];

        for (const [index, cf] of topConfessions.entries()) {
            const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
            const reactionBadge = cf.reactionCount > 10 ? '🔥' : cf.reactionCount > 5 ? '⭐' : '❤️';
            const cfNo = cf.confessionNumber ? ` (#${cf.confessionNumber})` : '';

            lines.push(`${rank} #### Confession${cfNo} - ${cf.reactionCount} ${reactionBadge}`);
            lines.push(`"${cf.content}"`);

            if (cf.postedAt) lines.push(`*Đăng ngày: ${format(cf.postedAt, 'dd/MM/yyyy')}*`);

            // Lấy chi tiết reaction
            const details = await this.confessionService.getReactionDetailsByConfessionId(cf.id);
            const valid = Object.entries(details)
            .filter(([_, c]) => (c as number) > 0)
            .sort((a, b) => (b[1] as number) - (a[1] as number));

            if (valid.length) {
            const formatted = valid
                .map(([emoji, count]) => {
                const n = typeof count === 'number' ? count : parseInt(count as any);
                switch (emoji) {
                    case '+1': return `👍 ${n}`;
                    case '-1': return `👎 ${n}`;
                    case 'heart': case '❤️': return `❤️ ${n}`;
                    case 'fire': return `🔥 ${n}`;
                    case 'clap': return `👏 ${n}`;
                    case 'star': return `⭐ ${n}`;
                    default:
                    if (emoji.startsWith(':') && emoji.endsWith(':')) return `${emoji} ${n}`;
                    const match = emoji.match(/<:([^:]+):/);
                    return match ? `:${match[1]}: ${n}` : `${emoji} ${n}`;
                }
                })
                .join(' • ');
            lines.push(`*Reactions: ${formatted}*`);
            if (valid.length > 1)
                lines.push(`*${valid.length} loại reaction khác nhau*`);
            }

            lines.push('');
        }

        const msg = lines.join('\n');
        return this.replyMessageGenerate(
            {
            messageContent: msg,
            mk: [{ type: 'pre', s: 0, e: msg.length }],
            },
            message,
        );
        } catch (error) {
        this.logger.error('Error getting top confessions', error);
        return this.replyMessageGenerate(
            { messageContent: '❌ Lỗi khi truy xuất top confession. Vui lòng thử lại sau.' },
            message,
        );
        }
    }
}
