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
            
            // Get top confessions
            const topConfessions = await this.confessionService.getTopConfessions({
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
                `🏆 **Top Confessions** (${dateRange})`,
                ''
            ];
            
            // Add each confession
            topConfessions.forEach((confession, index) => {
                lines.push(`**#${index + 1}** (${confession.reactionCount} reactions)`);
                lines.push(confession.content);
                lines.push(''); // Empty line for spacing
            });
            
            // Add footer
            if (weekOffset === 0) {
                lines.push('These are the top confessions of the current week based on reactions.');
            } else {
                lines.push(`These were the top confessions from ${Math.abs(weekOffset)} ${Math.abs(weekOffset) === 1 ? 'week' : 'weeks'} ago.`);
            }
            lines.push('Use `!topconfession -1` for last week, `!topconfession -2` for two weeks ago, etc.');
            lines.push('--------------------------------------------');
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