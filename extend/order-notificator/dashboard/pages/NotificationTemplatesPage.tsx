import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/vdb/components/ui/card.js';
import { Button } from '@/vdb/components/ui/button.js';
import { Badge } from '@/vdb/components/ui/badge.js';
import { api } from '@/vdb/graphql/api.js';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Edit, Eye } from 'lucide-react';
import { NotificationTemplateEditDialog } from '../components/NotificationTemplateEditDialog';
import { NotificationTemplatePreviewDialog } from '../components/NotificationTemplatePreviewDialog';

interface NotificationTemplate {
  id: string
  name: string
  type: "email" | "telegram"
  event: "order_created" | "order_status_changed"
  subject: string
  content: string
  isActive: boolean
  description?: string
}

const initializeDefaultNotificationTemplatesDocument = `
  mutation InitializeDefaultNotificationTemplates {
    initializeDefaultNotificationTemplates {
      id
      name
    }
  }
`

export function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)

  const { mutate: initializeDefaults, isPending: isInitializing } = useMutation({
    mutationFn: api.mutate(initializeDefaultNotificationTemplatesDocument),
    onSuccess: (result) => {
      toast.success("Đã khởi tạo mẫu mặc định thành công")
      loadTemplates()
    },
    onError: (error) => {
      toast.error(`Không thể khởi tạo mẫu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`)
    }
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const result = (await api.query(`
        query GetNotificationTemplates {
          notificationTemplates {
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
      `)) as { notificationTemplates: NotificationTemplate[] }
      
      setTemplates(result.notificationTemplates || [])
    } catch (error) {
      console.error("Failed to load notification templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu này?")) return

    try {
      await api.mutate(
        `
        mutation DeleteNotificationTemplate($id: ID!) {
          deleteNotificationTemplate(id: $id)
        }
      `,
        { id: templateId }
      )

      await loadTemplates()
    } catch (error) {
      console.error("Failed to delete template:", error)
    }
  }

  const handleEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setEditDialogOpen(true)
  }

  const handlePreview = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setPreviewDialogOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setEditDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    setEditDialogOpen(false)
    setPreviewDialogOpen(false)
    setSelectedTemplate(null)
    loadTemplates() // Refresh the templates list
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mẫu thông báo</h1>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mẫu thông báo</h1>
          <p className="text-gray-600">
            Tùy chỉnh mẫu thông báo email và Telegram cho các sự kiện đơn hàng
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => initializeDefaults({})} 
            disabled={isInitializing}
          >
            {isInitializing ? "Đang khởi tạo..." : "Khởi tạo mặc định"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mẫu</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Không tìm thấy mẫu thông báo nào.</p>
              <p className="text-sm mt-2">
                Nhấp "Khởi tạo mặc định" để tạo mẫu khởi đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Tên</th>
                    <th className="text-left p-4 font-medium">Loại</th>
                    <th className="text-left p-4 font-medium">Sự kiện</th>
                    <th className="text-left p-4 font-medium">Trạng thái</th>
                    <th className="text-left p-4 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-500">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            template.type === "email" ? "secondary" : "default"
                          }
                        >
                          {template.type === "email"
                            ? "📧 Email"
                            : "📱 Telegram"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {template.event === "order_created"
                            ? "Đơn hàng được tạo"
                            : "Trạng thái thay đổi"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={template.isActive ? "success" : "secondary"}
                        >
                          {template.isActive ? "Hoạt động" : "Không hoạt động"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(template)}
                            title="Xem trước mẫu"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(template)}
                            title="Chỉnh sửa mẫu"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(template.id)}
                            title="Xóa mẫu"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <NotificationTemplateEditDialog
        template={selectedTemplate}
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleDialogSuccess}
      />

      {/* Preview Dialog */}
      {selectedTemplate && (
        <NotificationTemplatePreviewDialog
          template={selectedTemplate}
          isOpen={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
        />
      )}
    </div>
  )
}
