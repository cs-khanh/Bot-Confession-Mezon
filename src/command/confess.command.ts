import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { ModerationService } from '@app/services/moderation.service';
import { ConfessionService } from '@app/services/confession.service';
import { MessageQueue } from '@app/services/message-queue.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { AutoModerationService } from '@app/services/auto-moderation.service';
import { ConfessionStatus } from '@app/entities/confession.entity';

@Injectable()
@Command('confess', {
    description: 'Submit an anonymous confession to the channel',
    usage: '!confess Your confession text here',
    category: 'Confession',
    aliases: ['cf'],
})
export class ConfessCommand extends CommandMessage {
    private readonly logger = new Logger(ConfessCommand.name);
    private readonly confessionChannelId: string;
    private readonly adminChannelId: string;
    private readonly directMessageEnabled: boolean;

    constructor(
        private moderationService: ModerationService,
        private confessionService: ConfessionService,
        private messageQueue: MessageQueue,
        private configService: ConfigService,
        private autoModerationService: AutoModerationService
    ) {
        super();
        this.confessionChannelId = this.configService.get<string>('CONFESSION_CHANNEL_ID');
        this.adminChannelId = this.configService.get<string>('MODERATION_CHANNEL_ID');
        this.directMessageEnabled = true; // Direct messages are always enabled for confessions
    }

    async execute(args: string[], message: ChannelMessage) {
        // Check if any content was provided
        if (args.length === 0 && (!message.attachments || message.attachments.length === 0)) {
            return this.replyMessageGenerate({
                messageContent: 'Please include your confession text or image. Example: `!confess Your confession text here`'
            }, message);
        }

        // Join all arguments as the confession content
        const content = args.join(' ');
        
        // Get any attachments from the message and validate them
        const rawAttachments = message.attachments || [];
        const validAttachments = rawAttachments.filter(att => att && att.url);
        
        // Log thông tin về attachments để debug
        console.log(`Received confession with ${rawAttachments.length} attachments, ${validAttachments.length} valid`);
        if (rawAttachments.length > 0) {
            console.log(`First attachment info: ${JSON.stringify(rawAttachments[0])}`);
        }
        
        // Chỉ sử dụng các attachment hợp lệ
        const attachments = validAttachments;
        
        // Check if content is too short and no attachments provided
        if (content.length < 10 && attachments.length === 0) {
            return this.replyMessageGenerate({
                messageContent: 'Your confession is too short. Please provide a more detailed confession or add an image.'
            }, message);
        }
        
        // If there's only an attachment but no text, set a default text
        const finalContent = (content.length === 0 && attachments.length > 0) 
            ? "[Image confession]" 
            : content;

        try {
            // Create a tracking ID for this confession
            const confessionTrackingId = `conf-${Date.now().toString().substring(6)}`;
            
            // Moderate text content and images if present
            this.logger.log(`[${confessionTrackingId}] Starting moderation for confession: text=${finalContent.length} chars, attachments=${attachments.length}`);
            
            // Log attachment details
            if (attachments.length > 0) {
                attachments.forEach((att, idx) => {
                    // Use type assertion to handle different attachment structures
                    const attAny = att as any;
                    // Try to extract type from various possible properties
                    const attType = attAny.mime_type || attAny.mimeType || attAny.type || attAny.content_type || 'unknown';
                    const urlPreview = att.url ? `${att.url.substring(0, 30)}...` : 'missing URL';
                    this.logger.log(`[${confessionTrackingId}] Attachment #${idx+1}: Type=${attType}, URL=${urlPreview}`);
                });
            }
            
            const moderationStart = Date.now();
            const moderationResult = await this.moderationService.moderateContent(finalContent, attachments);
            const moderationTime = Date.now() - moderationStart;
            
            // Log kết quả moderation để debug
            this.logger.log(`[${confessionTrackingId}] Moderation completed in ${moderationTime}ms: isSpam=${moderationResult.isSpam}, isToxic=${moderationResult.isToxic}, autoDecision=${moderationResult.autoDecision || 'none'}, hasImage=${moderationResult.hasImageContent || false}, imageSuccess=${moderationResult.imageAnalysisSuccess || false}`);
            
            // Log detailed explanation if we got an empty response
            if (moderationResult.reason && moderationResult.reason.includes('Empty response')) {
                this.logger.warn(`[${confessionTrackingId}] Received empty API response from moderation service. This might indicate an issue with the API or with the format of the content.`);
            }
            
            // Check if content violates moderation rules
            if (moderationResult.isSpam || moderationResult.isToxic) {
                const reason = moderationResult.reason || (moderationResult.isSpam ? 'spam' : 'toxic content');
                
                // Lưu confession vào DB và đánh dấu là REJECTED
                const authorId = message.sender_id || 'anonymous';
                let confession = await this.confessionService.create(finalContent, authorId, attachments);
                confession = await this.confessionService.updateStatus(
                    confession.id, 
                    ConfessionStatus.REJECTED, 
                    `Rejected automatically due to ${reason}`
                );
                
                // Gửi thông báo về nội dung bị từ chối đến kênh kiểm duyệt
                await this.sendToAdminChannel(confession, message.message_id, true, reason);
                
                // Thông báo cho người dùng
                return this.replyMessageGenerate({
                    messageContent: `Confession của bạn đã bị từ chối vì chứa ${reason}. Vui lòng xem lại quy định của cộng đồng.`
                }, message);
            }
            
            // Get IP or unique identifier for the user (from message or sender_id)
            const authorId = message.sender_id || 'anonymous';
            
            // Store confession in database with any attachments
            let confession = await this.confessionService.create(finalContent, authorId, attachments);
            
            // Add tags from moderation
            if (moderationResult.tags && moderationResult.tags.length > 0) {
                // Lọc các tags trùng lặp và chuẩn hóa
                const uniqueTags = [...new Set(
                    moderationResult.tags
                        .map(tag => tag.toLowerCase().trim())
                        .filter(tag => tag.length > 0)
                )];
                
                // Cập nhật tags trong database
                confession = await this.confessionService.updateTags(confession.id, uniqueTags);
            }
            
            // Xử lý tự động kiểm duyệt nếu được kích hoạt
            confession = await this.autoModerationService.processAutoModeration(confession, moderationResult);
            
            // Chỉ gửi đến kênh kiểm duyệt nếu confession vẫn ở trạng thái PENDING
            if (confession.status === 'pending') {
                // Send to admin channel for approval
                await this.sendToAdminChannel(confession, message.message_id, false);
            }
            
            console.log(`Confession received: ${confession.id} - ${confession.content} (Status: ${confession.status})`);

            // Nếu confession đã được approve ngay lập tức (auto moderation), thông báo cho người dùng
            if (confession.status === ConfessionStatus.APPROVED) {
                return this.replyMessageGenerate({
                    messageContent: `Cảm ơn bạn! Confession của bạn đã được chấp nhận và đã được đăng lên channel. ID: ${confession.id.substring(0, 8).toUpperCase()}`
                }, message);
            } else if (confession.status === ConfessionStatus.REJECTED) {
                return this.replyMessageGenerate({
                    messageContent: `Confession của bạn đã bị từ chối vì vi phạm quy định. ID: ${confession.id.substring(0, 8).toUpperCase()}`
                }, message);
            } else {
                // Nếu đang pending, thông báo cần chờ kiểm duyệt
                if (this.directMessageEnabled) {
                    return this.replyMessageGenerate({
                        messageContent: `Cảm ơn bạn! Confession của bạn đã được nhận và đang chờ kiểm duyệt. ID: ${confession.id.substring(0, 8).toUpperCase()}`
                    }, message);
                } else {
                    return this.replyMessageGenerate({
                        messageContent: `Cảm ơn bạn! Confession của bạn đã được nhận và đang chờ kiểm duyệt.`
                    }, message);
                }
            }
            
        } catch (error) {
            this.logger.error('Error processing confession', error);
            return this.replyMessageGenerate({
                messageContent: 'Sorry, there was an error processing your confession. Please try again later.'
            }, message);
        }
    }

