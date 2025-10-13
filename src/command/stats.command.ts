import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { AnalyticsService } from '@app/services/analytics.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@Command('stats', {
    description: 'Show confession statistics',
    usage: '!stats',
    category: 'Confession',
    aliases: ['statistics', 'confessionstats'],
    permissions: ['admin'],
})
export class StatsCommand extends CommandMessage {
    private readonly logger = new Logger(StatsCommand.name);

    constructor(private analyticsService: AnalyticsService) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        try {
            // Get quick stats
            const stats = await this.analyticsService.getQuickStats();
            
            // Format the stats message
            const lines = [
                '📊 ** Confession Statistics**',
                '',
                `**Total Confessions:** ${stats.totalConfessions}`,
                `**Approved Confessions:** ${stats.approvedConfessions}`,
                `**Approval Rate:** ${stats.approvalRate}`,
                `**Average Reactions per Confession:** ${stats.avgReactions}`,
                '',
                '**Most Used Tags:**'
            ];
            
            // Add most used tags
            if (stats.mostUsedTags && stats.mostUsedTags.length > 0) {
                const tagsStr = stats.mostUsedTags
                    .map(tag => `#${tag.tag} (${tag.count})`)
                    .join(', ');
                lines.push(tagsStr);
            } else {
                lines.push('No tags have been used yet.');
            }
            
            lines.push('');
            lines.push('Use `!topconfession` to see this week\'s top confessions!');
            lines.push('                                        ');
            const messageContent = lines.join('\n');
            
            // Send the formatted message
            return this.replyMessageGenerate({
                messageContent,
                mk: [{ type: 'pre', s: 0, e: messageContent.length }]
            }, message);
            
        } catch (error) {
            this.logger.error('Error getting confession stats', error);
            return this.replyMessageGenerate({
                messageContent: 'Sorry, there was an error retrieving the confession statistics. Please try again later.'
            }, message);
        }
    }
}