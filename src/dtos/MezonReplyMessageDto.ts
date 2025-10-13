import {
    ApiMessageAttachment,
    ApiMessageMention,
    ApiMessageRef,
    ChannelMessageContent,
} from 'mezon-sdk';

export interface ReplyMezonMessage {
    id?: string; // Added id field for queue tracking
    clan_id?: string;
    channel_id?: string;
    channelDmId?: string;
    is_public?: boolean;
    is_parent_public?: boolean;
    parent_id?: string;
    mode?: number;
    msg?: ChannelMessageContent & {
        reply_to?: string; // ID of the message to reply to
    };
    mentions?: Array<ApiMessageMention>;
    attachments?: Array<ApiMessageAttachment>;
    ref?: Array<ApiMessageRef>; // user for send message in channel
    userId?: string;
    textContent?: string;
    messOptions?: {
        [x: string]: any;
    };
    refs?: Array<ApiMessageRef>; // user for send message to user
    sender_id?: string;
    anonymous_message?: boolean;
    mention_everyone?: boolean;
    avatar?: string;
    code?: number;
    topic_id?: string;
    message_id?: string;
    confession_id?: string; // Added for tracking confession ID
    
    // Fields for the header message and reply functionality
    is_date_message?: boolean; // Flag to identify a date message (deprecated)
    is_header_message?: boolean; // Flag to identify a header message
    is_reply?: boolean; // Flag to identify a message that should be a reply
    reply_to_date_message?: boolean; // Flag to indicate this should reply to a date message (deprecated)
    reply_to_header_message?: boolean; // Flag to indicate this should reply to a header message
    date_message_id?: string; // ID of the date message in the queue (deprecated)
    header_message_id?: string; // ID of the header message in the queue
    reply_to_message_id?: string; // ID of the message to reply to
    
    // Fields for message priority and sequencing
    priority?: number; // Priority for processing (lower numbers = higher priority)
    wait_for_header?: boolean; // Flag to wait for header message to be sent first

}

export interface ReactMessageChannel {
    id?: string;
    clan_id: string;
    parent_id?: string;
    channel_id: string;
    mode: number;
    is_public: boolean;
    is_parent_public: boolean;
    message_id: string;
    emoji_id: string;
    emoji: string;
    count: number;
    message_sender_id: string;
    action_delete?: boolean;
}