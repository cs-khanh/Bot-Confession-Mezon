import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession } from '@app/entities/confession.entity';
import { ReactionLog } from '@app/entities/reaction-log.entity';
import { WeeklyStats } from '@app/entities/weekly-stats.entity';

@Injectable()
@Command('dbstatus', {
    description: 'Check data status in the database',
    usage: '!dbstatus',
    category: 'Admin',
    aliases: ['checkdb', 'dbinfo'],
    permissions: ['admin'],
})
export class DBStatusCommand extends CommandMessage {
    private readonly logger = new Logger(DBStatusCommand.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(ReactionLog)
        private reactionLogRepository: Repository<ReactionLog>,
        @InjectRepository(WeeklyStats)
        private weeklyStatsRepository: Repository<WeeklyStats>,
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        try {
            this.logger.log('Checking database status...');
            
            // Count records in each table
            const confessionsCount = await this.confessionRepository.count();
            const reactionLogsCount = await this.reactionLogRepository.count();
            const weeklyStatsCount = await this.weeklyStatsRepository.count();
            
            // Get latest record from each table for a quick sanity check
            let latestConfession = null;
            let latestReactionLog = null;
            let latestWeeklyStat = null;

            if (confessionsCount > 0) {
                const confessions = await this.confessionRepository.find({
                    take: 1,
                    order: { createdAt: 'DESC' }
                });
                latestConfession = confessions.length > 0 ? confessions[0] : null;
            }
            
            if (reactionLogsCount > 0) {
                const reactionLogs = await this.reactionLogRepository.find({
                    take: 1,
                    order: { createdAt: 'DESC' }
                });
                latestReactionLog = reactionLogs.length > 0 ? reactionLogs[0] : null;
            }
            
            if (weeklyStatsCount > 0) {
                const weeklyStats = await this.weeklyStatsRepository.find({
                    take: 1,
                    order: { createdAt: 'DESC' }
                });
                latestWeeklyStat = weeklyStats.length > 0 ? weeklyStats[0] : null;
            }
                
            // Format response message
            const lines = [
                '**Database Status**',
                '',
                `**Confessions**: ${confessionsCount} records`,
                `**Reaction Logs**: ${reactionLogsCount} records`,
                `**Weekly Stats**: ${weeklyStatsCount} records`,
                '',
                '**Latest Data:**',
            ];
            
            if (latestConfession) {
                const date = latestConfession.createdAt 
                    ? new Date(latestConfession.createdAt).toLocaleDateString() 
                    : 'unknown';
                const confNumber = latestConfession.confessionNumber || 'N/A';
                lines.push(`- Latest confession: #${confNumber} (ID: ${latestConfession.id.substring(0, 8)}...) (${date})`);
                lines.push(`  Content preview: "${latestConfession.content.substring(0, 40)}${latestConfession.content.length > 40 ? '...' : ''}"`);
            } else {
                lines.push('- No confessions found');
            }
            
            if (latestReactionLog) {
                const date = latestReactionLog.createdAt 
                    ? new Date(latestReactionLog.createdAt).toLocaleDateString() 
                    : 'unknown';
                const reactionCount = latestReactionLog.reactions ? Object.keys(latestReactionLog.reactions).length : 0;
                lines.push(`- Latest reaction log: ID ${latestReactionLog.id} (${date})`);
                lines.push(`  Message ID: ${latestReactionLog.messageId}, ${reactionCount} reaction types`);
            } else {
                lines.push('- No reaction logs found');
            }
            
            if (latestWeeklyStat) {
                const date = latestWeeklyStat.createdAt 
                    ? new Date(latestWeeklyStat.createdAt).toLocaleDateString() 
                    : 'unknown';
                lines.push(`- Latest weekly stat: Week ${latestWeeklyStat.week}/${latestWeeklyStat.year} (${latestWeeklyStat.startDate ? new Date(latestWeeklyStat.startDate).toLocaleDateString() : 'unknown'} - ${latestWeeklyStat.endDate ? new Date(latestWeeklyStat.endDate).toLocaleDateString() : 'unknown'})`);
                lines.push(`  Confessions: ${latestWeeklyStat.totalConfessions} total, ${latestWeeklyStat.approvedConfessions} approved`);
            } else {
                lines.push('- No weekly stats found');
            }
            
            // Additional info for detailed inspection if requested
            if (args.includes('detailed') && confessionsCount > 0) {
                lines.push('');
                lines.push('**Recent Confessions:**');
                
                const recentConfessions = await this.confessionRepository.find({
                    take: 3,
                    order: { createdAt: 'DESC' }
                });
                
                recentConfessions.forEach((confession, index) => {
                    const confNumber = confession.confessionNumber || 'N/A';
                    lines.push(`${index + 1}. Confession #${confNumber} (ID: ${confession.id.substring(0, 8)}...)`);
                    lines.push(`   Content: "${confession.content.substring(0, 60)}${confession.content.length > 60 ? '...' : ''}"`);
                    lines.push(`   Status: ${confession.status}, Reactions: ${confession.reactionCount}`);
                });
            }
            
            return this.replyMessageGenerate({
                messageContent: lines.join('\n')
            }, message);
            
        } catch (error) {
            this.logger.error('Error checking database status', error);
            return this.replyMessageGenerate({
                messageContent: `❌ Error checking database status: ${error.message}`
            }, message);
        }
    }
}