import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/vdb/graphql/api.js';
import { graphql } from '@/vdb/graphql/graphql.js';
import { Form } from '@/vdb/components/ui/form.js';
import { FormFieldWrapper } from '@/vdb/components/shared/form-field-wrapper.js';
import { Input } from '@/vdb/components/ui/input.js';
import { Textarea } from '@/vdb/components/ui/textarea.js';
import { Button } from '@/vdb/components/ui/button.js';
import { toast } from 'sonner';

const createStoreSettingsMutation = graphql(`
    mutation CreateStoreSettings($input: CreateStoreSettingsInput!) {
        createStoreSettings(input: $input) {
            id
            key
            value
            createdAt
            updatedAt
        }
    }
`);

const updateStoreSettingsMutation = graphql(`
    mutation UpdateStoreSettings($input: UpdateStoreSettingsInput!) {
        updateStoreSettings(input: $input) {
            id
            key
            value
            createdAt
            updatedAt
        }
    }
`);

interface StoreSettingsFormProps {
    setting?: any;
    onSuccess?: () => void;
}

interface FormData {
    key: string;
    value: string;
}

export function StoreSettingsForm({ setting, onSuccess }: StoreSettingsFormProps) {
    const queryClient = useQueryClient();
    const isEditing = !!setting;

    const form = useForm<FormData>({
        defaultValues: {
            key: setting?.key || '',
            value: setting?.value || '',
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: FormData) =>
            api.mutate(createStoreSettingsMutation, { input: data }),
        onSuccess: () => {
            toast.success('Tạo cấu hình thành công');
            onSuccess?.();
        },
        onError: (error) => {
            toast.error('Tạo cấu hình thất bại', {
                description: (error as Error).message,
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: FormData) =>
            api.mutate(updateStoreSettingsMutation, {
                input: {
                    id: setting.id,
                    ...data,
                },
            }),
        onSuccess: () => {
            toast.success('Cập nhật cấu hình thành công');
            onSuccess?.();
        },
        onError: (error) => {
            toast.error('Cập nhật cấu hình thất bại', {
                description: (error as Error).message,
            });
        },
    });

    const onSubmit = (data: FormData) => {
        if (isEditing) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormFieldWrapper
                    control={form.control}
                    name="key"
                    label="Key"
                    rules={{
                        required: 'Bắt buộc nhập khóa',
                        pattern: {
                            value: /^[a-zA-Z0-9_-]+$/,
                            message: 'Khóa chỉ gồm chữ, số, gạch dưới và gạch nối',
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            {...field}
                            placeholder="e.g., store_name, contact_email"
                            disabled={isEditing} // Key cannot be changed when editing
                        />
                    )}
                />

                <FormFieldWrapper
                    control={form.control}
                    name="value"
                    label="Giá trị"
                    rules={{
                        required: 'Value is required',
                    }}
                    render={({ field }) => (
                        <Textarea
                            {...field}
                            placeholder="Nhập giá trị cấu hình"
                            rows={4}
                        />
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onSuccess}
                        disabled={isLoading}
                    >
                        Hủy
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading
                            ? isEditing
                                ? 'Đang cập nhật...'
                                : 'Đang tạo...'
                            : isEditing
                            ? 'Cập nhật cấu hình'
                            : 'Tạo cấu hình'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
