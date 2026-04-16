import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CallParticipantEntity } from './call-participant.entity';

@Entity('calls')
export class CallEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  initiatorId: string;

  @Column({ type: 'varchar', nullable: true })
  receiverId: string | null;

  @Column({ type: 'varchar', nullable: true })
  chatId: string | null;

  @Column({ type: 'varchar' })
  callType: string; // 'audio' | 'video'

  @Column({ type: 'varchar', default: 'direct' })
  callMode: string; // 'direct' | 'group'

  @Column({ type: 'varchar', default: 'ringing' })
  status: string; // 'ringing' | 'active' | 'ended' | 'missed' | 'declined'

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null; // seconds

  @Column({ type: 'int', default: 10 })
  maxParticipants: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CallParticipantEntity, participant => participant.call)
  participants: CallParticipantEntity[];
}
