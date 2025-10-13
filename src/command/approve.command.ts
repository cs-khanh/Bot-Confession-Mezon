import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { ConfessionService } from '@app/services/confession.service';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { ConfessionStatus, Confession } from '@app/entities/confession.entity';
import { MessageQueue } from '@app/services/message-queue.service';
import { AdminService } from '@app/services/admin.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfessionFormatter } from '@app/utils/confession-formatter';

@Injectable()
@Command('approve', {
    description: 'Approve a confession for posting',
    usage: '!approve [confession_id] [optional_comment]',
    category: 'Moderation',
    aliases: ['accept'],
    permissions: ['admin'],
})
export class ApproveCommand extends CommandMessage {
    private readonly logger = new Logger(ApproveCommand.name);
    private readonly confessionChannelId: string;

    constructor(
        private confessionService: ConfessionService,
        private messageQueue: MessageQueue,
        private configService: ConfigService,
        private adminService: AdminService,
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>
    ) {
        super();
        this.confessionChannelId = this.configService.get<string>('CONFESSION_CHANNEL_ID');
    }

    async execute(args: string[], message: ChannelMessage) {
        // Kiểm tra xem người dùng có quyền quản trị viên không
        if (!this.adminService.isAdmin(message.sender_id)) {
            return this.replyMessageGenerate({
                messageContent: 'Bạn không có quyền sử dụng lệnh này. Chỉ quản trị viên mới có thể phê duyệt Confession.'
            }, message);
        }

        // Check for required parameters
        if (args.length === 0) {
            return this.replyMessageGenerate({
                messageContent: 'Please provide the confession ID to approve. Usage: `!approve [confession_id] [optional_comment]`'
            }, message);
        }

        // Lấy UUID hoặc phần đầu UUID nếu người dùng chỉ cung cấp một phần
        const confessionIdInput = args[0];
        // Get optional comment (all arguments after the first one)
        const moderationComment = args.length > 1 ? args.slice(1).join(' ') : null;
        
        try {
            // Tìm Confession dựa trên ID hoặc phần đầu của ID
            let confession;
            
            // Kiểm tra xem đầu vào có phải là số không (confession number)
            if (!isNaN(Number(confessionIdInput))) {
                const confessionNumber = Number(confessionIdInput);
                confession = await this.confessionRepository.findOne({ where: { confessionNumber } });
            }
            // Kiểm tra xem đây có phải là UUID đầy đủ không
            else if (this.isValidUUID(confessionIdInput)) {
                confession = await this.confessionService.findById(confessionIdInput);
            } else {
                // Nếu không phải UUID đầy đủ, tìm kiếm dựa trên phần đầu của ID
                const confessions = await this.confessionRepository.find();
                confession = confessions.find(conf => conf.id.startsWith(confessionIdInput));
            }
            
            if (!confession) {
                return this.replyMessageGenerate({
                    messageContent: `Không tìm thấy Confession với ID ${confessionIdInput}.`
                }, message);
            }
            
            if (confession.status === ConfessionStatus.APPROVED) {
                return this.replyMessageGenerate({
                    messageContent: `Confession #${confession.confessionNumber} đã được phê duyệt trước đó.`
                }, message);
            }

            // Cập nhật nhận xét kiểm duyệt
            confession.moderationComment = moderationComment || undefined;
            await this.confessionRepository.save(confession);
            
            // Cập nhật trạng thái thành đã phê duyệt
            await this.confessionService.updateStatus(confession.id, ConfessionStatus.APPROVED);

            // Đăng Confession lên kênh với tin nhắn tiêu đề trước và confession sẽ trả lời tin nhắn đó
            const [headerMessage, confessionMessage] = ConfessionFormatter.createHeaderAndConfessionMessages(
                confession, 
                this.confessionChannelId
            );
            
            // Add header message to queue first
            this.messageQueue.addMessage(headerMessage);
            
            // Add confession message to queue (will be processed after header message)
            this.messageQueue.addMessage(confessionMessage);
            
            this.logger.log(`Added header message and confession #${confession.confessionNumber} to the queue`);

            // Trả lời cho người kiểm duyệt
            return this.replyMessageGenerate({
                messageContent: `Confession #${confession.confessionNumber} đã được phê duyệt và đăng lên kênh confessions.`
            }, message);
            
        } catch (error) {
            this.logger.error(`Lỗi khi phê duyệt Confession ${confessionIdInput}`, error);
            return this.replyMessageGenerate({
                messageContent: 'There was an error processing your request. Please try again.'
            }, message);
        }
    }

    // Removed formatConfessionForChannel as we now use the centralized utility
    
    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
}