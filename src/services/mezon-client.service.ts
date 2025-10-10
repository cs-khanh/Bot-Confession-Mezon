import { APP_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@app/common/constants';
import { ReactMessageChannel, ReplyMezonMessage } from '@app/dtos/MezonReplyMessageDto';
import { MezonClientConfig } from '@app/types/mezon.types';
import { Injectable, Logger } from '@nestjs/common';
import { MezonClient } from 'mezon-sdk';

@Injectable()
export class MezonClientService {
    private readonly logger = new Logger(MezonClientService.name);
    private client: MezonClient;
    public token: string;

    constructor(clientConfigs: MezonClientConfig) {
        this.client = new MezonClient(clientConfigs.token);
    }

    getToken(): string {
        return this.token;
    }

    async initializeClient(): Promise<void> {
        try {
            const result = await this.client.login();
            this.logger.log(SUCCESS_MESSAGES.CLIENT_AUTHENTICATED, result);
            const data = JSON.parse(result);
            this.token = data?.token;
        } catch (error) {
            this.logger.error(ERROR_MESSAGES.CLIENT_AUTHENTICATION, error);
            throw error;
        }
    }

    getClient(): MezonClient {
        return this.client;
    }

    async sendMessage(replyMessage: ReplyMezonMessage): Promise<any> {
        try {
            // Apply exponential backoff retry logic for handling rate limits
            return await this.retryOperation(async () => {
                const channel = await this.client.channels.fetch(replyMessage.channel_id);
                
                if (replyMessage?.ref?.length && replyMessage?.message_id) {
                    const message = await channel.messages.fetch(replyMessage.message_id);
                    return await message.reply(
                        replyMessage.msg,
                        replyMessage.mentions,
                        replyMessage.attachments,
                        replyMessage.mention_everyone,
                        replyMessage.anonymous_message,
                        replyMessage.topic_id,
                        replyMessage.code,
                    );
                }
                
                return await channel.send(
                    replyMessage.msg,
                    replyMessage.mentions,
                    replyMessage.attachments,
                    replyMessage.mention_everyone,
                    replyMessage.anonymous_message,
                    replyMessage.topic_id,
                    replyMessage.code,
                );
            }, `send message to channel ${replyMessage.channel_id}`);
        } catch (error) {
            this.logger.error('Error sending message', error);
            throw error;
        }
    }
    
    // Helper function to retry operations with exponential backoff
    private async retryOperation<T>(
        operation: () => Promise<T>, 
        operationName: string, 
        maxRetries = 3, 
        baseDelay = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Check if this is a rate limit or temporary error
                const isRateLimitOrTemporary = 
                    (error.status === 429) || 
                    (error.message && typeof error.message === 'string' && 
                     (error.message.includes('rate limit') || 
                      error.message.includes('timeout') || 
                      error.message.includes('network')));
                
                if (isRateLimitOrTemporary && attempt < maxRetries - 1) {
                    // Calculate delay with exponential backoff
                    const delay = baseDelay * Math.pow(2, attempt);
                    this.logger.warn(
                        `${operationName} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms: ${error.message}`
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error;
            }
        }
        
        throw lastError;
    }

    async sendMessageToUser(message: ReplyMezonMessage): Promise<any> {
        const dmClan = await this.client.clans.fetch(APP_CONSTANTS.MEZON.DM_CLAN_ID);
        const user = await dmClan.users.fetch(message.userId);

        if (!user) return;
        try {
            return await user.sendDM(
                {
                    t: message?.textContent ?? '',
                    ...(message?.messOptions ?? {}),
                },
                message?.code,
            );
        } catch (error) {
            this.logger.error('Error sending message to user', error);
            throw error;
        }
    }

    async createDMchannel(userId: string): Promise<any> {
        try {
            return await this.client.createDMchannel(userId);
        } catch (error) {
            this.logger.error('Error creating DM channel', error);
            return null;
        }
    }

    async reactMessageChannel(dataReact: ReactMessageChannel): Promise<any> {
        const channel = await this.client.channels.fetch(dataReact.channel_id);
        const message = await channel.messages.fetch(dataReact.message_id);
        const dataSend = {
            emoji_id: dataReact.emoji_id,
            emoji: dataReact.emoji,
            count: dataReact.count,
        };
        try {
            return await message.react(dataSend);
        } catch (error) {
            this.logger.error('Error reacting to message', error);
            return null;
        }
    }
}