import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiMessageReaction, Events } from 'mezon-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionLog } from '@app/entities/reaction-log.entity';
import { Confession } from '@app/entities/confession.entity';
import { ERROR_MESSAGES } from '@app/common/constants';
import { ConfessionService } from '@app/services/confession.service';

interface ReactionEvent {
    message_id: string;
    reaction: string;
    count: number;
    user_id?: string;
}

@Injectable()
export class EventListenerReaction {
    private readonly logger = new Logger(EventListenerReaction.name);
    
    constructor(
        @InjectRepository(ReactionLog)
        private reactionLogRepository: Repository<ReactionLog>,
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        private confessionService: ConfessionService,
    ) {}
    
    /**
     * Chuẩn hóa định dạng emoji reaction để lưu trữ thống nhất
     * @param reaction - Emoji reaction từ sự kiện Discord
     * @returns Định dạng chuẩn hóa của emoji
     */
    private normalizeEmojiReaction(reaction: string): string {
        // Nếu đã là định dạng :name: giữ nguyên
        if (reaction.startsWith(':') && reaction.endsWith(':')) {
            return reaction;
        }
        
        // Emoji Unicode tiêu chuẩn, giữ nguyên
        if (!reaction.includes('<') && !reaction.includes('>')) {
            return reaction;
        }
        
        // Xử lý emoji tùy chỉnh với định dạng <:name:id>
        const emojiMatch = reaction.match(/<:([^:]+):\d+>/);
        if (emojiMatch) {
            return `:${emojiMatch[1]}:`;
        }
        
        // Xử lý emoji hoạt ảnh với định dạng <a:name:id>
        const animatedMatch = reaction.match(/<a:([^:]+):\d+>/);
        if (animatedMatch) {
            return `:${animatedMatch[1]}:`;
        }
        
        // Trường hợp khác, giữ nguyên
        return reaction;
    }

    @OnEvent(Events.MessageReaction)
    async handleReactionEvent(msg: ApiMessageReaction): Promise<void> {
        this.logger.log(`[REACTION HANDLER] Processing reaction event: ${JSON.stringify(msg)}`);
        
        try {
            // Lấy messageId từ sự kiện
            const messageId = msg.message_id;
            if (!messageId) {
                this.logger.warn(`[REACTION HANDLER] Message ID is missing in reaction event`);
                return;
            }
            
            // Tìm confession liên quan
            const confession = await this.confessionRepository.findOne({
                where: { messageId }
            });
            
            if (!confession) {
                this.logger.warn(`[REACTION HANDLER] No confession found for message ID: ${messageId}`);
                return;
            }
            
            this.logger.log(`[REACTION HANDLER] Found confession #${confession.confessionNumber} for message ID: ${messageId}`);
            
            // Trích xuất thông tin về reaction từ sự kiện
            const totalCount = this.extractTotalReactions(msg);
            this.logger.log(`[REACTION HANDLER] Extracted total reaction count: ${totalCount}`);
            
            // Nếu có thông tin về tổng số reaction
            if (totalCount !== null) {
                // Cập nhật trực tiếp số lượng reaction
                await this.confessionService.updateConfessionReactionsDirect(messageId, totalCount);
                this.logger.log(`[REACTION HANDLER] Direct update: Set confession #${confession.confessionNumber} (${confession.id}) to ${totalCount} reactions`);
            } else {
                // Nếu không có thông tin rõ ràng, thử phân tích sâu hơn
                this.logger.log(`[REACTION HANDLER] No direct count available, analyzing reaction structure...`);
                await this.analyzeAndUpdateReactions(msg, confession);
            }
        } catch (error) {
            this.logger.error(`[REACTION HANDLER] Error in reaction event handler: ${error.message}`, error.stack);
        }
    }
    