    private async sendToAdminChannel(
        confession: any, 
        originalMessageId: string, 
        isRejected: boolean = false,
        rejectReason: string = null
    ): Promise<void> {
        // Đảm bảo rằng kênh kiểm duyệt đã được cấu hình
        console.log(`Sending to admin channel: ${this.adminChannelId}`);

        const statusText = isRejected ? '❌ ### Rejected Confession' : '### New Confession';
        const messageLines = [
            `${statusText} (ID: ${confession.id.substring(0, 8).toUpperCase()})`,
            ''
        ];
        
        // Thêm lý do từ chối nếu có
        if (isRejected && rejectReason) {
            messageLines.push(`## Reason: ${rejectReason}`);
            messageLines.push('');
        }
        
        // Thêm nội dung confession
        messageLines.push(confession.content);
        messageLines.push('');
        
        // Không hiển thị nội dung giải mã teencode, chỉ dùng nó để phân tích
        // Giữ nguyên nội dung gốc của confession
        
        // Thêm tags
        if (confession.tags && Array.isArray(confession.tags) && confession.tags.length > 0) {
            const formattedTags = confession.tags.map(tag => `#${tag}`).join(' ');
            messageLines.push(`### Tags: ${formattedTags}`);
        } else {
            // Hiển thị thông báo không có tags
            messageLines.push(`### Tags: Chưa có tags`);
        }
        messageLines.push('');
        
        // Thêm các lệnh nếu không phải confession đã bị từ chối
        if (!isRejected) {
            messageLines.push('To approve: `!approve ' + confession.id + '`');
            messageLines.push('To reject: `!reject ' + confession.id + '`');
        }
        
        const messageText = messageLines.join('\n');

        // Indicate if the confession has attachments
        if (confession.attachments && confession.attachments.length > 0) {
            messageLines.push('');
            messageLines.push(`### Attachments: ${confession.attachments.length} image(s)`);
        }

        const adminMessage = {
            channel_id: this.adminChannelId,
            msg: {
                t: messageText
            },
            mentions: [],
            attachments: confession.attachments || []
        };

        console.log('Adding message to queue:', JSON.stringify(adminMessage));
        this.messageQueue.addMessage(adminMessage);
        
        // Debug logging only, no direct sending
        console.log('Message queued for admin channel:', this.adminChannelId);
    }
}