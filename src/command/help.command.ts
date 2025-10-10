import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { CommandStorage } from '@app/command/common/command.storage';

@Command('help', {
    description: 'Shows available commands and their usage',
    usage: '!help [command]',
    category: 'General',
    aliases: ['h', 'commands'],
})
export class HelpCommand extends CommandMessage {
    constructor() {
        super();
    }

    execute(args: string[], message: ChannelMessage) {
        if (args.length > 0) {
            // Show help for specific command
            const commandName = args[0].toLowerCase().replace('!', ''); // Remove ! prefix if included
            const metadata = CommandStorage.getCommandMetadata(commandName);
            
            if (!metadata) {
                const messageContent = `Không tìm thấy lệnh '${commandName}'. Sử dụng !help để xem tất cả các lệnh có sẵn.`;
                return this.replyMessageGenerate({ messageContent }, message);
            }
            
            const messageContent = this.formatCommandHelp(metadata);
            return this.replyMessageGenerate({
                messageContent,
                mk: [{ type: 'pre', s: 0, e: messageContent.length }],
            }, message);
        }

        // Show all commands grouped by category
        const commandEntries = Array.from(CommandStorage.getAllCommands().entries());
        const categorizedCommands: Record<string, { name: string; description: string }[]> = {};
        
        // Group commands by category
        commandEntries.forEach(([name, metadata]) => {
            const category = metadata.category || 'Misc';
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push({
                name,
                description: metadata.description || 'No description'
            });
        });
        
        // Format message with categories
        let messageContent = `### 🤖 BOT CONFESSION MEZON - DANH SÁCH LỆNH\n\n`;
        
        // Add description for the bot
        messageContent += `Bot Confession Mezon cho phép bạn gửi confession ẩn danh, đăng tin tức tự động và nhiều tính năng khác.\n`;
        messageContent += `Sử dụng \`!help [lệnh]\` để biết thêm chi tiết về lệnh cụ thể.\n\n`;
        
        // Add each category and its commands
        Object.keys(categorizedCommands).sort().forEach(category => {
            messageContent += `#### ${category}\n`;
            categorizedCommands[category].forEach(cmd => {
                messageContent += `• \`!${cmd.name}\` - ${cmd.description}\n`;
            });
            messageContent += '\n';
        });
        
        // Add lưu ý quan trọng về lệnh check join
        messageContent += `### ⚠️ Lưu ý quan trọng\n`;
        messageContent += `• Nếu vừa cài đặt bot, hãy chạy \`!check join\` để bot có thể đăng tin vào các channel\n`;
        messageContent += `• Người dùng thông thường chỉ có thể sử dụng: \`!confess\`, \`!help\`, \`!about\`, \`!ping\`\n`;
        messageContent += `• Các lệnh khác chỉ dành cho quản trị viên (admin)\n\n`;
        
        // Add usage examples
        messageContent += `### 📝 Ví dụ sử dụng\n`;
        
        // Lệnh cho người dùng thường
        messageContent += `#### Lệnh cho người dùng thường\n`;
        messageContent += `• \`!confess Tôi thích một người trong lớp nhưng không dám nói\` - Gửi confession ẩn danh\n`;
        messageContent += `• \`!help [lệnh]\` - Xem hướng dẫn sử dụng\n`;
        messageContent += `• \`!about\` - Xem thông tin về bot\n`;
        messageContent += `• \`!ping\` - Kiểm tra bot có hoạt động không\n\n`;
        
        // Lệnh cho admin - Confession
        messageContent += `#### Lệnh quản lý Confession (Admin)\n`;
        messageContent += `• \`!approve [ID]\` - Duyệt confession\n`;
        messageContent += `• \`!reject [ID] [lý do]\` - Từ chối confession\n`;
        messageContent += `• \`!topconfession\` - Xem confession nổi bật\n`;
        messageContent += `• \`!stats\` - Xem thống kê confession theo tuần\n\n`;
        
        // Lệnh cho admin - Tin tức
        messageContent += `#### Lệnh quản lý Tin tức (Admin)\n`;
        messageContent += `• \`!news crawl\` - Crawl tin tức ngay lập tức\n`;
        messageContent += `• \`!news post\` - Đăng tin tức chưa đăng\n`;
        messageContent += `• \`!news status\` - Xem thống kê tin tức\n\n`;
        
        // Lệnh cho admin - TikTok
        messageContent += `#### Lệnh quản lý TikTok (Admin)\n`;
        messageContent += `• \`!tiktok trending\` - Xem video TikTok thịnh hành\n`;
        messageContent += `• \`!tiktok search mèo hài hước\` - Tìm video TikTok\n\n`;
        
        // Lệnh cho admin - Kiểm tra
        messageContent += `#### Lệnh kiểm tra hệ thống (Admin)\n`;
        messageContent += `• \`!check join\` - Bot tham gia vào các channel (⚠️ Quan trọng!)\n`;
        messageContent += `• \`!check channels\` - Kiểm tra quyền truy cập channel\n\n`;
        
        // Add note about hashtags
        messageContent += `**Ghi chú:** Bạn có thể sử dụng hashtag trong confession để phân loại: \`!confess Tôi rất vui hôm nay #hạnh_phúc\`\n`;
        messageContent += `---------------------------------------------\n`;
            
        return this.replyMessageGenerate({
            messageContent,
            mk: [{ type: 'pre', s: 0, e: messageContent.length }],
        }, message);
    }

