import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  action: string;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'varchar', nullable: true })
  targetId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
