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
    public botId: string;

    // constructor(clientConfigs: MezonClientConfig) {
    //     // Store provided token and botId for later use
    //     this.token = clientConfigs.token ?? '';
    //     this.botId = clientConfigs.botId ?? '';
    //     this.logger.log(`Tui in ra xem nè: botId=${this.botId}, tokenLength=${this.token?.length}`);
    //     // New mezon-sdk requires an object with botId and token
    //     const client = { botId: this.botId || undefined, token: this.token || undefined };
    //     try {
    //         this.client = new MezonClient(client as any);
    //         this.logger.log(`[MezonClientService] Initialized MezonClient with botId=${this.botId}, tokenLength=${this.token?.length}`);
    //     } catch (error) {
    //         this.logger.error('[MezonClientService] Failed to construct MezonClient with object signature', error);
    //         // Fallback: try old string-based constructor for backward compatibility
    //         try {
    //             this.client = new MezonClient(this.token as any);
    //             this.logger.log('[MezonClientService] Fallback: constructed MezonClient with token string');
    //         } catch (err) {
    //             this.logger.error('[MezonClientService] Fallback constructor also failed', err);
    //             // Re-throw since we can't construct any client correctly
    //             throw err;
    //         }
    //     }
    // }
    constructor(clientConfigs: MezonClientConfig) {
        this.client = new MezonClient({ botId: clientConfigs.botId, token: clientConfigs.token });
    }

    getToken(): string {
        return this.token;
    }

    /**
     * Try to login with retries. Sets isAuthenticated flag.
     * Returns true if authenticated, false otherwise.
     */
    async initializeClient(retries = 3, baseDelay = 1000): Promise<boolean> {
        let attempt = 0;
        while (attempt < retries) {
            attempt++;
            try {
                this.logger.log(`[MezonClientService] Attempting login (attempt ${attempt}/${retries})`);
                const result = await this.client.login();
                this.logger.log(SUCCESS_MESSAGES.CLIENT_AUTHENTICATED, result);
                const data = JSON.parse(result);
                this.token = data?.token ?? this.token;
                this.botId = data?.bot_id ?? this.botId;
                this.logger.log(`[MezonClientService] Authentication succeeded. botId=${this.botId}`);
                return true;
            } catch (error: any) {
                // Log detailed error info to help debugging Mezon SDK failures
                this.logger.error('[MezonClientService] error authenticating', error?.message ?? error);
                if (error?.stack) {
                    this.logger.error('[MezonClientService] stack:', error.stack);
                }
                // Some SDK errors include a response object with more details
                try {
                    if (error?.response) {
                        // Attempt to stringify response safely
                        const resp = typeof error.response === 'object' ? JSON.stringify(error.response) : String(error.response);
                        this.logger.error('[MezonClientService] response:', resp);
                    }
                } catch (e) {
                    this.logger.error('[MezonClientService] failed to log error.response', e?.message ?? e);
                }
                

                // Wait with exponential backoff
                const delay = baseDelay * Math.pow(2, attempt - 1);
                this.logger.warn(`[MezonClientService] Retry in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return false;
    }

    getClient(): MezonClient {
        return this.client;
    }
    getBotId(): string {
        return this.botId;
    }
    async sendMessage(replyMessage: ReplyMezonMessage): Promise<any> {
        try {
            // Apply exponential backoff retry logic for handling rate limits
            return await this.retryOperation(async () => {
                const channel = await this.client.channels.fetch(replyMessage.channel_id);
                
                // Check if this is a reply to another message using ref array
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
                
                // Check if this is a reply to another message using reply_to parameter
                if (replyMessage.msg?.reply_to) {
                    const messageToReplyTo = replyMessage.msg.reply_to;
                    this.logger.log(`[REPLY] Sending message as a reply to ${messageToReplyTo}`);

                    // Try fetching the target message with a few retries in case of propagation delay
                    let targetMessage: any = null;
                    const maxFetchAttempts = 4;
                    for (let attempt = 1; attempt <= maxFetchAttempts; attempt++) {
                        try {
                            targetMessage = await channel.messages.fetch(messageToReplyTo);
                            if (targetMessage) {
                                this.logger.log(`[REPLY] Successfully fetched message to reply to: ${messageToReplyTo} (attempt ${attempt})`);
                                break;
                            }
                        } catch (err: any) {
                            // If the fetch failed, log and retry after a short delay
                            this.logger.warn(`[REPLY] Attempt ${attempt} failed to fetch ${messageToReplyTo}: ${err.message || err}`);
                        }

                        // small backoff between attempts
                        const backoffMs = 100 * attempt;
                        await new Promise(res => setTimeout(res, backoffMs));
                    }

                    if (targetMessage) {
                        try {
                            // Create a reply using the reply method on the message
                            return await targetMessage.reply(
                                replyMessage.msg,
                                replyMessage.mentions,
                                replyMessage.attachments,
                                replyMessage.mention_everyone,
                                replyMessage.anonymous_message,
                                replyMessage.topic_id,
                                replyMessage.code,
                            );
                        } catch (err) {
                            this.logger.error(`[REPLY] Error while replying to message ${messageToReplyTo}: ${err.message || err}`);
                            // Fall through to regular send
                        }
                    } else {
                        this.logger.error(`[REPLY] Could not fetch message ${messageToReplyTo} after ${maxFetchAttempts} attempts. Falling back to regular send.`);
                    }
                }
                
                // Regular send if not a reply or if reply target couldn't be fetched
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