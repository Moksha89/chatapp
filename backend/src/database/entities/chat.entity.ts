import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatParticipantEntity } from './chat-participant.entity';
import { MessageEntity } from './message.entity';
import { ChatLabelEntity } from './chat-label.entity';

@Entity('chats')
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ChatParticipantEntity, participant => participant.chat)
  participants: ChatParticipantEntity[];

  @OneToMany(() => MessageEntity, message => message.chat)
  messages: MessageEntity[];

  @OneToMany(() => ChatLabelEntity, chatLabel => chatLabel.chat)
  chatLabels: ChatLabelEntity[];
}
