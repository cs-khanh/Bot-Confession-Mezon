import { CommandMessage } from '@app/command/common/command.abstract';
import { CommandStorage } from '@app/command/common/command.storage';
import { HelpCommand } from '@app/command/help.command';
import { CommandInterface } from '@app/types/command.types';
import { extractMessage } from '@app/utils/message';
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ChannelMessage } from 'mezon-sdk';
import { AdminService } from '@app/services/admin.service';
import { replyMessageGenerate } from '@app/utils/message';

@Injectable()
export class CommandService implements CommandInterface {
    public commandList: { [key: string]: CommandMessage };
    private readonly logger = new Logger(CommandService.name);
    private readonly publicCommands = ['post', 'about', 'help', 'ping'];

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly adminService: AdminService,
    ) { }

    execute(messageContent: string, message: ChannelMessage) {
        const [commandName, args] = extractMessage(messageContent);
        const strippedCommandName = (commandName as string).toLowerCase().replace('!', '');

        const target = CommandStorage.getCommand(strippedCommandName);
        if (!target) {
            return null;
        }
        
        // Kiểm tra quyền hạn
        const metadata = CommandStorage.getCommandMetadata(strippedCommandName);
        const isPublicCommand = this.publicCommands.includes(strippedCommandName);
        
        if (!isPublicCommand && !this.adminService.isAdmin(message.sender_id)) {
            this.logger.warn(`Người dùng ${message.sender_id} không có quyền sử dụng lệnh ${strippedCommandName}`);
            return replyMessageGenerate({
                messageContent: '⚠️ **Bạn không có quyền sử dụng lệnh này!**\n\nLệnh này chỉ dành cho quản trị viên. Bạn chỉ có thể sử dụng các lệnh: `!confess`, `!help`, `!about`, `!ping`.',
            }, message);
        }

        const command = this.moduleRef.get(target);
        if (command) {
            return command.execute(args, message);
        }
    }
}