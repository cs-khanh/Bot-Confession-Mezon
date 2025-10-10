import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Events } from 'mezon-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionLog } from '@app/entities/reaction-log.entity';
import { Confession } from '@app/entities/confession.entity';
import { ERROR_MESSAGES } from '@app/common/constants';
import { ConfessionService } from '@app/services/confession.service';

interface ReactionEvent {
    message_id: string;
    reaction: string;
    count: number;
    user_id?: string;
}

@Injectable()
export class EventListenerReaction {
    private readonly logger = new Logger(EventListenerReaction.name);
    
    constructor(
        @InjectRepository(ReactionLog)
        private reactionLogRepository: Repository<ReactionLog>,
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        private confessionService: ConfessionService,
    ) {}

    @OnEvent('reaction.add')
    async handleReactionAdd(event: ReactionEvent): Promise<void> {
        await this.processReaction(event, 'add');
    }

    @OnEvent('reaction.remove')
    async handleReactionRemove(event: ReactionEvent): Promise<void> {
        await this.processReaction(event, 'remove');
    }

    private async processReaction(event: ReactionEvent, action: 'add' | 'remove'): Promise<void> {
        try {
            const { message_id, reaction, count } = event;
            
            // Find if this message is associated with a confession
            const confession = await this.confessionRepository.findOne({
                where: { messageId: message_id }
            });
            
            // Get or create reaction log
            let reactionLog = await this.reactionLogRepository.findOne({
                where: { messageId: message_id }
            });
            
            if (!reactionLog) {
                reactionLog = this.reactionLogRepository.create({
                    messageId: message_id,
                    confessionId: confession?.id || null,
                    reactions: {}
                });
            }
            
            // Update reaction count
            if (action === 'add') {
                reactionLog.reactions[reaction] = count;
            } else {
                // Remove reaction if count is 0, otherwise update it
                if (count === 0) {
                    delete reactionLog.reactions[reaction];
                } else {
                    reactionLog.reactions[reaction] = count;
                }
            }
            
            // Save the reaction log
            await this.reactionLogRepository.save(reactionLog);
            
            // If message is a confession, update its reaction count
            if (confession) {
                const totalReactions = Object.values(reactionLog.reactions)
                    .reduce((sum, count) => sum + count, 0);
                
                // Update the confession directly
                confession.reactionCount = totalReactions;
                await this.confessionRepository.save(confession);
            }
            
        } catch (error) {
            this.logger.error('Error processing reaction event', error);
        }
    }
}