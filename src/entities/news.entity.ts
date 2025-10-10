import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('news')
export class News {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 1000, unique: true })
    @Index()
    link: string;

    @Column({ type: 'text' })
    summary: string;

    @Column({ type: 'varchar', length: 500 })
    title: string;

    @Column({ type: 'varchar', length: 100 })
    @Index()
    category: string;

    @Column({ type: 'varchar', length: 200 })
    source: string;

    @Column({ type: 'varchar', nullable: true })
    imageUrl?: string;

    @Column({ type: 'boolean', default: false })
    @Index()
    posted: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}


