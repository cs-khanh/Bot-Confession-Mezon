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
        
        // Get the next confession number
        const nextNumber = await this.getNextConfessionNumber();
        
        const confession = this.confessionRepository.create({
            content,
            authorHash,
            confessionNumber: nextNumber,
            status: ConfessionStatus.PENDING,
            tags: null, // Initialize as null instead of empty array to avoid TypeORM issues
            attachments: attachments || null, // Add attachments if provided
        });
        
        return this.confessionRepository.save(confession);
    }
    
    /**
     * Get the next sequential confession number
     */
    private async getNextConfessionNumber(): Promise<number> {
        // Find the confession with the highest number
        const result = await this.confessionRepository.createQueryBuilder('confession')
            .select('MAX(confession.confession_number)', 'maxNumber')
            .getRawOne();
            
        const maxNumber = result?.maxNumber || 0;
        return maxNumber + 1; // Return next number in sequence
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

    async updateConfessionReactions(confessionId: string, messageId: string, directCount?: number): Promise<void> {
        try {
            this.logger.log(`Updating reactions for confession: ${confessionId}, message: ${messageId}`);
            
            // Tìm confession theo ID
            const confession = await this.confessionRepository.findOne({ 
                where: { id: confessionId, messageId }
            });
            
            if (!confession) {
                this.logger.warn(`No confession found with ID: ${confessionId} and messageId: ${messageId}`);
                return;
            }
            
            // Nếu có số đếm trực tiếp, sử dụng nó
            if (directCount !== undefined) {
                confession.reactionCount = directCount;
                this.logger.log(`Setting direct reaction count: ${directCount}`);
            } else {
                // Nếu không có số trực tiếp, chúng ta cộng thêm 1
                confession.reactionCount = confession.reactionCount + 1;
            }
            
            // Cập nhật confession
            await this.confessionRepository.save(confession);
            
            this.logger.log(`Successfully updated confession reactions. New count: ${confession.reactionCount}`);
            
        } catch (error) {
            this.logger.error(`Error updating confession reactions: ${error.message}`, error.stack);
        }
    }
    
    /**
     * Cập nhật số lượng reaction từ thông tin trực tiếp từ Mezon SDK
     */
    async updateConfessionReactionsDirect(messageId: string, totalReactions: number): Promise<void> {
        try {
            this.logger.log(`[REACTION UPDATE] Updating reactions for message ${messageId} with count ${totalReactions}`);
            
            // Tìm confession theo message ID
            const confession = await this.confessionRepository.findOne({ 
                where: { messageId }
            });
            
            if (!confession) {
                this.logger.warn(`[REACTION UPDATE] No confession found for messageId: ${messageId}`);
                return;
            }
            
            this.logger.log(`[REACTION UPDATE] Found confession #${confession.confessionNumber} with current reaction count: ${confession.reactionCount}`);
            
            // Chỉ cập nhật nếu số lượng reaction mới lớn hơn hoặc bằng số hiện tại
            // Điều này ngăn chặn việc "giảm" số reaction không đúng khi gặp dữ liệu cũ
            const previousCount = confession.reactionCount;
            
            if (totalReactions >= previousCount) {
                confession.reactionCount = totalReactions;
                
                // Lưu confession
                await this.confessionRepository.save(confession);
                
                this.logger.log(`[REACTION UPDATE] Updated confession #${confession.confessionNumber} (${confession.id}): reaction count increased from ${previousCount} to ${totalReactions}`);
            } else {
                this.logger.warn(`[REACTION UPDATE] Ignoring update: new count ${totalReactions} is less than current count ${previousCount} for confession #${confession.confessionNumber}`);
                
                // Nếu có sự khác biệt lớn, có thể có vấn đề đồng bộ hóa dữ liệu
                if (previousCount - totalReactions > 5) {
                    this.logger.warn(`[REACTION UPDATE] Large discrepancy detected between counts: current=${previousCount}, new=${totalReactions}, difference=${previousCount - totalReactions}`);
                }
            }
        } catch (error) {
            this.logger.error(`[REACTION UPDATE] Error in reaction update: ${error.message}`, error.stack);
        }
    }
    
    /**
     * Cập nhật số lượng reaction của tất cả confession từ reaction logs
     */
    async updateAllConfessionReactions(): Promise<void> {
        try {
            this.logger.log('Cập nhật reaction cho tất cả confession từ logs...');
            
            // Lấy tất cả reaction logs
            const reactionLogs = await this.reactionLogRepository.find();
            
            // Dùng Map để lưu số reaction theo messageId
            const reactionCounts = new Map<string, number>();
            
            // Tính toán tổng số reaction cho mỗi message
            for (const log of reactionLogs) {
                if (log.messageId && log.reactions) {
                    const total = Object.values(log.reactions)
                        .reduce((sum, count) => sum + (count || 0), 0);
                    
                    reactionCounts.set(log.messageId, total);
                }
            }
            
            // Cập nhật các confession
            for (const [messageId, count] of reactionCounts.entries()) {
                await this.updateConfessionReactionsDirect(messageId, count);
            }
            
            this.logger.log(`Đã cập nhật reaction cho ${reactionCounts.size} confession`);
        } catch (error) {
            this.logger.error(`Error updating all confession reactions: ${error.message}`, error.stack);
        }
    }
    
    /**
     * Lấy chi tiết về các loại reaction của một confession
     */
    async getConfessionReactionDetails(confessionId: string): Promise<{ [key: string]: number } | null> {
        try {
            // Tìm confession
            const confession = await this.confessionRepository.findOne({
                where: { id: confessionId }
            });
            
            if (!confession || !confession.messageId) {
                return null;
            }
            
            // Tìm reaction log
            const reactionLog = await this.reactionLogRepository.findOne({
                where: { confessionId, messageId: confession.messageId }
            });
            
            if (!reactionLog || !reactionLog.reactions) {
                return null;
            }
            
            return reactionLog.reactions;
        } catch (error) {
            this.logger.error(`Error getting reaction details: ${error.message}`, error.stack);
            return null;
        }
    }
    
    /**
     * Lấy danh sách các confession cùng với chi tiết reaction
     */
    async getTopConfessionsWithReactionDetails(options: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<Array<Confession & { reactionDetails?: { [key: string]: number } }>> {
        // Lấy danh sách confession
        const confessions = await this.getTopConfessions(options);
        
        this.logger.log(`Retrieved ${confessions.length} top confessions with details`);
        
        // Thêm chi tiết về reaction
        const result = await Promise.all(
            confessions.map(async (confession) => {
                this.logger.log(`Processing confession #${confession.confessionNumber} for reaction details`);
                
                // Tìm reaction log
                let reactionDetails = null;
                
                if (confession.messageId) {
                    this.logger.log(`Looking up reactions for message ID: ${confession.messageId}`);
                    const log = await this.reactionLogRepository.findOne({
                        where: { messageId: confession.messageId }
                    });
                    
                    if (log && log.reactions) {
                        // Đảm bảo rằng tất cả giá trị là số hợp lệ
                        const processedReactions: { [key: string]: number } = {};
                        
                        for (const [emoji, count] of Object.entries(log.reactions)) {
                            if (typeof count === 'number') {
                                processedReactions[emoji] = Math.floor(count);
                            } else if (typeof count === 'string') {
                                processedReactions[emoji] = parseInt(count);
                            } else {
                                processedReactions[emoji] = 0;
                            }
                        }
                        
                        reactionDetails = processedReactions;
                        this.logger.log(`Confession #${confession.confessionNumber} has reactions: ${JSON.stringify(reactionDetails)}`);
                    } else {
                        this.logger.log(`No reaction log found for message ID: ${confession.messageId}`);
                    }
                }
                
                this.logger.log(`Finished processing confession #${confession.confessionNumber}`);
                
                return {
                    ...confession,
                    reactionDetails
                };
            })
        );
        
        return result;
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
        
        try {
            // Trước khi lấy danh sách, cập nhật lại reaction count
            await this.updateAllConfessionReactions();
        
            // Lấy danh sách confession được chấp nhận và có messageId (đã đăng)
            const query = this.confessionRepository
                .createQueryBuilder('confession')
                .select([
                    'confession.id',
                    'confession.confessionNumber',
                    'confession.content',
                    'confession.messageId',
                    'confession.postedAt',
                    'confession.reactionCount',
                    'confession.tags'
                ])
                .where('confession.status = :status', { status: ConfessionStatus.APPROVED })
                .andWhere('confession.messageId IS NOT NULL')  // Đảm bảo đã được đăng
                .orderBy('confession.reactionCount', 'DESC')
                .take(limit);
            
            if (startDate) {
                query.andWhere('confession.postedAt >= :startDate', { startDate });
            }
            
            if (endDate) {
                query.andWhere('confession.postedAt <= :endDate', { endDate });
            }
            
            const confessions = await query.getMany();
            
            // Log kết quả để debug
            this.logger.log(`Found ${confessions.length} top confessions.`);
            if (confessions.length > 0) {
                confessions.forEach((confession, i) => {
                    this.logger.log(`Top #${i+1}: Confession #${confession.confessionNumber} (ID: ${confession.id}) has ${confession.reactionCount} reactions`);
                });
            }
            
            return confessions;
        } catch (error) {
            this.logger.error(`Error fetching top confessions: ${error.message}`, error.stack);
            return [];
        }
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