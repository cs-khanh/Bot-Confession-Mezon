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

            // Emit base event for logging/debugging
            this.eventEmitter.emit(Events.MessageReaction, msg);

            const messageId = msg.message_id;
            if (!messageId) return;

            // Extract basic info
            const emoji = (msg as any).emoji || (msg as any).name;
            const action = (msg as any).action; // true = add, false = remove
            const userId = (msg as any).sender_id || (msg as any).user_id;

            // Try to determine how many reactions this user had for this emoji
            let count = 1;
            if ((msg as any).count !== undefined) count = (msg as any).count;
            else if ((msg as any).reactions?.[emoji]) count = (msg as any).reactions[emoji];
            else if ((msg as any).data?.reactions?.[emoji]) count = (msg as any).data.reactions[emoji];

            this.logger.log(`[REACTION DEBUG] Parsed: emoji=${emoji}, count=${count}, action=${action}`);

            // ADD → increase by +count
            if (action === false) {
                this.eventEmitter.emit('reaction.add', {
                message_id: messageId,
                reaction: emoji,
                count: count,
                user_id: userId,
                });
                this.logger.log(`[REACTION EMIT] ADD → ${emoji} (+${count}) message=${messageId}`);
            }

            // REMOVE → remove all reactions of this emoji from that user
            else if (action === true) {
                this.eventEmitter.emit('reaction.remove', {
                message_id: messageId,
                reaction: emoji,
                count: count, // remove the same number that user added
                user_id: userId,
                });
                this.logger.log(`[REACTION EMIT] REMOVE → ${emoji} (-${count}) message=${messageId}`);
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