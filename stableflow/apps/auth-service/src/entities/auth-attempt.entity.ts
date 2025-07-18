import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('auth_attempts')
export class AuthAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column()
  email: string;

  @Column()
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column()
  success: boolean;

  @Column({ nullable: true })
  failure_reason: string;

  @CreateDateColumn()
  attempted_at: Date;

  @ManyToOne(() => User, user => user.auth_attempts, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 