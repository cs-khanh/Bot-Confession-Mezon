import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MezonClientService } from '@app/services/mezon-client.service';
import {
    AddClanUserEvent,
    ApiMessageReaction,
    ChannelCreatedEvent,
    ChannelDeletedEvent,
    ChannelUpdatedEvent,
    Events,
    GiveCoffeeEvent,
    MezonClient,
    StreamingJoinedEvent,
    StreamingLeavedEvent,
    TokenSentEvent,
    UserChannelAddedEvent,
    UserChannelRemoved,
    UserClanRemovedEvent,
    VoiceJoinedEvent,
    VoiceLeavedEvent
} from 'mezon-sdk';
import { RoleAssignedEvent } from 'mezon-sdk/dist/cjs/rtapi/realtime';

@Injectable()
export class BotGateway {
    private readonly logger = new Logger(BotGateway.name);
    private client: MezonClient;

    constructor(
        private clientService: MezonClientService,
        private eventEmitter: EventEmitter2,
    ) {
        this.client = clientService.getClient();
    }

    initEvent() {
        this.client.onTokenSend((data: TokenSentEvent) => {
            this.eventEmitter.emit(Events.TokenSend, data);
        });

        this.client.onNotification((data) => {
        });

        this.client.onMessageButtonClicked((data) => {
            this.eventEmitter.emit(Events.MessageButtonClicked, data);
        });

        this.client.onStreamingJoinedEvent((data: StreamingJoinedEvent) => {
            this.eventEmitter.emit(Events.StreamingJoinedEvent, data);
        });

        this.client.onStreamingLeavedEvent((data: StreamingLeavedEvent) => {
            this.eventEmitter.emit(Events.StreamingLeavedEvent, data);
        });

        this.client.onClanEventCreated((data) => {
            this.eventEmitter.emit(Events.ClanEventCreated, data);
        });

        this.client.onMessageReaction((msg: ApiMessageReaction) => {
            this.logger.log(`[REACTION DEBUG] Received reaction event: ${JSON.stringify(msg)}`);
            
            // Emit standard event
            this.eventEmitter.emit(Events.MessageReaction, msg);
            
            // Kiểm tra cấu trúc msg chi tiết
            this.logger.log(`[REACTION DEBUG] Message ID: ${msg.message_id}`);
            this.logger.log(`[REACTION DEBUG] Full structure: ${JSON.stringify(msg, null, 2)}`);
            
            // Emit custom events for add/remove
            // ApiMessageReaction có thể có cấu trúc khác, nên ta cần xử lý linh hoạt
            // Giả định: msg có thể chứa action hoặc emoji và số lượng
            const action = (msg as any).action;
            const emoji = (msg as any).emoji || (msg as any).name;
            
            // Extract count from various possible structures
            let count;
            if ((msg as any).count !== undefined) {
                count = (msg as any).count;
            } else if ((msg as any).reactions && (msg as any).reactions[emoji]) {
                count = (msg as any).reactions[emoji];
            } else if ((msg as any).data?.reactions && (msg as any).data.reactions[emoji]) {
                count = (msg as any).data.reactions[emoji];
            } else {
                // Default fallback
                count = 1;
            }
            
            const userId = (msg as any).userId || (msg as any).user_id;
            const messageId = msg.message_id;
            
            this.logger.log(`[REACTION DEBUG] Processed reaction data: emoji=${emoji}, count=${count}, action=${action}`);
            
            if (messageId) {
                const eventType = action === 'remove' ? 'reaction.remove' : 'reaction.add';
                this.eventEmitter.emit(eventType, {
                    message_id: messageId,
                    reaction: emoji,
                    count: count,
                    user_id: userId
                });
            }
        });

        this.client.onChannelCreated((channel: ChannelCreatedEvent) => {
            this.eventEmitter.emit(Events.ChannelCreated, channel);
        });

        this.client.onUserClanRemoved((user: UserClanRemovedEvent) => {
            this.eventEmitter.emit(Events.UserClanRemoved, user);
        });

        this.client.onRoleEvent((data) => {
            this.eventEmitter.emit(Events.RoleEvent, data);
        });

        this.client.onRoleAssign((data) => {
            this.eventEmitter.emit(Events.RoleAssign, data);
        });

        this.client.onUserChannelAdded((user: UserChannelAddedEvent) => {
            this.eventEmitter.emit(Events.UserChannelAdded, user);
        });

        this.client.onChannelDeleted((channel: ChannelDeletedEvent) => {
            this.eventEmitter.emit(Events.ChannelDeleted, channel);
        });

        this.client.onChannelUpdated((channel: ChannelUpdatedEvent) => {
            this.eventEmitter.emit(Events.ChannelUpdated, channel);
        });

        this.client.onUserChannelRemoved((msg: UserChannelRemoved) => {
            this.eventEmitter.emit(Events.UserChannelRemoved, msg);
        });

        this.client.onGiveCoffee((data: GiveCoffeeEvent) => {
            this.eventEmitter.emit(Events.GiveCoffee, data);
        });

        this.client.onAddClanUser((data: AddClanUserEvent) => {
            this.eventEmitter.emit(Events.AddClanUser, data);
        });

        this.client.onRoleAssign((data: RoleAssignedEvent) => {
            this.eventEmitter.emit(Events.RoleAssign, data);
        });

        this.client.onVoiceJoinedEvent((data: VoiceJoinedEvent) => {
            this.eventEmitter.emit(Events.VoiceJoinedEvent, data);
        });

        this.client.onVoiceLeavedEvent((data: VoiceLeavedEvent) => {
            this.eventEmitter.emit(Events.VoiceLeavedEvent, data);
        });

        this.client.onChannelMessage(async (message) => {
            ['attachments', 'mentions', 'references'].forEach((key) => {
                if (!Array.isArray(message[key])) message[key] = [];
            });
            this.eventEmitter.emit(Events.ChannelMessage, message);
        });
    }
}