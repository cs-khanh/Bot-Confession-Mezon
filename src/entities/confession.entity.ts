import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Reaction } from './reaction.entity';

export enum ConfessionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class Confession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'confession_number', unique: true })
    confessionNumber: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'author_hash' })
    authorHash: string;

    @Column({ type: 'jsonb', nullable: true })
    attachments: any[];

    @Column({
        type: 'enum',
        enum: ConfessionStatus,
        default: ConfessionStatus.PENDING,
    })
    status: ConfessionStatus;

    @Column({ name: 'posted_at', nullable: true })
    postedAt: Date;

    @Column({ name: 'reaction_count', default: 0 })
    reactionCount: number;

    @Column({ name: 'messageId', nullable: true })
    messageId: string;

    @Column({ name: 'moderationMessageId', nullable: true })
    moderationMessageId: string;

    @Column({ name: 'channel_id', nullable: true })
    channelId: string;

    @Column({ type: 'text', array: true, nullable: true, default: '{}' })
    tags: string[];

    @Column({ name: 'moderation_comment', nullable: true })
    moderationComment: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // ✅ Quan hệ 1-nhiều với Reaction
    @OneToMany(() => Reaction, (reaction) => reaction.confession, {
        cascade: true,
    })
    reactions: Reaction[];
}
