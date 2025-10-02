/**
 * @description
 * The plugin can be configured using the following options:
 */
export interface PluginInitOptions {
    telegramBotToken?: string;
    telegramChatId?: string;
    enableOrderCreatedNotifications?: boolean;
    enableOrderStatusChangeNotifications?: boolean;
    enableEmailNotifications?: boolean;
    emailFromAddress?: string;
    emailFromName?: string;
    notificationTemplate?: {
        orderCreated?: string;
        orderStatusChanged?: string;
    };
}
