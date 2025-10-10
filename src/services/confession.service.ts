import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession, ConfessionStatus } from '../entities/confession.entity';
import { ReactionLog } from '../entities/reaction-log.entity';
import * as crypto from 'crypto';

@Injectable()
export class ConfessionService {
    private readonly logger = new Logger(ConfessionService.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        @InjectRepository(ReactionLog)
        private reactionLogRepository: Repository<ReactionLog>,
    ) {}

    async create(content: string, ipAddress: string, attachments?: any[]): Promise<Confession> {
        // Generate a consistent but anonymous author hash based on IP
        const authorHash = this.generateAuthorHash(ipAddress);
        
        const confession = this.confessionRepository.create({
            content,
            authorHash,
            status: ConfessionStatus.PENDING,
            tags: null, // Initialize as null instead of empty array to avoid TypeORM issues
            attachments: attachments || null, // Add attachments if provided
        });
        
        return this.confessionRepository.save(confession);
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
        
        // Apply ordering
        Object.entries(orderBy).forEach(([key, order]) => {
            query.addOrderBy(`confession.${key}`, order);
        });
        
        return query.getManyAndCount();
    }

    async findOne(id: string): Promise<Confession> {
        const confession = await this.confessionRepository.findOne({ where: { id } });
        if (!confession) {
            throw new NotFoundException(`Confession with ID ${id} not found`);
        }
        return confession;
    }

    async updateStatus(id: string, status: ConfessionStatus, comment?: string): Promise<Confession> {
        const confession = await this.findById(id);
        
        if (!confession) {
            throw new NotFoundException(`Confession with ID ${id} not found`);
        }
        
        confession.status = status;
        
        if (comment) {
            confession.moderationComment = comment;
        }
        
        if (status === ConfessionStatus.APPROVED) {
            confession.postedAt = new Date();
        }
        
        return this.confessionRepository.save(confession);
    }

    async updateTags(id: string, tags: string[]): Promise<Confession> {
        const confession = await this.findById(id);
        
        if (!confession) {
            throw new NotFoundException(`Confession with ID ${id} not found`);
        }
        
        confession.tags = tags;
        
        return this.confessionRepository.save(confession);
    }

    async updateMessageInfo(id: string, messageId: string, channelId: string): Promise<Confession> {
        const confession = await this.findOne(id);
        confession.messageId = messageId;
        confession.channelId = channelId;
        return this.confessionRepository.save(confession);
    }

    async updateReactionCount(messageId: string, reactions: { [key: string]: number }): Promise<void> {
        const confession = await this.confessionRepository.findOne({ where: { messageId } });
        
        if (!confession) {
            this.logger.warn(`No confession found for message ID: ${messageId}`);
            return;
        }
        
        // Calculate total reactions
        const totalCount = Object.values(reactions).reduce((sum, count) => sum + count, 0);
        confession.reactionCount = totalCount;
        
        // Update the confession
        await this.confessionRepository.save(confession);
        
        // Update or create reaction log
        let reactionLog = await this.reactionLogRepository.findOne({ 
            where: { messageId, confessionId: confession.id } 
        });
        
        if (!reactionLog) {
            reactionLog = this.reactionLogRepository.create({
                messageId,
                confessionId: confession.id,
                reactions,
                totalCount,
            });
        } else {
            reactionLog.reactions = reactions;
            reactionLog.totalCount = totalCount;
        }
        
        await this.reactionLogRepository.save(reactionLog);
    }

    async getTopConfessions(options: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<Confession[]> {
        const { startDate, endDate, limit = 10 } = options;
        
        const query = this.confessionRepository
            .createQueryBuilder('confession')
            .where('confession.status = :status', { status: ConfessionStatus.APPROVED })
            .orderBy('confession.reactionCount', 'DESC')
            .take(limit);
        
        if (startDate) {
            query.andWhere('confession.postedAt >= :startDate', { startDate });
        }
        
        if (endDate) {
            query.andWhere('confession.postedAt <= :endDate', { endDate });
        }
        
        return query.getMany();
    }

    private generateAuthorHash(ipAddress: string): string {
        // Create a consistent but anonymous hash
        return crypto
            .createHash('sha256')
            .update(ipAddress + process.env.HASH_SECRET || 'secret-salt')
            .digest('hex')
            .substring(0, 10); // Take first 10 chars for brevity
    }
}