import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Confession, ConfessionStatus } from '../entities/confession.entity';
import { Reaction } from '../entities/reaction.entity';
import { WeeklyStats } from '../entities/weekly-stats.entity';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(Reaction)
        private reactionRepository: Repository<Reaction>,
        @InjectRepository(WeeklyStats)
        private weeklyStatsRepository: Repository<WeeklyStats>,
    ) {}

    async generateWeeklyStats(date: Date = new Date()): Promise<WeeklyStats> {
        const startDate = startOfWeek(date, { weekStartsOn: 1 });
        const endDate = endOfWeek(date, { weekStartsOn: 1 });
        const weekNumber = this.getWeekNumber(date);
        const year = date.getFullYear();

        const existingStats = await this.weeklyStatsRepository.findOne({
            where: { week: weekNumber, year },
        });
        if (existingStats) return existingStats;

        const confessions = await this.confessionRepository.find({
            where: { createdAt: Between(startDate, endDate) },
        });

        const approved = confessions.filter(c => c.status === ConfessionStatus.APPROVED);
        const rejected = confessions.filter(c => c.status === ConfessionStatus.REJECTED);

        const topConfessions = await this.getTopConfessionsOfWeek(startDate, endDate);
        const topTags = this.calculateTopTags(confessions);
        const reactionDistribution = await this.calculateReactionDistribution(
            approved.map(c => c.id)
        );

        const totalReactions = Object.values(reactionDistribution)
            .reduce((sum, n) => sum + n, 0);

        const weeklyStats = this.weeklyStatsRepository.create({
            week: weekNumber,
            year,
            startDate,
            endDate,
            totalConfessions: confessions.length,
            approvedConfessions: approved.length,
            rejectedConfessions: rejected.length,
            totalReactions,
            topConfessions: topConfessions.map(c => ({
                confessionId: c.id,
                reactionCount: c.reactionCount,
                content: c.content.substring(0, 100) + (c.content.length > 100 ? '...' : ''),
            })),
            topTags,
            reactionDistribution,
        });

        return this.weeklyStatsRepository.save(weeklyStats);
    }

    async getWeeklyStats(weekOffset: number = 0): Promise<WeeklyStats> {
        const target = addWeeks(new Date(), weekOffset);
        const week = this.getWeekNumber(target);
        const year = target.getFullYear();

        const existing = await this.weeklyStatsRepository.findOne({
            where: { week, year },
        });
        if (existing) return existing;
        return this.generateWeeklyStats(target);
    }

    async getQuickStats(): Promise<any> {
        const total = await this.confessionRepository.count();
        const approved = await this.confessionRepository.count({
            where: { status: ConfessionStatus.APPROVED },
        });

        const avgReactions = await this.confessionRepository
            .createQueryBuilder('c')
            .select('AVG(c.reactionCount)', 'avg')
            .where('c.status = :status', { status: ConfessionStatus.APPROVED })
            .getRawOne();

        const mostUsedTags = await this.getMostUsedTags();

        return {
            totalConfessions: total,
            approvedConfessions: approved,
            approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) + '%' : '0%',
            avgReactions: parseFloat(avgReactions?.avg || '0').toFixed(2),
            mostUsedTags,
        };
    }

    async generateReportText(weeklyStats: WeeklyStats): Promise<string> {
        const dateRange = `${format(weeklyStats.startDate, 'MMM d')} - ${format(
            weeklyStats.endDate,
            'MMM d, yyyy'
        )}`;

        return [
            `📊 **Weekly Confession Report** (${dateRange})`,
            '',
            `**Total Confessions:** ${weeklyStats.totalConfessions}`,
            `**Approval Rate:** ${(
                (weeklyStats.approvedConfessions / weeklyStats.totalConfessions) *
                100
            ).toFixed(2)}%`,
            `**Total Reactions:** ${weeklyStats.totalReactions}`,
            '',
            '**🏆 Top Confessions:**',
            ...weeklyStats.topConfessions
                .slice(0, 3)
                .map(
                    (c, i) => `${i + 1}. "${c.content}" - ${c.reactionCount} reactions`
                ),
            '',
            '**🔖 Popular Tags:**',
            weeklyStats.topTags
                .slice(0, 5)
                .map(t => `#${t.tag} (${t.count})`)
                .join(', '),
            '',
            '**Thank you for being part of our confession community!**',
        ].join('\n');
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

    private calculateTopTags(confessions: Confession[]): { tag: string; count: number }[] {
        const tags: Record<string, number> = {};
        confessions.forEach(c => {
            if (c.tags) {
                c.tags.forEach(t => {
                    tags[t] = (tags[t] || 0) + 1;
                });
            }
        });
        return Object.entries(tags)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }

    private async calculateReactionDistribution(confessionIds: string[]): Promise<Record<string, number>> {
        if (confessionIds.length === 0) return {};

        const reactions = await this.reactionRepository.find({
            where: { confessionId: In(confessionIds) },
        });

        const distribution: Record<string, number> = {};
        reactions.forEach(r => {
            distribution[r.emoji] = (distribution[r.emoji] || 0) + (r.count || 0);
        });

        return distribution;
    }

    private async getMostUsedTags(): Promise<{ tag: string; count: number }[]> {
        const confessions = await this.confessionRepository.find({
            where: { status: ConfessionStatus.APPROVED },
        });
        return this.calculateTopTags(confessions).slice(0, 5);
    }
}
