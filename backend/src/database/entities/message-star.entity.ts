import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('message_stars')
@Unique(['messageId', 'userId'])
export class MessageStarEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
