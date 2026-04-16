import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CallEntity } from './call.entity';

@Entity('call_participants')
export class CallParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  callId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', default: 'invited' })
  status: string; // 'invited' | 'joined' | 'left' | 'declined' | 'missed'

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  @Column({ type: 'boolean', default: true })
  isVideoEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CallEntity, call => call.participants)
  @JoinColumn({ name: 'callId' })
  call: CallEntity;
}
