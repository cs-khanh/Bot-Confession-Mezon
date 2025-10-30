import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession, ConfessionStatus } from '../entities/confession.entity';
import { ReactionLog } from '../entities/reaction-log.entity';
import { Reaction } from '../entities/reaction.entity';
import { ReactionUser } from '../entities/reaction-user.entity';
import * as crypto from 'crypto';

@Injectable()
export class ConfessionService {
    private readonly logger = new Logger(ConfessionService.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(Reaction)
        private reactionRepository: Repository<Reaction>,
        @InjectRepository(ReactionUser) 
        private reactionUserRepository: Repository<ReactionUser>,
    ) {}

    // ================================
    // CREATE & BASIC METHODS
    // ================================

    async create(content: string, ipAddress: string, attachments?: any[]): Promise<Confession> {
        const authorHash = this.generateAuthorHash(ipAddress);
        const nextNumber = await this.getNextConfessionNumber();

        const confession = this.confessionRepository.create({
            content,
            authorHash,
            confessionNumber: nextNumber,
            status: ConfessionStatus.PENDING,
            tags: null,
            attachments: attachments || null,
        });

        return this.confessionRepository.save(confession);
    }

    private async getNextConfessionNumber(): Promise<number> {
        const result = await this.confessionRepository.createQueryBuilder('confession')
            .select('MAX(confession.confession_number)', 'maxNumber')
            .getRawOne();

        const maxNumber = result?.maxNumber || 0;
        return maxNumber + 1;
    }

    async findById(id: string): Promise<Confession> {
        return this.confessionRepository.findOne({ where: { id } });
    }

    async findAll(options?: {
        status?: ConfessionStatus;
        take?: number;
        skip?: number;
        orderBy?: { [key: string]: 'ASC' | 'DESC' };
    }): Promise<[Confession[], number]> {
        const { status, take = 10, skip = 0, orderBy = { createdAt: 'DESC' } } = options || {};

        const query = this.confessionRepository.createQueryBuilder('confession');

        if (status) {
            query.where('confession.status = :status', { status });
        }

        query.take(take);
        query.skip(skip);

        Object.entries(orderBy).forEach(([key, order]) => {
            query.addOrderBy(`confession.${key}`, order);
        });

        return query.getManyAndCount();
    }

    async findOne(id: string): Promise<Confession> {
        const confession = await this.confessionRepository.findOne({ where: { id } });
        if (!confession) throw new NotFoundException(`Confession with ID ${id} not found`);
        return confession;
    }

    async updateStatus(id: string, status: ConfessionStatus, comment?: string): Promise<Confession> {
        const confession = await this.findById(id);
        if (!confession) throw new NotFoundException(`Confession with ID ${id} not found`);

        confession.status = status;
        if (comment) confession.moderationComment = comment;
        if (status === ConfessionStatus.APPROVED) confession.postedAt = new Date();

        return this.confessionRepository.save(confession);
    }

    async updateTags(id: string, tags: string[]): Promise<Confession> {
        const confession = await this.findById(id);
        if (!confession) throw new NotFoundException(`Confession with ID ${id} not found`);
        confession.tags = tags;
        return this.confessionRepository.save(confession);
    }

    async updateMessageInfo(id: string, messageId: string, channelId: string): Promise<Confession> {
        const confession = await this.findOne(id);
        confession.messageId = messageId;
        confession.channelId = channelId;
        return this.confessionRepository.save(confession);
    }
    /**
     * Khi user thả reaction → cộng số lượng của người đó
     */
    async addUserReaction(messageId: string, emoji: string, userId: string, count: number) {
        const confession = await this.confessionRepository.findOne({ where: { messageId } });
        if (!confession) return;

        // Cập nhật bảng reaction_user
        let userReact = await this.reactionUserRepository.findOne({ where: { messageId, emoji, userId } });
        if (!userReact) {
            userReact = this.reactionUserRepository.create({ messageId, emoji, userId, count: 0 });
        }
        userReact.count += count;
        await this.reactionUserRepository.save(userReact);

        // Cập nhật bảng reaction (tổng số emoji)
        let reaction = await this.reactionRepository.findOne({ where: { messageId, emoji } });
        if (!reaction) {
            reaction = this.reactionRepository.create({ messageId, confessionId: confession.id, emoji, count: 0 });
        }
        reaction.count += count;
        await this.reactionRepository.save(reaction);
        this.logger.log(`[REACTION] ${emoji} +${count} by ${userId} → total now ${reaction.count}`);

        await this.syncReactionTotal(confession.id);
    }

