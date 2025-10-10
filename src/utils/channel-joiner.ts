import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClientService } from '@app/services/mezon-client.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChannelJoinerService {
    private readonly logger = new Logger(ChannelJoinerService.name);
    
    constructor(
        private mezonClient: MezonClientService,
        private configService: ConfigService,
    ) {}

    /**
     * Tham gia vào tất cả các channel được cấu hình
     */
    async joinAllChannels(): Promise<{success: number; failed: number; channels: {id: string; name: string; status: string}[]}> {
        this.logger.log('Joining all configured channels...');
        
        const results = {
            success: 0,
            failed: 0,
            channels: [] as {id: string; name: string; status: string}[]
        };
        
        try {
            // Lấy config từ file
            const configPath = path.join(process.cwd(), 'channels-config.json');
            if (!fs.existsSync(configPath)) {
                this.logger.warn('channels-config.json not found');
                throw new Error('channels-config.json not found');
            }
            
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            
            // Tham gia vào default channel
            if (configData?.channels?.default) {
                const defaultId = configData.channels.default;
                await this.joinChannel(defaultId, 'Default', results);
            }
            
            // Tham gia vào category channels
            if (configData?.channels?.categories) {
                for (const [category, channelId] of Object.entries(configData.channels.categories)) {
                    await this.joinChannel(channelId as string, category, results);
                }
            }
            
            this.logger.log(`Channel joining completed: ${results.success} success, ${results.failed} failed`);
            return results;
        } catch (error) {
            this.logger.error(`Error joining channels: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Tham gia vào một channel cụ thể
     */
    private async joinChannel(channelId: string, label: string, results: {success: number; failed: number; channels: {id: string; name: string; status: string}[]}): Promise<void> {
        try {
            this.logger.log(`Joining ${label} channel (${channelId})...`);
            
            // Sử dụng client SDK trực tiếp để tham gia vào channel
            const client = this.mezonClient.getClient();
            
            // Gửi một tin nhắn test để kiểm tra quyền
            try {
                const channel = await client.channels.fetch(channelId);
                
                if (!channel) {
                    throw new Error(`Channel not found: ${channelId}`);
                }
                
                const testResponse = await channel.send({
                    t: `🔍 Bot access test message. This message will be deleted. (${new Date().toISOString()})`,
                });
                
                // Nếu gửi thành công, nghĩa là bot đã có quyền
                this.logger.log(`✅ Successfully verified access to ${label} channel (${channelId})`);
                results.success++;
                results.channels.push({
                    id: channelId,
                    name: label,
                    status: 'success'
                });
                
                // Xóa tin nhắn test sau 2 giây
                setTimeout(async () => {
                    try {
                        // Nếu SDK hỗ trợ xóa tin nhắn
                        if (channel.messages && testResponse && testResponse.message_id) {
                            const message = await channel.messages.fetch(testResponse.message_id);
                            if (message && message.delete) {
                                await message.delete();
                                this.logger.log(`🗑️ Deleted test message from ${label} channel`);
                            }
                        }
                    } catch (deleteError) {
                        this.logger.warn(`Could not delete test message: ${deleteError.message}`);
                    }
                }, 2000);
            } catch (error) {
                this.logger.warn(`⚠️ Failed to access ${label} channel (${channelId}): ${error.message}`);
                results.failed++;
                results.channels.push({
                    id: channelId,
                    name: label,
                    status: `failed: ${error.message}`
                });
            }
        } catch (error) {
            this.logger.error(`❌ Error joining ${label} channel (${channelId}): ${error.message}`);
            results.failed++;
            results.channels.push({
                id: channelId,
                name: label,
                status: `error: ${error.message}`
            });
        }
    }
}