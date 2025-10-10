import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClientService } from '@app/services/mezon-client.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChannelCheckerService {
    private readonly logger = new Logger(ChannelCheckerService.name);
    
    constructor(
        private mezonClient: MezonClientService,
        private configService: ConfigService,
    ) {}

    async checkChannelAccess(): Promise<void> {
        this.logger.log('Checking channel access...');
        
        try {
            // Lấy config từ file
            const configPath = path.join(process.cwd(), 'channels-config.json');
            if (!fs.existsSync(configPath)) {
                this.logger.warn('channels-config.json not found');
                return;
            }
            
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            
            // Kiểm tra default channel
            if (configData?.channels?.default) {
                await this.checkSingleChannel(configData.channels.default, 'Default');
            }
            
            // Kiểm tra category channels
            if (configData?.channels?.categories) {
                for (const [category, channelId] of Object.entries(configData.channels.categories)) {
                    await this.checkSingleChannel(channelId as string, category);
                }
            }
            
            this.logger.log('Channel access check completed');
        } catch (error) {
            this.logger.error(`Error checking channel access: ${error.message}`);
        }
    }
    
    private async checkSingleChannel(channelId: string, label: string): Promise<void> {
        try {
            this.logger.log(`Testing access to ${label} channel (${channelId})...`);
            
            // Thử gửi một tin nhắn đơn giản (test message)
            const result = await this.mezonClient.sendMessage({
                channel_id: channelId,
                msg: {
                    t: `🔍 Bot access test message. This is an automated test to verify bot access to this channel. (${new Date().toISOString()})`,
                },
                code: 0,
            });
            
            if (result && result.message_id) {
                this.logger.log(`✅ Access confirmed for ${label} channel (${channelId}): Message ID ${result.message_id}`);
                
                // Không xóa test message, chỉ log
                this.logger.log(`✅ Test message sent successfully to ${label} channel: ${result.message_id}`);
                // MezonClientService có thể không có phương thức deleteMessage
            } else {
                this.logger.warn(`⚠️ Got response but no message_id for ${label} channel (${channelId})`);
            }
        } catch (error) {
            this.logger.error(`❌ Cannot access ${label} channel (${channelId}): ${error.message}`);
        }
    }
}