    private formatCommandHelp(metadata: any): string {
        let helpText = [
            `### 📚 Trợ giúp lệnh: ${metadata.name}`,
            `**Mô tả:** ${metadata.description}`,
            `**Cách sử dụng:** ${metadata.usage}`,
            `**Nhóm:** ${metadata.category}`,
            metadata.aliases?.length ? `**Lệnh thay thế:** ${metadata.aliases.join(', ')}` : '',
            metadata.permissions?.length ? `**⚠️ Quyền hạn cần thiết:** ${metadata.permissions.includes('admin') ? 'Chỉ dành cho quản trị viên (admin)' : metadata.permissions.join(', ')}` : '**🔓 Quyền hạn:** Tất cả người dùng đều có thể sử dụng',
        ].filter(Boolean).join('\n');
        
        // Add specific additional help for common commands
        switch (metadata.name) {
            case 'confess':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Gửi confession ẩn danh để kiểm duyệt. Nếu được phê duyệt, confession sẽ được đăng lên kênh confessions.\n\n';
                helpText += '**Quy tắc:** Không gửi nội dung vi phạm quy tắc cộng đồng như spam, quấy rối, hoặc thông tin cá nhân.\n\n';
                helpText += '**Sử dụng hashtag:** Bạn có thể thêm hashtag vào confession để phân loại: `!confess Tôi thích một người #tình_cảm`\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!confess Tôi đã vượt qua kỳ thi khó khăn nhất! #vui_mừng`\n';
                helpText += '`!cf Tôi thích một người trong lớp nhưng không dám nói.`';
                helpText += '--------------------------------------------';
                break;
                
            case 'approve':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Dành cho quản trị viên để phê duyệt một confession đang chờ xét duyệt.\n\n';
                helpText += '**Tham số:**\n';
                helpText += '- `confession_id`: ID của confession (có thể sử dụng đầy đủ hoặc 8 ký tự đầu)\n';
                helpText += '- `optional_comment`: Nhận xét tùy chọn kèm theo việc phê duyệt\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!approve e269d914`\n';
                helpText += '`!approve e269d914-8032-4675-a6a8-39519e83b5ed Confession hay!`';
                helpText += '--------------------------------------------';
                break;
                
            case 'reject':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Dành cho quản trị viên để từ chối một confession đang chờ xét duyệt.\n\n';
                helpText += '**Tham số:**\n';
                helpText += '- `confession_id`: ID của confession (có thể sử dụng đầy đủ hoặc 8 ký tự đầu)\n';
                helpText += '- `reason`: Lý do từ chối (sẽ được lưu lại)\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!reject e269d914 Vi phạm quy tắc cộng đồng`\n';
                helpText += '`!reject e269d914 Nội dung không phù hợp với quy định kênh`';
                helpText += '--------------------------------------------';
                break;
                
            case 'stats':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Hiển thị thống kê về các confession theo tuần.\n\n';
                helpText += '**Tham số (tùy chọn):**\n';
                helpText += '- `week`: Số tuần (1-52)\n';
                helpText += '- `year`: Năm\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!stats` (hiển thị thống kê tuần hiện tại)\n';
                helpText += '`!stats 41 2025` (hiển thị thống kê tuần 41 năm 2025)';
                helpText += '--------------------------------------------';
                break;
                
            case 'topconfession':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Hiển thị danh sách các confession có nhiều phản ứng (reaction) nhất.\n\n';
                helpText += '**Tham số (tùy chọn):**\n';
                helpText += '- `count`: Số lượng confession muốn hiển thị (mặc định: 5)\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!topconfession` (hiển thị top 5 confession)\n';
                helpText += '`!topconfession 10` (hiển thị top 10 confession)';
                helpText += '--------------------------------------------';
                break;
                
            case 'news':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Quản lý tính năng tin tức của bot. Bao gồm các thao tác crawl, đăng tin và xem thống kê.\n\n';
                helpText += '**Lệnh phụ:**\n';
                helpText += '- `crawl`: Crawl tin tức ngay lập tức\n';
                helpText += '- `post`: Đăng các tin đã crawl nhưng chưa đăng\n';
                helpText += '- `status`: Xem thống kê về tin tức\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!news crawl` (crawl tin tức ngay)\n';
                helpText += '`!news post` (đăng tin tức chưa đăng)\n';
                helpText += '`!news status` (xem thống kê tin tức)\n\n';
                helpText += '**⚠️ Lưu ý quan trọng:**\n';
                helpText += 'Trước khi sử dụng lệnh `!news post` lần đầu tiên, hãy chạy lệnh `!check join` để bot tham gia vào các channel đã cấu hình.';
                helpText += '--------------------------------------------';
                break;
                
            case 'tiktok':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Tìm kiếm và hiển thị video TikTok thịnh hành.\n\n';
                helpText += '**Lệnh phụ:**\n';
                helpText += '- `trending`: Hiển thị các video thịnh hành\n';
                helpText += '- `search <từ khóa>`: Tìm kiếm video theo từ khóa\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!tiktok trending` (xem video thịnh hành)\n';
                helpText += '`!tiktok search mèo hài hước` (tìm video về mèo hài hước)';
                helpText += '--------------------------------------------';
                break;
                
            case 'check':
                helpText += '\n\n**Chi tiết:**\n';
                helpText += 'Kiểm tra và quản lý quyền truy cập channel của bot.\n\n';
                helpText += '**Lệnh phụ:**\n';
                helpText += '- `join`: Bot tham gia vào tất cả các channel đã cấu hình (⚠️ Quan trọng)\n';
                helpText += '- `channels`: Kiểm tra quyền truy cập vào các channel\n\n';
                helpText += '**Ví dụ:**\n';
                helpText += '`!check join` (bot tham gia vào tất cả các channel)\n';
                helpText += '`!check channels` (kiểm tra quyền truy cập)\n\n';
                helpText += '**⚠️ Lưu ý quan trọng:**\n';
                helpText += 'Lệnh `!check join` phải được chạy khi mới cài đặt bot hoặc thêm channel mới.';
                helpText += '--------------------------------------------';
                break;
        }
        
        return helpText;
    }
}