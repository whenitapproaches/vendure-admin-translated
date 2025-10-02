import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DeepPartial, ID } from '@vendure/core';

export enum NotificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

export enum NotificationEvent {
  ORDER_CREATED = 'order_created',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
}

@Entity()
export class NotificationTemplate {
  constructor(input?: DeepPartial<NotificationTemplate>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn()
  id: ID;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'varchar',
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
  })
  event: NotificationEvent;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
