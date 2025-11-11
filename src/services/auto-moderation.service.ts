import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Confession, ConfessionStatus } from '@app/entities/confession.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageQueue } from './message-queue.service';
import { ModerationService } from './moderation.service';
import { ConfessionService } from './confession.service';
import { ConfessionFormatter } from '@app/utils/confession-formatter';

@Injectable()
export class AutoModerationService {
    private readonly logger = new Logger(AutoModerationService.name);
    private readonly confessionChannelId: string;
    private readonly isEnabled: boolean;

    constructor(
        private configService: ConfigService,
        private moderationService: ModerationService,
        private confessionService: ConfessionService,
        private messageQueue: MessageQueue,
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>
    ) {
        this.confessionChannelId = this.configService.get<string>('CONFESSION_CHANNEL_ID');
        // Kiểm tra xem tính năng tự động kiểm duyệt có được bật không
        this.isEnabled = this.configService.get<string>('AUTO_MODERATION_ENABLED') === 'true';
    }

    /**
     * Xử lý tự động phê duyệt hoặc từ chối confession dựa trên kết quả kiểm duyệt
     * @param confession Confession cần được xử lý
     * @param moderationResult Kết quả kiểm duyệt từ ModerationService
     * @returns Confession đã được xử lý
     */
    async processAutoModeration(confession: Confession, moderationResult: any): Promise<Confession> {
        // Log trạng thái tự động kiểm duyệt và quyết định
        this.logger.log(`Auto moderation for confession ${confession.id}: enabled=${this.isEnabled}, autoDecision=${moderationResult.autoDecision || 'none'}`);
        
        if (!this.isEnabled) {
            this.logger.log(`Auto moderation is disabled in configuration. Confession ${confession.id} needs manual review.`);
            return confession;
        }
        
        if (!moderationResult.autoDecision || moderationResult.autoDecision === 'manual') {
            // Nếu cần kiểm duyệt thủ công, không xử lý
            this.logger.log(`Confession ${confession.id} cần được kiểm duyệt thủ công với lý do: ${moderationResult.reason || 'Không xác định'}`);
            return confession;
        }

        try {
            // Cập nhật tags nếu có từ kết quả kiểm duyệt
            if (moderationResult.tags && Array.isArray(moderationResult.tags) && moderationResult.tags.length > 0) {
                this.logger.log(`Updating tags for confession ${confession.id}: ${JSON.stringify(moderationResult.tags)}`);
                confession = await this.confessionService.updateTags(confession.id, moderationResult.tags);
            }
            
            // Xử lý tự động phê duyệt hoặc từ chối
            if (moderationResult.autoDecision === 'approve') {
                // Cập nhật trạng thái confession
                const moderationComment = `✅ Tự động phê duyệt: ${moderationResult.reason || 'Nội dung phù hợp'}`;
                confession = await this.confessionService.updateStatus(
                    confession.id, 
                    ConfessionStatus.APPROVED, 
                    moderationComment
                );
                
                // Gửi confession đã được phê duyệt đến kênh confession
                await this.sendApprovedConfession(confession);
                
                this.logger.log(`Confession ${confession.id} được tự động phê duyệt. Lý do: ${moderationResult.reason}`);
                
                // Gửi thông báo về quyết định tự động tới kênh moderation
                await this.sendAutoModerationNotice(
                    confession,
                    'APPROVED',
                    moderationResult.reason || 'Nội dung phù hợp',
                    moderationResult.tags || []
                );
                
            } else if (moderationResult.autoDecision === 'reject') {
                // Cập nhật trạng thái confession
                const moderationComment = `❌ Tự động từ chối: ${moderationResult.reason || 'Nội dung không phù hợp'}`;
                confession = await this.confessionService.updateStatus(
                    confession.id, 
                    ConfessionStatus.REJECTED, 
                    moderationComment
                );
                
                this.logger.log(`Confession ${confession.id} bị tự động từ chối. Lý do: ${moderationResult.reason}`);
                
                // Gửi thông báo về quyết định tự động tới kênh moderation
                await this.sendAutoModerationNotice(
                    confession,
                    'REJECTED',
                    moderationResult.reason || 'Nội dung không phù hợp',
                    moderationResult.tags || []
                );
            }
        } catch (error) {
            this.logger.error(`Lỗi khi xử lý tự động confession ${confession.id}`, error);
        }

        return confession;
    }

