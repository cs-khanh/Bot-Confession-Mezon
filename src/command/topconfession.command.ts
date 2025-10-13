import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { ConfessionService } from '@app/services/confession.service';
import { Injectable, Logger } from '@nestjs/common';
import { addWeeks, format, startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
@Command('topconfession', {
    description: 'Show top confessions of the current or previous week',
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
            // Default to current week
            let weekOffset = 0;
            
            // Check if a specific week was requested (e.g., -1 for previous week)
            if (args.length > 0) {
                const requestedWeek = parseInt(args[0]);
                if (!isNaN(requestedWeek) && requestedWeek <= 0) {
                    weekOffset = requestedWeek;
                }
            }
            
            const targetDate = addWeeks(new Date(), weekOffset);
            const startDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
            const endDate = endOfWeek(targetDate, { weekStartsOn: 1 });     // Sunday
            
            // Get top confessions with reaction details
            const topConfessions = await this.confessionService.getTopConfessionsWithReactionDetails({
                startDate,
                endDate,
                limit: 5
            });
            
            // Check if there are any confessions
            if (!topConfessions || topConfessions.length === 0) {
                return this.replyMessageGenerate({
                    messageContent: `No confessions found for ${weekOffset === 0 ? 'this' : 'the requested'} week.`
                }, message);
            }
            
            // Format the week range
            const dateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
            
            // Build message content
            const lines = [
                `🏆 #### Top Confessions (${dateRange})`,
                '',
            ];
            
            // Add each confession
            topConfessions.forEach((confession, index) => {
                this.logger.log(`Processing top confession #${index+1}: Confession #${confession.confessionNumber} with ${confession.reactionCount} reactions`);
                
                // Hiển thị emoji thích hợp dựa trên thứ hạng
                let rankEmoji = '';
                if (index === 0) rankEmoji = '🥇';
                else if (index === 1) rankEmoji = '🥈';
                else if (index === 2) rankEmoji = '🥉';
                else rankEmoji = `${index + 1}.`;
                
                // Hiển thị emojis phù hợp dựa trên số reaction
                let reactionEmoji = '❤️';
                if (confession.reactionCount > 10) reactionEmoji = '🔥';
                else if (confession.reactionCount > 5) reactionEmoji = '⭐';
                
                // Hiển thị số thứ tự confession nếu có
                const confessionIdDisplay = confession.confessionNumber ? 
                    ` (#${confession.confessionNumber})` : '';
                
                lines.push(`${rankEmoji} #### Top Confession${confessionIdDisplay} - ${confession.reactionCount} ${reactionEmoji}`);
                lines.push(`"${confession.content}"`);
                
                // Thêm thông tin về thời gian đăng
                if (confession.postedAt) {
                    const postedDate = format(confession.postedAt, 'dd/MM/yyyy');
                    lines.push(`*Đăng ngày: ${postedDate}*`);
                }
                
                // Hiển thị chi tiết về từng loại reaction
                if (confession.reactionDetails && Object.keys(confession.reactionDetails).length > 0) {
                    // Xử lý và tạo một bản sao để không ảnh hưởng đến dữ liệu gốc
                    const processedReactions = { ...confession.reactionDetails };
                    
                // Debug
                this.logger.log(`Confession #${confession.confessionNumber}: Raw reaction details: ${JSON.stringify(confession.reactionDetails)}`);
                
                // Sắp xếp reactions theo số lượng giảm dần
                const sortedReactions = Object.entries(processedReactions)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1]); // Sort by count descending
                
                // Debug
                this.logger.log(`Confession #${confession.confessionNumber}: Sorted reactions: ${JSON.stringify(sortedReactions)}`);                    const reactionDetails = sortedReactions.map(([emoji, count]) => {
                        // Đảm bảo count là một số nguyên
                        const numCount = typeof count === 'number' ? Math.floor(count) : parseInt(count as any);
                        
                        // Xử lý đặc biệt cho các reaction thông dụng
                        if (emoji === '+1') {
                            return `👍 ${numCount}`;
                        } else if (emoji === '-1') {
                            return `👎 ${numCount}`;
                        } else if (emoji === 'heart' || emoji === '❤️') {
                            return `❤️ ${numCount}`;
                        } else if (emoji === '100') {
                            return `💯 ${numCount}`;
                        } else if (emoji === 'fire') {
                            return `🔥 ${numCount}`;
                        } else if (emoji === 'clap') {
                            return `👏 ${numCount}`;
                        } else if (emoji === 'star') {
                            return `⭐ ${numCount}`;
                        } else if (emoji.startsWith(':') && emoji.endsWith(':')) {
                            // Xử lý custom emoji của Discord (ví dụ: :cong1:, :meo_beo_oke:)
                            // Đảm bảo hiển thị chính xác định dạng cho Discord
                            return `${emoji} ${numCount}`;
                        } else {
                            // Kiểm tra nếu emoji là custom emoji nhưng không có định dạng :name:
                            if (emoji.includes(':')) {
                                // Đây có thể là emoji với định dạng <:name:id>
                                // Trích xuất tên emoji
                                const match = emoji.match(/<:([^:]+):/);
                                if (match) {
                                    return `:${match[1]}: ${numCount}`;
                                }
                            }
                            return `${emoji} ${numCount}`;
                        }
                    }).join(' • ');
                    
                    if (reactionDetails.length > 0) {
                        lines.push(`*Reactions: ${reactionDetails}*`);
                        // Hiển thị tổng số loại reaction
                        const uniqueReactionCount = sortedReactions.length;
                        if (uniqueReactionCount > 1) {
                            lines.push(`*${uniqueReactionCount} loại reaction khác nhau*`);
                        }
                    }
                }
                
                lines.push(''); // Empty line for spacing
            });
            
            // // Add footer
            // if (weekOffset === 0) {
            //     lines.push('These are the top confessions of the current week based on reactions.');
            // } else {
            //     lines.push(`These were the top confessions from ${Math.abs(weekOffset)} ${Math.abs(weekOffset) === 1 ? 'week' : 'weeks'} ago.`);
            // }
            //lines.push('                                      ');
            const messageContent = lines.join('\n');
            
            // Send the formatted message
            return this.replyMessageGenerate({
                messageContent,
                mk: [{ type: 'pre', s: 0, e: messageContent.length }]
            }, message);
            
        } catch (error) {
            this.logger.error('Error getting top confessions', error);
            return this.replyMessageGenerate({
                messageContent: 'Sorry, there was an error retrieving the top confessions. Please try again later.'
            }, message);
        }
    }
}