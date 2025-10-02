import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/vdb/components/ui/dialog.js';
import { Button } from '@/vdb/components/ui/button.js';
import { Input } from '@/vdb/components/ui/input.js';
import { Textarea } from '@/vdb/components/ui/textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/vdb/components/ui/select.js';
import { Label } from '@/vdb/components/ui/label.js';
import { Switch } from '@/vdb/components/ui/switch.js';
import { api } from '@/vdb/graphql/api.js';
import { Trans } from '@/vdb/lib/trans.js';
import { Save, X } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'telegram';
  event: 'order_created' | 'order_status_changed';
  subject: string;
  content: string;
  isActive: boolean;
  description?: string;
}

interface NotificationTemplateEditDialogProps {
  template: NotificationTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}


export function NotificationTemplateEditDialog({
  template,
  isOpen,
  onClose,
  onSave,
}: NotificationTemplateEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'telegram',
    event: 'order_created' as 'order_created' | 'order_status_changed',
    subject: '',
    content: '',
    isActive: true,
    description: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        event: template.event,
        subject: template.subject,
        content: template.content,
        isActive: template.isActive,
        description: template.description || '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'email',
        event: 'order_created',
        subject: '',
        content: '',
        isActive: true,
        description: '',
      });
    }
  }, [template]);


  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (template) {
        // Update existing template
        const result = await api.mutate(`
          mutation UpdateNotificationTemplate($input: UpdateNotificationTemplateInput!) {
            updateNotificationTemplate(input: $input) {
              id
              name
              type
              event
              subject
              content
              isActive
              description
            }
          }
        `, {
          input: {
            id: template.id,
            name: formData.name,
            subject: formData.subject,
            content: formData.content,
            isActive: formData.isActive,
            description: formData.description,
            // Note: type and event are not updatable according to the service interface
          },
        });
      } else {
        // Create new template
        const result = await api.mutate(`
          mutation CreateNotificationTemplate($input: CreateNotificationTemplateInput!) {
            createNotificationTemplate(input: $input) {
              id
              name
              type
              event
              subject
              content
              isActive
              description
            }
          }
        `, {
          input: {
            name: formData.name,
            type: formData.type,
            event: formData.event,
            subject: formData.subject,
            content: formData.content,
            description: formData.description,
            // Note: isActive is not in CreateInput, it's set to true by default
          },
        });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      alert(`Failed to save template: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const getDefaultTemplate = () => {
    if (formData.type === 'email') {
      if (formData.event === 'order_created') {
        return {
          subject: 'Order Confirmation - [ORDER_CODE]',
          content: `<h2>Thank you for your order!</h2>
<p>Dear [CUSTOMER_NAME],</p>
<p>We have received your order <strong>[ORDER_CODE]</strong> placed on [ORDER_DATE].</p>

<h3>Order Details:</h3>
<p><strong>Total:</strong> [ORDER_TOTAL]</p>
<p><strong>Status:</strong> [ORDER_STATUS]</p>

<h3>Items Ordered:</h3>
<p>[ORDER_ITEMS]</p>

<h3>Shipping Address:</h3>
<p>[SHIPPING_ADDRESS]</p>

<p>Thank you for your business!</p>`,
        };
      } else {
        return {
          subject: 'Order Status Update - [ORDER_CODE]',
          content: `<h2>Order Status Update</h2>
<p>Dear [CUSTOMER_NAME],</p>
<p>Your order <strong>[ORDER_CODE]</strong> status has been updated to: <strong>[ORDER_STATUS]</strong></p>

<h3>Order Summary:</h3>
<p><strong>Order Code:</strong> [ORDER_CODE]</p>
<p><strong>Total:</strong> [ORDER_TOTAL]</p>
<p><strong>Current Status:</strong> [ORDER_STATUS]</p>

<p>Thank you for your business!</p>`,
        };
      }
    } else {
      // Telegram templates
      if (formData.event === 'order_created') {
        return {
          subject: 'New Order Notification',
          content: `🛍️ <b>New Order Received!</b>

📋 <b>Order:</b> [ORDER_CODE]
👤 <b>Customer:</b> [CUSTOMER_NAME]
💰 <b>Total:</b> [ORDER_TOTAL]
📅 <b>Date:</b> [ORDER_DATE]

📦 <b>Items:</b>
[ORDER_ITEMS]

📍 <b>Shipping to:</b>
[SHIPPING_ADDRESS]`,
        };
      } else {
        return {
          subject: 'Order Status Update',
          content: `📋 <b>Order Status Update</b>

🆔 <b>Order:</b> [ORDER_CODE]
👤 <b>Customer:</b> [CUSTOMER_NAME]
🔄 <b>New Status:</b> [ORDER_STATUS]
💰 <b>Total:</b> [ORDER_TOTAL]`,
        };
      }
    }
  };

  const loadDefaultTemplate = () => {
    const defaultTemplate = getDefaultTemplate();
    setFormData(prev => ({
      ...prev,
      subject: defaultTemplate.subject,
      content: defaultTemplate.content,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] overflow-y-auto w-[90vw] sm:max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>
            {template ? (
              <Trans>Edit Template</Trans>
            ) : (
              <Trans>Create Template</Trans>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-8">
          {/* Form Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                <Trans>Name</Trans>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">
                  <Trans>Type</Trans>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'email' | 'telegram' }))}
                  disabled={!!template} // Disable when editing existing template
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="telegram">📱 Telegram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event">
                  <Trans>Event</Trans>
                </Label>
                <Select
                  value={formData.event}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event: value as 'order_created' | 'order_status_changed' }))}
                  disabled={!!template} // Disable when editing existing template
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_created">Order Created</SelectItem>
                    <SelectItem value="order_status_changed">Status Changed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">
                <Trans>Subject</Trans>
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter subject line"
              />
            </div>

            <div>
              <Label htmlFor="description">
                <Trans>Description</Trans>
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">
                <Trans>Active</Trans>
              </Label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="content">
                  <Trans>Content</Trans>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={loadDefaultTemplate}>
                  <Trans>Load Default</Trans>
                </Button>
              </div>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={formData.type === 'email' ? 'Enter HTML content' : 'Enter message content'}
                rows={16}
                className="font-mono text-sm"
              />
            </div>

            {/* Template Variables Help */}
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Available Variables:</strong>
              <div className="mt-1 space-y-1">
                <div><code>[ORDER_CODE]</code> - Order code</div>
                <div><code>[ORDER_TOTAL]</code> - Order total with currency</div>
                <div><code>[ORDER_STATUS]</code> - Order state</div>
                <div><code>[CUSTOMER_NAME]</code> - Customer full name</div>
                <div><code>[CUSTOMER_EMAIL]</code> - Customer email</div>
                <div><code>[ORDER_DATE]</code> - Order creation date</div>
                <div><code>[ORDER_ITEMS]</code> - Formatted item list</div>
                <div><code>[SHIPPING_ADDRESS]</code> - Shipping address</div>
                <div><code>[BILLING_ADDRESS]</code> - Billing address</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name || !formData.content}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? (
              <Trans>Saving...</Trans>
            ) : (
              <Trans>Save</Trans>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
