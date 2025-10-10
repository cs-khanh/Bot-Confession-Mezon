import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReplyMezonMessage } from "@app/dtos/MezonReplyMessageDto";
import { MezonClientService } from './mezon-client.service';
import { ConfessionService } from './confession.service';

@Injectable()
export class MessageQueue implements OnModuleInit {
    private readonly logger = new Logger(MessageQueue.name);
    private queue: ReplyMezonMessage[] = [];
    private isProcessing = false;
    private processing: Set<string> = new Set(); // Track messages being processed by their unique ID
    private maxConcurrent = 3; // Maximum number of concurrent messages to process
    private processingInterval: NodeJS.Timeout;

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
        // Find first message not currently being processed
        const index = this.queue.findIndex(msg => !this.processing.has(msg.id));
        if (index === -1) return undefined;
        
        const message = this.queue[index];
        // Remove the message from the queue and mark as processing
        this.queue.splice(index, 1);
        this.processing.add(message.id);
        return message;
        this.queue.push(message);
    }

    // getNextMessage(): ReplyMezonMessage | undefined {
    //     return this.queue.shift();

    // }

    hasMessages(): boolean {
        return this.queue.length > 0;
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
            const response = await this.clientService.sendMessage(message);
            this.logger.log(`Successfully sent message ${message.id}`);
            
            // Log response để debug
            this.logger.log(`Message response: ${JSON.stringify(response || {})}`);
            
            // Kiểm tra nếu tin nhắn có confession_id, cập nhật messageId trong DB
            if (message.confession_id && response && response.message_id) {
                try {
                    // Cập nhật messageId trong cơ sở dữ liệu thông qua confessionService
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