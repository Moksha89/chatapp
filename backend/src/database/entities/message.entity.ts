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

  @Column({ default: false })
  isStarred: boolean;

  @Column({ type: 'varchar', nullable: true })
  forwardedFrom: string | null;

  @Column({ type: 'varchar', nullable: true })
  replyToMessageId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  reactions: { [emoji: string]: string[] } | null;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChatEntity, chat => chat.messages)
  @JoinColumn({ name: 'chatId' })
  chat: ChatEntity;
}
