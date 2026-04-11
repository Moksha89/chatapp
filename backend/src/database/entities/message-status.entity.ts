import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('message_statuses')
export class MessageStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', default: 'sent' })
  status: string; // 'sent' | 'delivered' | 'seen'

  @Column({ type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  seenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
