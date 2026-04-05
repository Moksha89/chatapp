import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ChatEntity } from './chat.entity';

@Entity('chat_participants')
export class ChatParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chatId: string;

  @Column()
  userId: string;

  @Column()
  role: string;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  mutedUntil: Date | null;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ type: 'simple-json', nullable: true })
  clearChatBefore: Date | null;

  @ManyToOne(() => ChatEntity, chat => chat.participants)
  @JoinColumn({ name: 'chatId' })
  chat: ChatEntity;

  @ManyToOne(() => UserEntity, user => user.chatParticipants)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
