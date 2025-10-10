import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Confession } from './confession.entity';

@Entity()
export class ReactionLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'message_id' })
    messageId: string;

    @Column({ name: 'confession_id' })
    confessionId: string;

    @ManyToOne(() => Confession)
    @JoinColumn({ name: 'confession_id' })
    confession: Confession;

    @Column('simple-json')
    reactions: { [key: string]: number };

    @Column({ name: 'total_count', default: 0 })
    totalCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}