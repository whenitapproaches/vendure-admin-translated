import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { NotificationTemplateService, CreateNotificationTemplateInput, UpdateNotificationTemplateInput } from '../services/notification-template.service';
import { NotificationTemplate } from '../entities/notification-template.entity';

@Resolver()
export class NotificationTemplateResolver {
  constructor(private notificationTemplateService: NotificationTemplateService) {}

  @Query()
  @Allow(Permission.ReadSettings)
  async notificationTemplates(@Ctx() ctx: RequestContext): Promise<NotificationTemplate[]> {
    return this.notificationTemplateService.findAll(ctx);
  }

  @Query()
  @Allow(Permission.ReadSettings)
  async notificationTemplate(
    @Ctx() ctx: RequestContext,
    @Args('id') id: string
  ): Promise<NotificationTemplate | null> {
    return this.notificationTemplateService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateSettings)
  async createNotificationTemplate(
    @Ctx() ctx: RequestContext,
    @Args('input') input: CreateNotificationTemplateInput
  ): Promise<NotificationTemplate> {
    return this.notificationTemplateService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateSettings)
  async updateNotificationTemplate(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpdateNotificationTemplateInput
  ): Promise<NotificationTemplate> {
    return this.notificationTemplateService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteSettings)
  async deleteNotificationTemplate(
    @Ctx() ctx: RequestContext,
    @Args('id') id: string
  ): Promise<boolean> {
    return this.notificationTemplateService.delete(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateSettings)
  async initializeDefaultNotificationTemplates(@Ctx() ctx: RequestContext): Promise<NotificationTemplate[]> {
    const defaultTemplates = this.notificationTemplateService.getDefaultTemplates();
    
    const createdTemplates: NotificationTemplate[] = [];

    for (const templateInput of defaultTemplates) {
      try {
        const existing = await this.notificationTemplateService.findByTypeAndEvent(
          ctx,
          templateInput.type,
          templateInput.event
        );
        
        if (!existing) {
          const created = await this.notificationTemplateService.create(ctx, templateInput);
          createdTemplates.push(created);
        } else {
        }
      } catch (error) {
        console.error(`❌ Failed to create default template ${templateInput.name}:`, error);
      }
    }

    return createdTemplates;
  }
}
