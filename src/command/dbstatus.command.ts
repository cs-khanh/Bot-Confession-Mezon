import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession } from '@app/entities/confession.entity';
import { Reaction } from '@app/entities/reaction.entity';
import { WeeklyStats } from '@app/entities/weekly-stats.entity';

@Injectable()
@Command('dbstatus', {
    description: 'Check data status in the database',
    usage: '!dbstatus [detailed]',
    category: 'Admin',
    aliases: ['checkdb', 'dbinfo'],
    permissions: ['admin'],
})
export class DBStatusCommand extends CommandMessage {
    private readonly logger = new Logger(DBStatusCommand.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(Reaction)
        private reactionRepository: Repository<Reaction>,
        @InjectRepository(WeeklyStats)
        private weeklyStatsRepository: Repository<WeeklyStats>,
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        try {
            this.logger.log('Checking database status...');

            // Count records
            const confessionsCount = await this.confessionRepository.count();
            const reactionsCount = await this.reactionRepository.count();
            const weeklyStatsCount = await this.weeklyStatsRepository.count();

            // Get latest records
            const [latestConfession] = await this.confessionRepository.find({
                order: { createdAt: 'DESC' },
                take: 1,
            });

            const [latestReaction] = await this.reactionRepository.find({
                order: { createdAt: 'DESC' },
                take: 1,
            });

            const [latestWeeklyStat] = await this.weeklyStatsRepository.find({
                order: { createdAt: 'DESC' },
                take: 1,
            });

            const lines = [
                '**🗄 Database Status Overview**',
                '',
                `**Confessions:** ${confessionsCount} records`,
                `**Reactions:** ${reactionsCount} records`,
                `**Weekly Stats:** ${weeklyStatsCount} records`,
                '',
                '**📅 Latest Data:**',
            ];

            if (latestConfession) {
                const date = latestConfession.createdAt
                    ? new Date(latestConfession.createdAt).toLocaleDateString()
                    : 'unknown';
                lines.push(
                    `- Latest confession: #${latestConfession.confessionNumber || 'N/A'} (${date})`,
                );
                lines.push(
                    `  Content: "${latestConfession.content.substring(0, 40)}${
                        latestConfession.content.length > 40 ? '...' : ''
                    }"`,
                );
            } else {
                lines.push('- No confessions found.');
            }

            if (latestReaction) {
                const date = latestReaction.createdAt
                    ? new Date(latestReaction.createdAt).toLocaleDateString()
                    : 'unknown';
                lines.push(
                    `- Latest reaction: ${latestReaction.emoji} → ${latestReaction.count}x (${date})`,
                );
                if (latestReaction.messageId) {
                    lines.push(`  Message ID: ${latestReaction.messageId}`);
                }
            } else {
                lines.push('- No reactions found.');
            }

            if (latestWeeklyStat) {
                const date = latestWeeklyStat.createdAt
                    ? new Date(latestWeeklyStat.createdAt).toLocaleDateString()
                    : 'unknown';
                lines.push(
                    `- Latest weekly stat: Week ${latestWeeklyStat.week}/${latestWeeklyStat.year} (${date})`,
                );
                lines.push(
                    `  Confessions: ${latestWeeklyStat.totalConfessions} total, ${latestWeeklyStat.approvedConfessions} approved`,
                );
            } else {
                lines.push('- No weekly stats found.');
            }

            // === Optional detailed section ===
            if (args.includes('detailed') && confessionsCount > 0) {
                lines.push('');
                lines.push('**🧾 Recent Confessions:**');

                const recentConfessions = await this.confessionRepository.find({
                    take: 3,
                    order: { createdAt: 'DESC' },
                });

                for (const [index, confession] of recentConfessions.entries()) {
                    const confNumber = confession.confessionNumber || 'N/A';
                    lines.push(
                        `${index + 1}. Confession #${confNumber} (ID: ${confession.id.substring(
                            0,
                            8,
                        )}...)`,
                    );
                    lines.push(
                        `   "${confession.content.substring(0, 60)}${
                            confession.content.length > 60 ? '...' : ''
                        }"`,
                    );
                    lines.push(
                        `   Status: ${confession.status}, Reactions: ${confession.reactionCount}`,
                    );

                    // Fetch top 3 emoji for each confession
                    const emojiStats = await this.reactionRepository.find({
                        where: { confessionId: confession.id },
                        order: { count: 'DESC' },
                        take: 3,
                    });

                    if (emojiStats.length > 0) {
                        const emojiSummary = emojiStats
                            .map(r => `${r.emoji} ${r.count}`)
                            .join(' • ');
                        lines.push(`   Top reactions: ${emojiSummary}`);
                    }
                }
            }

            return this.replyMessageGenerate(
                {
                    messageContent: lines.join('\n'),
                },
                message,
            );
        } catch (error) {
            this.logger.error('Error checking database status', error);
            return this.replyMessageGenerate(
                {
                    messageContent: `❌ Error checking database status: ${error.message}`,
                },
                message,
            );
        }
    }
}