    /**
     * Phương thức trích xuất tổng số reaction từ sự kiện
     */
    private extractTotalReactions(msg: ApiMessageReaction): number | null {
        try {
            this.logger.log(`[REACTION EXTRACT] Analyzing message structure: ${JSON.stringify(msg)}`);
            
            // Thử các cấu trúc có thể có của API message reaction
            
            // Trường hợp 1: có thuộc tính count hoặc totalCount
            if ((msg as any).count !== undefined) {
                this.logger.log(`[REACTION EXTRACT] Found direct count: ${(msg as any).count}`);
                return (msg as any).count;
            }
            
            if ((msg as any).totalCount !== undefined) {
                this.logger.log(`[REACTION EXTRACT] Found totalCount: ${(msg as any).totalCount}`);
                return (msg as any).totalCount;
            }
            
            // Trường hợp 2: có thuộc tính reactions là object với các counts
            if ((msg as any).reactions && typeof (msg as any).reactions === 'object') {
                let total = 0;
                const reactionsObj = (msg as any).reactions;
                
                // Log details about the reactions object for debugging
                this.logger.log(`[REACTION EXTRACT] Found reactions object: ${JSON.stringify(reactionsObj)}`);
                
                for (const key in reactionsObj) {
                    if (typeof reactionsObj[key] === 'number') {
                        // Normalize the emoji key for consistency
                        const normalizedKey = this.normalizeEmojiReaction(key);
                        this.logger.log(`[REACTION EXTRACT] Reaction: ${key} (normalized: ${normalizedKey}) count: ${reactionsObj[key]}`);
                        total += reactionsObj[key];
                    }
                }
                this.logger.log(`[REACTION EXTRACT] Total count from reactions object: ${total}`);
                return total;
            }
            
            // Trường hợp 3: Kiểm tra cấu trúc data.reactions
            if ((msg as any).data && (msg as any).data.reactions && typeof (msg as any).data.reactions === 'object') {
                let total = 0;
                const reactionsObj = (msg as any).data.reactions;
                
                this.logger.log(`[REACTION EXTRACT] Found data.reactions object: ${JSON.stringify(reactionsObj)}`);
                
                for (const key in reactionsObj) {
                    if (typeof reactionsObj[key] === 'number') {
                        const normalizedKey = this.normalizeEmojiReaction(key);
                        this.logger.log(`[REACTION EXTRACT] Reaction: ${key} (normalized: ${normalizedKey}) count: ${reactionsObj[key]}`);
                        total += reactionsObj[key];
                    }
                }
                this.logger.log(`[REACTION EXTRACT] Total count from data.reactions: ${total}`);
                return total;
            }
            
            // Không tìm thấy thông tin rõ ràng
            return null;
        } catch (error) {
            this.logger.error(`Error extracting reactions: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Phân tích sâu hơn và cập nhật reaction nếu có thể
     */
    private async analyzeAndUpdateReactions(msg: ApiMessageReaction, confession: Confession): Promise<void> {
        try {
            // Kiểm tra xem msg có chứa thông tin reaction chi tiết hay không
            if ((msg as any).reactions && typeof (msg as any).reactions === 'object') {
                const reactionsObj = (msg as any).reactions;
                const normalizedReactions: { [key: string]: number } = {};
                
                // Log chi tiết về object reaction để debug
                this.logger.debug(`Raw reaction object: ${JSON.stringify(reactionsObj)}`);
                
                // Chuẩn hóa các emoji và tổng hợp số lượng
                for (const key in reactionsObj) {
                    // Đảm bảo giá trị là số và lớn hơn 0
                    const rawCount = reactionsObj[key];
                    let numCount = 0;
                    
                    if (typeof rawCount === 'number') {
                        numCount = Math.floor(rawCount);
                    } else if (typeof rawCount === 'string') {
                        numCount = parseInt(rawCount);
                    } else if (rawCount && typeof rawCount === 'object' && 'count' in rawCount) {
                        // Trường hợp { count: number }
                        numCount = typeof rawCount.count === 'number' ? Math.floor(rawCount.count) : 0;
                    }
                    
                    if (numCount > 0) {
                        const normalizedKey = this.normalizeEmojiReaction(key);
                        normalizedReactions[normalizedKey] = numCount;
                        this.logger.debug(`Normalized reaction: ${normalizedKey} => ${numCount}`);
                    }
                }
                
                // Tìm hoặc tạo reaction log
                let reactionLog = await this.reactionLogRepository.findOne({
                    where: { messageId: msg.message_id }
                });
                
                // Tính tổng số reaction
                const totalCount = Object.values(normalizedReactions).reduce((sum, count) => sum + (count || 0), 0);
                this.logger.debug(`Total calculated reactions: ${totalCount}`);
                
                if (!reactionLog) {
                    reactionLog = this.reactionLogRepository.create({
                        messageId: msg.message_id,
                        confessionId: confession.id,
                        reactions: normalizedReactions,
                        totalCount: totalCount
                    });
                } else {
                    // Cập nhật với thông tin mới
                    reactionLog.reactions = normalizedReactions;
                    reactionLog.totalCount = totalCount;
                }
                
                // Lưu vào DB
                await this.reactionLogRepository.save(reactionLog);
                
                // Cập nhật confession
                confession.reactionCount = reactionLog.totalCount;
                await this.confessionRepository.save(confession);
                
                this.logger.log(`Updated confession ${confession.id} with ${reactionLog.totalCount} reactions from API data`);
                
            } else {
                // Thử lấy thông tin reaction từ DB nếu không có trong API
                const reactionLog = await this.reactionLogRepository.findOne({
                    where: { messageId: msg.message_id }
                });
                
                // Nếu đã có log reaction, sử dụng thông tin từ đó
                if (reactionLog && reactionLog.reactions) {
                    // Cập nhật dựa trên dữ liệu hiện có trong DB
                    const totalCount = Object.values(reactionLog.reactions)
                        .reduce((sum: number, count: number) => sum + count, 0);
                    
                    // Cập nhật confession
                    confession.reactionCount = totalCount;
                    await this.confessionRepository.save(confession);
                    
                    this.logger.log(`Updated confession ${confession.id} with ${totalCount} reactions from DB`);
                } else {
                    // Không có thông tin gì để cập nhật
                    this.logger.warn(`No reaction info available for confession ${confession.id}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error analyzing reactions: ${error.message}`);
        }
    }

    @OnEvent('reaction.add')
    async handleReactionAdd(event: ReactionEvent): Promise<void> {
        this.logger.debug(`Reaction add event: ${JSON.stringify(event)}`);
        await this.processReaction(event, 'add');
    }

    @OnEvent('reaction.remove')
    async handleReactionRemove(event: ReactionEvent): Promise<void> {
        this.logger.debug(`Reaction remove event: ${JSON.stringify(event)}`);
        await this.processReaction(event, 'remove');
    }

    private async processReaction(event: ReactionEvent, action: 'add' | 'remove'): Promise<void> {
        try {
            const { message_id, reaction, count } = event;
            this.logger.log(`Processing ${action} reaction: ${reaction} with count ${count} for message ${message_id}`);
            
            // Tìm confession theo message ID
            const confession = await this.confessionRepository.findOne({
                where: { messageId: message_id }
            });
            
            if (!confession) {
                this.logger.warn(`No confession found for message ID: ${message_id}`);
                return;
            }
            
            this.logger.log(`Found confession #${confession.confessionNumber} for message ID: ${message_id}`);
            
            // Lấy hoặc tạo reaction log mới
            let reactionLog = await this.reactionLogRepository.findOne({
                where: { messageId: message_id }
            });
            
            if (!reactionLog) {
                reactionLog = this.reactionLogRepository.create({
                    messageId: message_id,
                    confessionId: confession?.id || null,
                    reactions: {},
                    totalCount: 0
                });
                this.logger.log(`Created new reaction log for message ID: ${message_id}`);
            }
            
            // Nếu reactions chưa được khởi tạo
            if (!reactionLog.reactions) {
                reactionLog.reactions = {};
            }
            
            // Xử lý định dạng của emoji reaction
            const normalizedReaction = this.normalizeEmojiReaction(reaction);
            this.logger.debug(`Normalized reaction: ${normalizedReaction} from ${reaction}`);
            
            // Đảm bảo count là một số nguyên hợp lệ
            const numCount = typeof count === 'number' ? Math.floor(count) : 
                             typeof count === 'string' ? parseInt(count) : 0;
            this.logger.debug(`Reaction count (parsed): ${numCount} (original: ${count})`);
            
            // Log trạng thái hiện tại trước khi thay đổi
            const previousCount = reactionLog.reactions[normalizedReaction] || 0;
            this.logger.log(`Previous count for ${normalizedReaction}: ${previousCount}, new count: ${numCount}`);
            
            // Cập nhật số lượng reaction
            if (action === 'add') {
                // Khi thêm reaction, chỉ cập nhật nếu count mới lớn hơn hoặc bằng count hiện tại
                if (numCount >= previousCount) {
                    reactionLog.reactions[normalizedReaction] = numCount;
                    this.logger.log(`Updated reaction ${normalizedReaction} from ${previousCount} to ${numCount}`);
                } else {
                    this.logger.warn(`Ignoring update: new count ${numCount} is less than current count ${previousCount} for ${normalizedReaction}`);
                }
            } else {
                // Xóa reaction nếu count = 0, nếu không thì cập nhật
                if (numCount === 0) {
                    delete reactionLog.reactions[normalizedReaction];
                    this.logger.log(`Removed reaction ${normalizedReaction}`);
                } else {
                    reactionLog.reactions[normalizedReaction] = numCount;
                    this.logger.log(`Updated reaction ${normalizedReaction} to ${numCount} (remove event with count > 0)`);
                }
            }
            
            // Log chi tiết về reactions
            this.logger.log(`Current reactions after update: ${JSON.stringify(reactionLog.reactions)}`);
            
            // Tính tổng số reaction với kiểm tra kiểu dữ liệu
            const totalReactions = Object.values(reactionLog.reactions)
                .reduce((sum: number, c: unknown) => {
                    // Đảm bảo c là số hợp lệ
                    let value = 0;
                    if (typeof c === 'number') {
                        value = Math.floor(c);
                    } else if (typeof c === 'string') {
                        value = parseInt(c);
                    }
                    return sum + value;
                }, 0);
            
            const previousTotal = reactionLog.totalCount || 0;    
            reactionLog.totalCount = totalReactions;
            
            this.logger.log(`Total reactions: Changed from ${previousTotal} to ${totalReactions}`);
            this.logger.log(`Reaction details: ${JSON.stringify(reactionLog.reactions)}`);
            
            // Lưu reaction log
            await this.reactionLogRepository.save(reactionLog);
            
            // Nếu đây là confession, cập nhật số lượng reaction
            if (confession) {
                const previousConfessionCount = confession.reactionCount;
                
                // Cập nhật trực tiếp
                confession.reactionCount = totalReactions;
                await this.confessionRepository.save(confession);
                
                this.logger.log(`Updated confession #${confession.confessionNumber} (${confession.id}): reactions changed from ${previousConfessionCount} to ${totalReactions}`);
            }
            
        } catch (error) {
            this.logger.error('Error processing reaction event', error);
        }
    }
}