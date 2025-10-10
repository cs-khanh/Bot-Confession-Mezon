import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class WeeklyStats {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    week: number;

    @Column()
    year: number;

    @Column()
    startDate: Date;

    @Column()
    endDate: Date;

    @Column({ default: 0 })
    totalConfessions: number;

    @Column({ default: 0 })
    approvedConfessions: number;

    @Column({ default: 0 })
    rejectedConfessions: number;

    @Column({ default: 0 })
    totalReactions: number;

    @Column('simple-json')
    topConfessions: {
        confessionId: string;
        reactionCount: number;
        content: string;
    }[];

    @Column('simple-json')
    topTags: {
        tag: string;
        count: number;
    }[];

    @Column('simple-json')
    reactionDistribution: {
        [key: string]: number;
    };

    @CreateDateColumn()
    createdAt: Date;
}