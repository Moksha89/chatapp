import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chatbot_configs')
export class ChatbotConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chatId: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'text', default: '[]' })
  rules: string; // JSON array of { trigger: string; response: string }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