    /**
     * Gửi confession đã được phê duyệt đến kênh confession
     * @param confession Confession đã được phê duyệt
     */
    private async sendApprovedConfession(confession: Confession): Promise<void> {
        try {
            // Sử dụng utility để tạo tin nhắn tiêu đề và tin nhắn confession
            const [headerMessage, confessionMessage] = ConfessionFormatter.createHeaderAndConfessionMessages(
                confession, 
                this.confessionChannelId
            );
            
            // Thêm tin nhắn tiêu đề vào hàng đợi trước
            this.messageQueue.addMessage(headerMessage);
            
            // Thêm tin nhắn confession vào hàng đợi sau (sẽ trả lời tin nhắn tiêu đề)
            this.messageQueue.addMessage(confessionMessage);
            
            this.logger.log(`Added header message and confession #${confession.confessionNumber} to the queue for auto-approved confession`);
            
            // Cập nhật thông tin về thời gian đăng và kênh đăng
            confession.postedAt = new Date();
            confession.channelId = this.confessionChannelId;
            await this.confessionRepository.save(confession);
            
        } catch (error) {
            this.logger.error(`Lỗi khi gửi confession đã phê duyệt ${confession.id}`, error);
        }
    }
    
    /**
     * Gửi thông báo về quyết định tự động đến kênh kiểm duyệt
     * @param confession Confession đã được xử lý
     * @param decision Quyết định (APPROVED hoặc REJECTED)
     * @param reason Lý do cho quyết định
     * @param tags Tags được gắn vào confession
     */
    private async sendAutoModerationNotice(
        confession: Confession,
        decision: 'APPROVED' | 'REJECTED',
        reason: string,
        tags: string[]
    ): Promise<void> {
        const moderationChannelId = this.configService.get<string>('MODERATION_CHANNEL_ID');
        
        if (!moderationChannelId) {
            this.logger.error('Không thể gửi thông báo tự động kiểm duyệt: ID kênh kiểm duyệt không được cấu hình');
            return;
        }
        
        const confessionId = confession.id.substring(0, 8).toUpperCase();
        const confessionNumber = confession.confessionNumber || 'N/A';
        const emoji = decision === 'APPROVED' ? '✅' : '❌';
        const color = decision === 'APPROVED' ? '2ecc71' : 'e74c3c';
        const action = decision === 'APPROVED' ? 'phê duyệt' : 'từ chối';
        
        // Hiển thị toàn bộ nội dung khi reject, chỉ hiển thị tóm tắt khi approve
        const showFullContent = decision === 'REJECTED';
        
        const messageContent = [
            `**${emoji} Tự động ${action} confession #${confessionNumber}**`,
            '',
            '```',
            showFullContent ? confession.content : confession.content.slice(0, 200) + (confession.content.length > 200 ? '...' : ''),
            '```',
            '',
            `**Lý do:** ${reason}`,
            '**Tags:** ' + (tags && tags.length ? tags.map(tag => `#${tag}`).join(' ') : 'Không có')
        ].join('\n');
        
        const noticeMessage = {
            channel_id: moderationChannelId,
            msg: {
                t: messageContent
            },
            mentions: [],
            attachments: []
        };
        
        this.logger.log(`Gửi thông báo tự động ${action} đến kênh kiểm duyệt cho confession ${confessionNumber}`);
        this.messageQueue.addMessage(noticeMessage);
    }
}