import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tiktok_videos')
export class TikTokVideo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index({ unique: true })
    videoId: string;

    @Column({ length: 500, nullable: true })
    title: string;

    @Column({ length: 200, nullable: true })
    authorUsername: string;

    @Column({ length: 200, nullable: true })
    authorDisplayName: string;

    @Column({ type: 'bigint', default: 0 })
    likeCount: number;

    @Column({ type: 'bigint', default: 0 })
    viewCount: number;

    @Column({ type: 'bigint', default: 0 })
    shareCount: number;

    @Column({ type: 'bigint', default: 0 })
    commentCount: number;

    @Column({ nullable: true })
    videoUrl: string;

    @Column({ nullable: true })
    coverImageUrl: string;

    @Column({ type: 'timestamp', nullable: true })
    tiktokCreatedAt: Date;

    @Column({ default: false })
    posted: boolean;

    @Column({ type: 'int', default: 0 })
    hotScore: number; // Điểm hot = likeCount + viewCount/10 + shareCount*2

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;
}