    /**
     * Khi user bỏ reaction → xoá toàn bộ số lượng của người đó
     */
        async removeUserReaction(messageId: string, emoji: string, userId: string) {
        const confession = await this.confessionRepository.findOne({ where: { messageId } });
        if (!confession) return;

        const userReact = await this.reactionUserRepository.findOne({ where: { messageId, emoji, userId } });
        if (!userReact) return;

        const toRemove = userReact.count;

        // Xoá bản ghi của user
        await this.reactionUserRepository.remove(userReact);

        // Trừ tổng reaction tương ứng
        const reaction = await this.reactionRepository.findOne({ where: { messageId, emoji } });
        if (reaction) {
            reaction.count = Math.max(0, reaction.count - toRemove);
            if (reaction.count <= 0) {
                await this.reactionRepository.remove(reaction);
            } else await this.reactionRepository.save(reaction);
        
        }
        this.logger.log(`[REACTION] ${emoji} removed by ${userId} (-${toRemove})`);


        await this.syncReactionTotal(confession.id);
    }

    /**
     * Cập nhật tổng reaction_count
     */
    private async syncReactionTotal(confessionId: string) {
        const total = await this.reactionRepository
            .createQueryBuilder('r')
            .where('r.confessionId = :id', { id: confessionId })
            .select('SUM(r.count)', 'sum')
            .getRawOne();

        const confession = await this.confessionRepository.findOne({ where: { id: confessionId } });
        if (confession) {
            confession.reactionCount = parseInt(total.sum || '0', 10);
            await this.confessionRepository.save(confession);
        }
    }

    // ================================
    // REACTIONS LOGIC (USING Reaction ENTITY)
    // ================================

    /**
     * Cộng thêm hoặc trừ reaction (per emoji).
     * - Nếu reaction chưa tồn tại → tạo mới.
     * - Nếu count giảm về 0 → xoá bản ghi.
     * - Cập nhật tổng reaction_count trong confession.
     */
    async updateReactionCount(
        messageId: string,
        emoji: string,
        delta: number, // +1 hoặc -1
        ): Promise<void> {
        try {
            const confession = await this.confessionRepository.findOne({ where: { messageId } });
            if (!confession) {
            this.logger.warn(`[REACTION UPDATE] No confession found for message ${messageId}`);
            return;
            }

            let reaction = await this.reactionRepository.findOne({ where: { messageId, emoji } });

            // ✅ Nếu reaction chưa có và là ADD → tạo mới
            if (!reaction && delta > 0) {
            reaction = this.reactionRepository.create({
                messageId,
                confessionId: confession.id,
                emoji,
                count: 1,
            });
            await this.reactionRepository.save(reaction);
            }
            // ✅ Nếu reaction đã có → cộng / trừ
            else if (reaction) {
            const newCount = (reaction.count ?? 0) + delta;
            if (newCount <= 0) {
                await this.reactionRepository.remove(reaction);
                this.logger.log(`[REACTION UPDATE] Removed ${emoji} (count=0)`);
            } else {
                reaction.count = newCount;
                await this.reactionRepository.save(reaction);
            }
            }

            // ✅ Recalculate total count for confession
            const total = await this.reactionRepository
            .createQueryBuilder('r')
            .where('r.confessionId = :id', { id: confession.id })
            .select('COALESCE(SUM(r.count), 0)', 'sum')
            .getRawOne();

            confession.reactionCount = parseInt(total.sum, 10) || 0;
            await this.confessionRepository.save(confession);

            this.logger.log(
            `[REACTION UPDATE] ${emoji} delta=${delta} → total now ${confession.reactionCount}`,
            );
        } catch (error) {
            this.logger.error(`[REACTION UPDATE] Error: ${error.message}`, error.stack);
        }
        }

