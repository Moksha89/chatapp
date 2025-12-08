import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('web_sessions')
export class WebSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pairingCode: string;

  @Column({ nullable: true })
  userId: string | null;

  @Column({ nullable: true })
  deviceId: string | null;

  @Column()
  status: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
