import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('reaction_user')
@Index(['messageId', 'emoji', 'userId'], { unique: true })
export class ReactionUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    messageId: string;

    @Column({ length: 255 })
    emoji: string;

    @Column({ length: 255 })
    userId: string;

    @Column({ type: 'int', default: 0 })
    count: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
