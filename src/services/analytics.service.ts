import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Confession, ConfessionStatus } from '../entities/confession.entity';
import { ReactionLog } from '../entities/reaction-log.entity';
import { WeeklyStats } from '../entities/weekly-stats.entity';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(ReactionLog)
        private reactionLogRepository: Repository<ReactionLog>,
        @InjectRepository(WeeklyStats)
        private weeklyStatsRepository: Repository<WeeklyStats>,
    ) {}

    async generateWeeklyStats(date: Date = new Date()): Promise<WeeklyStats> {
        const startDate = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const endDate = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
        
        const weekNumber = this.getWeekNumber(date);
        const year = date.getFullYear();
        
        // Check if stats already exist for this week
        const existingStats = await this.weeklyStatsRepository.findOne({
            where: { week: weekNumber, year }
        });
        
        if (existingStats) {
            return existingStats;
        }
        
        // Get confession data for the week
        const confessions = await this.confessionRepository.find({
            where: {
                createdAt: Between(startDate, endDate),
            }
        });
        
        const approvedConfessions = confessions.filter(
            c => c.status === ConfessionStatus.APPROVED
        );
        const rejectedConfessions = confessions.filter(
            c => c.status === ConfessionStatus.REJECTED
        );
        
        // Get top confessions
        const topConfessions = await this.getTopConfessionsOfWeek(startDate, endDate);
        
        // Get top tags
        const topTags = this.calculateTopTags(confessions);
        
        // Get reaction distribution
        const reactionDistribution = await this.calculateReactionDistribution(
            approvedConfessions.map(c => c.messageId).filter(Boolean)
        );
        
        // Calculate total reactions
        const totalReactions = Object.values(reactionDistribution)
            .reduce((sum, count) => sum + count, 0);
        
        // Create weekly stats
        const weeklyStats = this.weeklyStatsRepository.create({
            week: weekNumber,
            year,
            startDate,
            endDate,
            totalConfessions: confessions.length,
            approvedConfessions: approvedConfessions.length,
            rejectedConfessions: rejectedConfessions.length,
            totalReactions,
            topConfessions: topConfessions.map(c => ({
                confessionId: c.id,
                reactionCount: c.reactionCount,
                content: c.content.substring(0, 100) + (c.content.length > 100 ? '...' : '')
            })),
            topTags,
            reactionDistribution,
        });
        
        return this.weeklyStatsRepository.save(weeklyStats);
    }

    async getWeeklyStats(weekOffset: number = 0): Promise<WeeklyStats> {
        const targetDate = addWeeks(new Date(), weekOffset);
        const weekNumber = this.getWeekNumber(targetDate);
        const year = targetDate.getFullYear();
        
        const stats = await this.weeklyStatsRepository.findOne({
            where: { week: weekNumber, year }
        });
        
        if (stats) {
            return stats;
        }
        
        // Generate if not exists
        return this.generateWeeklyStats(targetDate);
    }

    async getQuickStats(): Promise<any> {
        const totalConfessions = await this.confessionRepository.count();
        const approvedConfessions = await this.confessionRepository.count({
            where: { status: ConfessionStatus.APPROVED }
        });
        
        const avgReactions = await this.confessionRepository
            .createQueryBuilder('confession')
            .select('AVG(confession.reactionCount)', 'avgReactions')
            .where('confession.status = :status', { status: ConfessionStatus.APPROVED })
            .getRawOne();
        
        const mostUsedTags = await this.getMostUsedTags();
        
        return {
            totalConfessions,
            approvedConfessions,
            approvalRate: totalConfessions > 0 
                ? (approvedConfessions / totalConfessions * 100).toFixed(2) + '%' 
                : '0%',
            avgReactions: parseFloat(avgReactions?.avgReactions || '0').toFixed(2),
            mostUsedTags,
        };
    }

    async generateReportText(weeklyStats: WeeklyStats): Promise<string> {
        const dateRange = `${format(weeklyStats.startDate, 'MMM d')} - ${format(weeklyStats.endDate, 'MMM d, yyyy')}`;
        
        const text = [
            `📊 **Weekly Confession Report** (${dateRange})`,
            '',
            `**Total Confessions:** ${weeklyStats.totalConfessions}`,
            `**Approval Rate:** ${(weeklyStats.approvedConfessions / weeklyStats.totalConfessions * 100).toFixed(2)}%`,
            `**Total Reactions:** ${weeklyStats.totalReactions}`,
            '',
            '**🏆 Top Confessions:**',
            ...weeklyStats.topConfessions.slice(0, 3).map((c, i) => 
                `${i+1}. "${c.content}" - ${c.reactionCount} reactions`
            ),
            '',
            '**🔖 Popular Tags:**',
            ...weeklyStats.topTags.slice(0, 5).map((t) => 
                `#${t.tag} (${t.count})`
            ).join(', '),
            '',
            '**Thank you for being part of our confession community!**'
        ].join('\n');
        
        return text;
    }

    private getWeekNumber(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + start.getDay() + 1) / 7);
    }

    private async getTopConfessionsOfWeek(startDate: Date, endDate: Date): Promise<Confession[]> {
        return this.confessionRepository.find({
            where: {
                postedAt: Between(startDate, endDate),
                status: ConfessionStatus.APPROVED,
            },
            order: { reactionCount: 'DESC' },
            take: 5,
        });
    }

    private calculateTopTags(confessions: Confession[]): { tag: string, count: number }[] {
        const tagCount: Record<string, number> = {};
        
        confessions.forEach(confession => {
            if (confession.tags) {
                confession.tags.forEach(tag => {
                    tagCount[tag] = (tagCount[tag] || 0) + 1;
                });
            }
        });
        
        return Object.entries(tagCount)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }

    private async calculateReactionDistribution(
        messageIds: string[]
    ): Promise<{ [key: string]: number }> {
        if (messageIds.length === 0) {
            return {};
        }
        
        const reactionLogs = await this.reactionLogRepository.find({
            where: { messageId: In(messageIds) }
        });
        
        const distribution: { [key: string]: number } = {};
        
        reactionLogs.forEach(log => {
            Object.entries(log.reactions).forEach(([emoji, count]) => {
                distribution[emoji] = (distribution[emoji] || 0) + count;
            });
        });
        
        return distribution;
    }

    private async getMostUsedTags(): Promise<{ tag: string, count: number }[]> {
        const confessions = await this.confessionRepository.find({
            where: { status: ConfessionStatus.APPROVED }
        });
        
        return this.calculateTopTags(confessions).slice(0, 5);
    }
}