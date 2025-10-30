import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Confession } from '@app/entities/confession.entity';
import { ConfessionService } from '@app/services/confession.service';

interface ReactionEvent {
    message_id: string;
    reaction: string;
    count?: number;
    user_id?: string;
}

@Injectable()
export class EventListenerReaction {
    private readonly logger = new Logger(EventListenerReaction.name);

    constructor(
        @InjectRepository(Confession)
        private confessionRepository: Repository<Confession>,
        private confessionService: ConfessionService,
    ) {}

  /**
   * Chuẩn hóa emoji về dạng :name:
   */
    private normalizeEmojiReaction(reaction: string): string {
            if (reaction.startsWith(':') && reaction.endsWith(':')) return reaction;
            if (!reaction.includes('<') && !reaction.includes('>')) return reaction;

            const emojiMatch = reaction.match(/<a?:([^:]+):\d+>/);
            return emojiMatch ? `:${emojiMatch[1]}:` : reaction;
    }

  // ===========================================
  // ✅ ADD REACTION (người dùng thả emoji)
  // ===========================================
  @OnEvent('reaction.add')
  async handleReactionAdd(event: ReactionEvent) {
    try {
      const emoji = this.normalizeEmojiReaction(event.reaction);
      const count = event.count ?? 1;
      const userId = event.user_id;

      this.logger.log(`[REACTION] ADD → ${emoji} x${count} (user=${userId ?? 'unknown'})`);

      if (userId) {
        // Khi có user_id → cộng số lượng cho người đó
        await this.confessionService.addUserReaction(event.message_id, emoji, userId, count);
      } else {
        // Fallback nếu không có user → chỉ tăng tổng
        await this.confessionService.updateReactionCount(event.message_id, emoji, +count);
      }
    } catch (error) {
      this.logger.error(`[REACTION] Error handling ADD: ${error.message}`, error.stack);
    }
  }

  // ===========================================
  // ✅ REMOVE REACTION (người dùng bỏ emoji)
  // ===========================================
  @OnEvent('reaction.remove')
  async handleReactionRemove(event: ReactionEvent) {
        try {
            const emoji = this.normalizeEmojiReaction(event.reaction);
            const userId = event.user_id;

            this.logger.log(`[REACTION] REMOVE → ${emoji} (user=${userId ?? 'unknown'})`);

        if (userId) {
            // Khi có user → xoá toàn bộ reaction của người đó
            await this.confessionService.removeUserReaction(event.message_id, emoji, userId);
        } else {
            // Nếu không có user → giảm đúng số lượng gửi trong event (nếu có)
            const delta = -(event.count ?? 1);
            await this.confessionService.updateReactionCount(event.message_id, emoji, delta);
        }
        } catch (error) {
            this.logger.error(`[REACTION] Error handling REMOVE: ${error.message}`, error.stack);
        }
  }

  // ===========================================
  // ✅ SYNC EVENT (Mezon gửi phản ứng tổng hợp)
  // ===========================================
  @OnEvent('message.reaction')
  async handleMessageReaction(payload: any): Promise<void> {
        try {
            const messageId = payload.message_id;
            if (!messageId) return;

            const reactions = payload.reactions || payload.data?.reactions || {};
            for (const [emojiKey, count] of Object.entries(reactions)) {
                const normalized = this.normalizeEmojiReaction(emojiKey);
                await this.confessionService.updateReactionCount(messageId, normalized, count as number);
            }

            this.logger.log(`[REACTION] Synced reactions for message ${messageId}`);
        } catch (error) {
            this.logger.error(`[REACTION] Error in message.reaction: ${error.message}`, error.stack);
        }
    }
}
