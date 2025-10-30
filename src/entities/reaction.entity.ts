import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { Confession } from './confession.entity';

@Entity()
export class Reaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    messageId: string;

    @Column()
    confessionId: string;

    @Column()
    emoji: string;

    @Column({ default: 0 })
    count: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Confession, (confession) => confession.reactions, {
        onDelete: 'CASCADE',
    })
    confession: Confession;
}