    /**
     * Lấy chi tiết các emoji reaction của một confession.
     */
    // Có sẵn:
    async getReactionDetails(messageId: string): Promise<Record<string, number>> {
    const reactions = await this.reactionRepository.find({ where: { messageId } });
    const details: Record<string, number> = {};
    for (const r of reactions) details[r.emoji] = r.count;
    return details;
    }

    // Thêm hàm tiện lợi lấy theo confessionId:
    async getReactionDetailsByConfessionId(confessionId: string): Promise<Record<string, number>> {
        const reactions = await this.reactionRepository.find({ where: { confessionId } });
        const details: Record<string, number> = {};
        for (const r of reactions) details[r.emoji] = r.count;
        return details;
    }

    /**
     * Đồng bộ lại tổng reaction_count cho tất cả confession (nếu cần).
     */
    async syncAllReactionCounts(): Promise<void> {
    this.logger.log('[REACTION SYNC] Syncing all confession reaction counts...');

    const confessions = await this.confessionRepository.find();
    for (const confession of confessions) {
        const total = await this.reactionRepository
        .createQueryBuilder('r')
        .where('r.confessionId = :id', { id: confession.id })
        .select('SUM(r.count)', 'sum')
        .getRawOne();

        confession.reactionCount = parseInt(total.sum || '0', 10);
        await this.confessionRepository.save(confession);
    }

    this.logger.log(`[REACTION SYNC] Done syncing all ${confessions.length} confessions.`);
    }
    // ================================
    // UTILITIES
    // ================================

    private generateAuthorHash(ipAddress: string): string {
        return crypto
            .createHash('sha256')
            .update(ipAddress + (process.env.HASH_SECRET ?? 'secret-salt'))
            .digest('hex')
            .substring(0, 10);
    }
    // ================================
    // TOP CONFESSIONS
    // ================================

    /**
     * Lấy danh sách các confession top theo số lượng reaction trong một khoảng thời gian.
     */
    async getTopConfessions(options: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<Confession[]> {
    const { startDate, endDate, limit = 10 } = options;
    try {
        this.logger.log('[TOP CONFESSIONS] Fetching top confessions...');
        await this.syncAllReactionCounts();

        const query = this.confessionRepository
        .createQueryBuilder('confession')
        .select([
            'confession.id',
            'confession.confessionNumber',
            'confession.content',
            'confession.messageId',
            'confession.postedAt',
            'confession.reactionCount',
            'confession.tags',
        ])
        .where('confession.status = :status', { status: ConfessionStatus.APPROVED })
        .andWhere('confession.messageId IS NOT NULL')
        .orderBy('confession.reactionCount', 'DESC')
        .take(limit);

        if (startDate) query.andWhere('confession.postedAt >= :startDate', { startDate });
        if (endDate) query.andWhere('confession.postedAt <= :endDate', { endDate });

        const confessions = await query.getMany();

        this.logger.log(`[TOP CONFESSIONS] Found ${confessions.length} confessions.`);
        return confessions;
    } catch (error) {
        this.logger.error(`[TOP CONFESSIONS] Error: ${error.message}`, error.stack);
        return [];
    }
    }

    /**
     * Lấy top confession cùng chi tiết reaction emoji (từ bảng Reaction).
     */
    async getTopConfessionsWithReactionDetails(options: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<Array<Confession & { reactionDetails?: Record<string, number> }>> {
    const confessions = await this.getTopConfessions(options);

    const results = await Promise.all(
        confessions.map(async (confession) => {
        const reactions = await this.reactionRepository.find({
            where: { confessionId: confession.id },
        });
        const details: Record<string, number> = {};
        for (const r of reactions) details[r.emoji] = r.count;

        return {
            ...confession,
            reactionDetails: details,
        };
        }),
    );
    

    return results;
    }

    


}
