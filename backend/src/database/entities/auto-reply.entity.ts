import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('auto_replies')
export class AutoReplyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string; // 'greeting', 'away', 'quick_reply'

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  schedule: string | null; // JSON string for schedule config

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
