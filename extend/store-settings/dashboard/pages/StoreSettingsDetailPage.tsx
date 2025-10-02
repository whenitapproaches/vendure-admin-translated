import { useRef } from 'react';
import { DetailFormGrid, Page } from '@/vdb/framework/layout-engine/page-layout.js';
import { useDetailPage } from '@/vdb/framework/page/use-detail-page.js';
import { useLingui } from '@/vdb/lib/trans.js';
import { api } from '@/vdb/graphql/api.js';
import { graphql } from '@/vdb/graphql/graphql.js';
import { Button } from '@/vdb/components/ui/button.js';
import { toast } from 'sonner';
import { NEW_ENTITY_PATH } from '@/vdb/constants.js';
import { PageTitle, PageActionBar, PageActionBarRight, PageBlock, PageLayout } from '@/vdb/framework/layout-engine/page-layout.js';
import { Input } from '@/vdb/components/ui/input.js';
import { FormFieldWrapper } from '@/vdb/components/shared/form-field-wrapper.js';
import { PermissionGuard } from '@/vdb/components/shared/permission-guard.js';
import { Trans } from '@/vdb/lib/trans.js';

const setVietnameseGlobalSettingsDocument = graphql(`
    mutation SetVietnameseGlobalSettings {
        updateGlobalSettings(input: {
            availableLanguages: [vi, en]
            defaultLanguageCode: vi
        }) {
            id
            availableLanguages
            defaultLanguageCode
        }
    }
`);

import {
    getStoreSettingsQuery,
    createStoreSettingsDocument,
    updateStoreSettingsDocument,
} from '../queries.js';

const pageId = 'store-settings-detail';

export function StoreSettingsDetailPage({ route }) {
    const params = route.useParams();
    const creatingNewEntity = params.id === NEW_ENTITY_PATH;
    const { i18n } = useLingui();

    const { form, submitHandler, entity, isPending, refreshEntity, resetForm } = useDetailPage<any, any, any>({
        pageId,
        entityName: 'StoreSettings',
        queryDocument: getStoreSettingsQuery,
        createDocument: createStoreSettingsDocument,
        updateDocument: updateStoreSettingsDocument,
        setValuesForUpdate: (entity: any) => {
            return {
                id: entity.id,
                key: entity.key,
                value: entity.value,
            };
        },
        params: { id: params.id },
        onSuccess: async data => {
            toast.success(i18n.t('Successfully updated store settings'));
            resetForm();
        },
        onError: err => {
            toast.error(i18n.t('Failed to update store settings'), {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        },
    });

    return (
        <Page pageId={pageId} form={form} submitHandler={submitHandler} entity={entity}>
            <PageTitle>{creatingNewEntity ? 'Cấu hình mới' : ((entity as any)?.key ?? '')}</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <PermissionGuard requires={['UpdateProduct']}>
                        <Button
                            type="submit"
                            disabled={!form.formState.isDirty || !form.formState.isValid || isPending}
                        >
                            <Trans>Cập nhật</Trans>
                        </Button>
                    </PermissionGuard>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <PageBlock column="main" blockId="main-form">
                    <DetailFormGrid>
                        <FormFieldWrapper
                            control={form.control as any}
                            name={"key" as any}
                            label="Khóa"
                            render={({ field }) => <Input {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control as any}
                            name={"value" as any}
                            label="Giá trị"
                            render={({ field }) => <Input {...field} />}
                        />
                    </DetailFormGrid>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}
