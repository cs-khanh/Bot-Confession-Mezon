import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReplyMezonMessage } from "@app/dtos/MezonReplyMessageDto";
import { MezonClientService } from './mezon-client.service';
import { ConfessionService } from './confession.service';
import { setTimeout } from 'timers/promises';

@Injectable()
export class MessageQueue implements OnModuleInit {
    private readonly logger = new Logger(MessageQueue.name);
    private queue: ReplyMezonMessage[] = [];
    private isProcessing = false;
    private processing: Set<string> = new Set(); // Track messages being processed by their unique ID
    private maxConcurrent = 3; // Maximum number of concurrent messages to process
    private processingInterval: NodeJS.Timeout;
    private headerMessageMap: Map<string, string> = new Map(); // Map to track header message IDs (queueId -> messageId)

    constructor(
        private readonly clientService: MezonClientService,
        private readonly confessionService: ConfessionService
    ) {}

    onModuleInit() {
        // Start the queue processor when the module initializes
        this.startQueueProcessor();
    }


    getMessageQueue() {
        return this.queue;
    }

    addMessage(message: ReplyMezonMessage | any) {
        // Add a unique ID to the message if it doesn't have one
        if (!message.id) {
            message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        this.queue.push(message);
        this.logger.log(`Added message to queue. Queue size: ${this.queue.length}`);
        
        // Trigger processing if not already in progress
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    getNextMessage(): ReplyMezonMessage | undefined {
        // First, sort the queue by priority if it exists (lower numbers = higher priority)
        this.queue.sort((a, b) => {
            const priorityA = a.priority !== undefined ? a.priority : 100;
            const priorityB = b.priority !== undefined ? b.priority : 100;
            return priorityA - priorityB;
        });
        
        // Find first eligible message that is not currently being processed
        // and doesn't need to wait for a header message
        for (let i = 0; i < this.queue.length; i++) {
            const msg = this.queue[i];
            
            // Skip if already being processed
            if (this.processing.has(msg.id)) continue;
            
            // If this message needs to wait for a header message
            if (msg.wait_for_header && msg.header_message_id) {
                // Check if we have the reply_to_message_id (which means the header has been sent)
                if (!msg.reply_to_message_id) {
                    // Skip this message as we're still waiting for the header to be sent
                    continue;
                }
            }
            
            // This message is eligible for processing
            this.queue.splice(i, 1);
            this.processing.add(msg.id);
            return msg;
        }
        
        return undefined;
    }

    // getNextMessage(): ReplyMezonMessage | undefined {
    //     return this.queue.shift();

    // }

    hasMessages(): boolean {
        return this.queue.length > 0;
    }
    
    /**
     * Store the message ID of a sent header message for the confession to reply to
     * @param queueId The queue ID of the header message
     * @param messageId The actual message ID from the API response
     */
    updateReplyMessage(queueId: string, messageId: string): void {
        this.headerMessageMap.set(queueId, messageId);
        this.logger.log(`[REPLY SETUP] Stored header message mapping: ${queueId} -> ${messageId}`);
        
        // Update any queued confession messages waiting for this header message
        let updatedCount = 0;
        this.queue.forEach(message => {
            // Support both new header_message_id and legacy date_message_id for backward compatibility
            if ((message.reply_to_header_message && message.header_message_id === queueId) ||
                (message.reply_to_date_message && message.date_message_id === queueId)) {
                
                message.reply_to_message_id = messageId;
                updatedCount++;
                this.logger.log(`[REPLY SETUP] Updated confession message ${message.id} to reply to message ${messageId}`);
            }
        });
        
        if (updatedCount > 0) {
            this.logger.log(`[REPLY SETUP] Updated ${updatedCount} messages to reply to header ${messageId}`);
        } else {
            this.logger.warn(`[REPLY SETUP] No messages found waiting to reply to header ${queueId}`);
        }
    }

    private startQueueProcessor() {
        // Process the queue every 1 second to avoid overwhelming the API
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 1000);
        this.logger.log('Message queue processor started');
    }

    private async processQueue() {
        // If already processing max concurrent messages, skip this cycle
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        this.isProcessing = true;

        try {
            // Process up to maxConcurrent messages at a time
            const availableSlots = this.maxConcurrent - this.processing.size;
            const messagesToProcess = Math.min(availableSlots, this.queue.length);

            if (messagesToProcess <= 0) {
                this.isProcessing = false;
                return;
            }

            this.logger.debug(`Processing ${messagesToProcess} messages. Queue size: ${this.queue.length}`);

            // Process messages concurrently
            const promises = [];
            for (let i = 0; i < messagesToProcess; i++) {
                const message = this.getNextMessage();
                if (!message) break;
                
                promises.push(this.processMessage(message));
            }

            await Promise.all(promises);
            
        } catch (error) {
            this.logger.error('Error processing message queue', error);
        } finally {
            this.isProcessing = false;
            
            // If there are still messages in the queue, continue processing
            if (this.hasMessages() && this.processing.size < this.maxConcurrent) {
                setImmediate(() => this.processQueue());
            }
        }
    }

    private async processMessage(message: ReplyMezonMessage): Promise<void> {
        try {
            this.logger.debug(`Processing message ${message.id} to channel ${message.channel_id}`);
            
            // Add reply_to parameter if this is a confession replying to a header message
            if (message.is_reply && 
               ((message.reply_to_header_message && message.reply_to_message_id) ||
                (message.reply_to_date_message && message.reply_to_message_id))) {
                
                // If we have a message ID to reply to, add it to the message object
                if (!message.msg) message.msg = {};
                
                // Ensure the reply_to field is properly formatted for the API
                message.msg.reply_to = message.reply_to_message_id;
                
                // Log for debugging
                this.logger.log(`[REPLY] Message ${message.id} will reply to message ${message.reply_to_message_id}`);
                this.logger.log(`[REPLY] Message structure: ${JSON.stringify(message.msg)}`);
            } else if (message.is_reply) {
                this.logger.warn(`[REPLY] Message ${message.id} is marked as reply but has no reply_to_message_id!`);
            }
            
            const response = await this.clientService.sendMessage(message);
            this.logger.log(`Successfully sent message ${message.id}`);
            
            // Log response để debug
            this.logger.log(`Message response: ${JSON.stringify(response || {})}`);
            
            // Handle header message - store its ID for the confession to reply to
            if ((message.is_header_message || message.is_date_message) && response && response.message_id) {
                // Store the header message ID in the queue for the confession message to reference
                this.updateReplyMessage(message.id, response.message_id);
                this.logger.log(`Header message sent with ID ${response.message_id}, confession will reply to it`);
            }
            
            // Kiểm tra nếu tin nhắn có confession_id, cập nhật messageId trong DB
            if (message.confession_id && response && response.message_id && 
               !message.is_date_message && !message.is_header_message) {
                try {
                    // Only update the confession record with the actual confession message ID (not the header message)
                    await this.confessionService.updateMessageInfo(
                        message.confession_id,
                        response.message_id,
                        message.channel_id
                    );
                    
                    this.logger.log(`Updated confession ${message.confession_id} with message ID: ${response.message_id}`);
                } catch (updateError) {
                    this.logger.error(`Error updating confession message ID: ${updateError.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to process message ${message.id}`, error);
            
            // If it's a temporary error (rate limit, etc.), put it back in the queue
            if (error.status === 429 || error.message?.includes('rate limit')) {
                this.logger.warn(`Rate limited. Re-adding message ${message.id} to the queue`);
                this.queue.push(message); // Add back to queue
            }
        } finally {
            // Remove from processing set
            this.processing.delete(message.id);
        }
    }
}