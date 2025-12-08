import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatEntity } from './chat.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chatId: string;

  @Column()
  senderId: string;

  @Column({ type: 'varchar', nullable: true })
  senderDeviceId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  ciphertext: string | null;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column({ type: 'varchar', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaType: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaName: string | null;

  @Column({ type: 'int', nullable: true })
  mediaSize: number | null;

  @Column({ type: 'int', nullable: true })
  mediaDuration: number | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChatEntity, chat => chat.messages)
  @JoinColumn({ name: 'chatId' })
  chat: ChatEntity;
}
