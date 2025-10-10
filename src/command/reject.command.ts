import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { ConfessionService } from '@app/services/confession.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfessionStatus } from '@app/entities/confession.entity';
import { AdminService } from '@app/services/admin.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession } from '@app/entities/confession.entity';

@Injectable()
@Command('reject', {
    description: 'Reject a confession',
    usage: '!reject [confession_id] [reason]',
    category: 'Moderation',
    aliases: ['deny'],
    permissions: ['admin'],
})
export class RejectCommand extends CommandMessage {
    private readonly logger = new Logger(RejectCommand.name);

    constructor(
        private confessionService: ConfessionService,
        private adminService: AdminService,
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>
    ) {
        super();
    }

    async execute(args: string[], message: ChannelMessage) {
        // Kiểm tra xem người dùng có quyền quản trị viên không
        if (!this.adminService.isAdmin(message.sender_id)) {
            return this.replyMessageGenerate({
                messageContent: 'Bạn không có quyền sử dụng lệnh này. Chỉ quản trị viên mới có thể từ chối Confession.'
            }, message);
        }
        
        // Check for required parameters
        if (args.length === 0) {
            return this.replyMessageGenerate({
                messageContent: 'Please provide the confession ID to reject. Usage: `!reject [confession_id] [reason]`'
            }, message);
        }

        // Lấy UUID hoặc phần đầu UUID nếu người dùng chỉ cung cấp một phần
        const confessionIdInput = args[0];
        // Get optional reason (all arguments after the first one)
        const reason = args.length > 1 ? args.slice(1).join(' ') : 'No reason provided';
        
        try {
            // Tìm Confession dựa trên ID hoặc phần đầu của ID
            let confession;
            
            // Kiểm tra xem đây có phải là UUID đầy đủ không
            if (this.isValidUUID(confessionIdInput)) {
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
            
            const shortId = confession.id.substring(0, 8);
            
            if (confession.status === ConfessionStatus.REJECTED) {
                return this.replyMessageGenerate({
                    messageContent: `Confession #${shortId} đã bị từ chối trước đó.`
                }, message);
            }

            // Cập nhật lý do từ chối
            confession.moderationComment = reason;
            await this.confessionRepository.save(confession);
            
            // Cập nhật trạng thái thành đã từ chối
            await this.confessionService.updateStatus(
                confession.id,
                ConfessionStatus.REJECTED
            );

            // Trả lời cho người kiểm duyệt
            return this.replyMessageGenerate({
                messageContent: `Confession #${shortId} đã bị từ chối với lý do: ${reason}`
            }, message);
            
        } catch (error) {
            this.logger.error(`Lỗi khi từ chối Confession #${confessionIdInput}`, error);
            return this.replyMessageGenerate({
                messageContent: 'There was an error processing your request. Please try again.'
            }, message);
        }
    }
    
    private isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
}