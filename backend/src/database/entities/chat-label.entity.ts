import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { LabelEntity } from './label.entity';

@Entity('chat_labels')
export class ChatLabelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chatId: string;

  @Column()
  labelId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChatEntity, chat => chat.chatLabels)
  @JoinColumn({ name: 'chatId' })
  chat: ChatEntity;

  @ManyToOne(() => LabelEntity, label => label.chatLabels)
  @JoinColumn({ name: 'labelId' })
  label: LabelEntity;
}
