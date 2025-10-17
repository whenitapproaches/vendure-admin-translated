import { MoneyInput } from '@/vdb/components/data-input/money-input.js';
import { AssignedFacetValues } from '@/vdb/components/shared/assigned-facet-values.js';
import { EntityAssets } from '@/vdb/components/shared/entity-assets.js';
import { ErrorPage } from '@/vdb/components/shared/error-page.js';
import { FormFieldWrapper } from '@/vdb/components/shared/form-field-wrapper.js';
import { PermissionGuard } from '@/vdb/components/shared/permission-guard.js';
import { TaxCategorySelector } from '@/vdb/components/shared/tax-category-selector.js';
import { TranslatableFormFieldWrapper } from '@/vdb/components/shared/translatable-form-field.js';
import { Button } from '@/vdb/components/ui/button.js';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/vdb/components/ui/form.js';
import { Input } from '@/vdb/components/ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/vdb/components/ui/select.js';
import { Switch } from '@/vdb/components/ui/switch.js';
import { NEW_ENTITY_PATH } from '@/vdb/constants.js';
import {
    CustomFieldsPageBlock,
    DetailFormGrid,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageBlock,
    PageLayout,
    PageTitle,
} from '@/vdb/framework/layout-engine/page-layout.js';
import { detailPageRouteLoader } from '@/vdb/framework/page/detail-page-route-loader.js';
import { useDetailPage } from '@/vdb/framework/page/use-detail-page.js';
import { useChannel } from '@/vdb/hooks/use-channel.js';
import { Trans, useLingui } from '@/vdb/lib/trans.js';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react/jsx-runtime';
import { toast } from 'sonner';
import { api } from '@/vdb/graphql/api.js';
import { VariantPriceDetail } from './components/variant-price-detail.js';
import {
    createProductVariantDocument,
    productVariantDetailDocument,
    updateListPriceDocument,
    updateProductVariantDocument,
} from './product-variants.graphql.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';
import { useState } from 'react';

const pageId = 'product-variant-detail';

export const Route = createFileRoute('/_authenticated/_product-variants/product-variants_/$id')({
    component: ProductVariantDetailPage,
    loader: detailPageRouteLoader({
        pageId,
        queryDocument: productVariantDetailDocument,
        breadcrumb(_isNew, entity, location) {
            if ((location.search as any).from === 'product') {
                return [
                    { path: '/product', label: <Trans>Sản phẩm</Trans> },
                    { path: `/products/${entity?.product.id}`, label: entity?.product.name ?? '' },
                    entity?.name,
                ];
            }
            return [{ path: '/product-variants', label: <Trans>Biến thể sản phẩm</Trans> }, entity?.name];
        },
    }),
    errorComponent: ({ error }) => <ErrorPage message={error.message} />,
});

function ProductVariantDetailPage() {
    const { t } = useTranslation()
    const params = Route.useParams();
    const navigate = useNavigate();
    const creatingNewEntity = params.id === NEW_ENTITY_PATH;
    const { i18n } = useLingui();
    const { activeChannel } = useChannel();

    const { mutate: updateListPrice } = useMutation({
        mutationFn: api.mutate(updateListPriceDocument),
        onSuccess: () => {
            toast.success(t("List price updated successfully"))
        },
        onError: (error) => {
            toast.error(t("Failed to update list price"), {
                description: error instanceof Error ? error.message : "Unknown error",
            })
        },
    })

    const { form, submitHandler, entity, isPending, resetForm } = useDetailPage({
        pageId,
        queryDocument: productVariantDetailDocument,
        createDocument: createProductVariantDocument,
        updateDocument: updateProductVariantDocument,
        setValuesForUpdate: entity => {
            return {
                id: entity.id,
                enabled: entity.enabled,
                sku: entity.sku,
                featuredAssetId: entity.featuredAsset?.id,
                assetIds: entity.assets.map(asset => asset.id),
                facetValueIds: entity.facetValues.map(facetValue => facetValue.id),
                listPrice: entity.listPrice,
                taxCategoryId: entity.taxCategory.id,
                price: entity.price,
                prices: [],
                trackInventory: entity.trackInventory,
                outOfStockThreshold: entity.outOfStockThreshold,
                useGlobalOutOfStockThreshold: entity.useGlobalOutOfStockThreshold,
                stockLevels: entity.stockLevels.map(stockLevel => ({
                    stockOnHand: stockLevel.stockOnHand,
                    stockLocationId: stockLevel.stockLocation.id,
                })),
                translations: entity.translations.map(translation => ({
                    id: translation.id,
                    languageCode: translation.languageCode,
                    name: translation.name,
                    customFields: (translation as any).customFields,
                })),
                customFields: entity.customFields,
            };
        },
        params: { id: params.id },
        onSuccess: data => {
            toast.success(i18n.t(creatingNewEntity ? 'Tạo biến thể sản phẩm thành công' : 'Cập nhật biến thể sản phẩm thành công'));
            resetForm();
            if (creatingNewEntity) {
                navigate({ to: `../${(data as any)?.[0]?.id}`, from: Route.id });
            }
        },
        onError: err => {
            toast.error(i18n.t(creatingNewEntity ? 'Tạo biến thể sản phẩm thất bại' : 'Cập nhật biến thể sản phẩm thất bại'), {
                description: err instanceof Error ? err.message : 'Lỗi không xác định',
            });
        },
    });

    const [price, taxCategoryId] = form.watch(['price', 'taxCategoryId']);
    const [listPrice, setListPrice] = useState(entity?.listPrice);

    const onSubmit = (values: any) => {
        updateListPrice({
            variantId: entity?.id,
            listPrice: listPrice,
        })
        submitHandler(values)
    }

    return (
        <Page pageId={pageId} form={form} submitHandler={onSubmit} entity={entity}>
            <PageTitle>
                {creatingNewEntity ? <Trans>Biến thể sản phẩm mới</Trans> : (entity?.name ?? '')}
            </PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <PermissionGuard requires={['UpdateProduct', 'UpdateCatalog']}>
                        <Button
                            type="submit"
                            disabled={!form.formState.isDirty || !form.formState.isValid || isPending}
                        >
                            {creatingNewEntity ? <Trans>Tạo</Trans> : <Trans>Cập nhật</Trans>}
                        </Button>
                    </PermissionGuard>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <PageBlock column="side" blockId="enabled">
                    <FormFieldWrapper
                        control={form.control}
                        name="enabled"
                        label={<Trans>Kích hoạt</Trans>}
                        description={<Trans>Khi kích hoạt, sản phẩm sẽ hiển thị trên cửa hàng</Trans>}
                        render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                </PageBlock>
                <PageBlock column="main" blockId="main-form">
                    <DetailFormGrid>
                        <TranslatableFormFieldWrapper
                            control={form.control}
                            name="name"
                            label={<Trans>Tên sản phẩm</Trans>}
                            render={({ field }) => <Input {...field} />}
                        />

                        {/* <FormFieldWrapper
                            control={form.control}
                            name="sku"
                            label={<Trans>SKU</Trans>}
                            render={({ field }) => <Input {...field} />}
                        /> */}
                    </DetailFormGrid>
                </PageBlock>
                <CustomFieldsPageBlock column="main" entityType="ProductVariant" control={form.control} />

                <PageBlock column="main" blockId="price-and-tax" title={<Trans>Giá và thuế</Trans>}>
                    <div className="grid grid-cols-2 gap-4 items-start">
                        <FormFieldWrapper
                            control={form.control}
                            name="taxCategoryId"
                            label={<Trans>Loại thuế</Trans>}
                            render={({ field }) => (
                                <TaxCategorySelector value={field.value} onChange={field.onChange} />
                            )}
                        />

                        <div>
                            <FormFieldWrapper
                                control={form.control}
                                name="price"
                                label={<Trans>Giá</Trans>}
                                render={({ field }) => (
                                    <MoneyInput {...field} currency={entity?.currencyCode} />
                                )}
                            />
                            <FormFieldWrapper
                                control={form.control}
                                name="listPrice"
                                label={<Trans>List Price</Trans>}
                                description={<Trans>Original price before discounts</Trans>}
                                render={({ field }) => (
                                    <MoneyInput
                                        {...field}
                                        onChange={value => {
                                            field.onChange(value)
                                            setListPrice(value)
                                        }}
                                        currency={entity?.currencyCode}
                                    />
                                )}
                            />
                            <VariantPriceDetail
                                priceIncludesTax={activeChannel?.pricesIncludeTax ?? false}
                                price={price}
                                currencyCode={
                                    entity?.currencyCode ?? activeChannel?.defaultCurrencyCode ?? ''
                                }
                                taxCategoryId={taxCategoryId}
                            />
                        </div>
                    </div>
                </PageBlock>
                <PageBlock column="main" blockId="stock" title={<Trans>Tồn kho</Trans>}>
                    <DetailFormGrid>
                        {entity?.stockLevels.map((stockLevel, index) => (
                            <Fragment key={stockLevel.id}>
                                <FormFieldWrapper
                                    control={form.control}
                                    name={`stockLevels.${index}.stockOnHand`}
                                    label={<Trans>Mức tồn</Trans>}
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            value={field.value}
                                            onChange={e => {
                                                field.onChange(e.target.valueAsNumber);
                                            }}
                                        />
                                    )}
                                />
                                <div>
                                    <FormItem>
                                        <FormLabel>
                                            <Trans>Đã phân bổ</Trans>
                                        </FormLabel>
                                        <div className="text-sm pt-1.5">{stockLevel.stockAllocated}</div>
                                    </FormItem>
                                </div>
                            </Fragment>
                        ))}

                        <FormFieldWrapper
                            control={form.control}
                            name="trackInventory"
                            label={<Trans>Theo dõi tồn kho</Trans>}
                            render={({ field }) => (
                                <Select
                                    onValueChange={val => {
                                        if (val) {
                                            field.onChange(val);
                                        }
                                    }}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="">
                                            <SelectValue placeholder="Theo dõi tồn kho" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="INHERIT">
                                            <Trans>Kế thừa từ cài đặt chung</Trans>
                                        </SelectItem>
                                        <SelectItem value="TRUE">
                                            <Trans>Theo dõi</Trans>
                                        </SelectItem>
                                        <SelectItem value="FALSE">
                                            <Trans>Không theo dõi</Trans>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="outOfStockThreshold"
                            label={<Trans>Ngưỡng hết hàng</Trans>}
                            description={
                                <Trans>
                                    Thiết lập mức tồn tại đó biến thể được coi là hết hàng. Dùng giá trị âm để bật cho phép đặt trước.
                                </Trans>
                            }
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    value={field.value}
                                    onChange={e => field.onChange(e.target.valueAsNumber)}
                                />
                            )}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="useGlobalOutOfStockThreshold"
                            label={<Trans>Dùng ngưỡng hết hàng toàn cục</Trans>}
                            description={
                                <Trans>
                                    Thiết lập mức tồn tại đó biến thể được coi là hết hàng. Dùng giá trị âm để bật cho phép đặt trước.
                                </Trans>
                            }
                            render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </DetailFormGrid>
                </PageBlock>

                <PageBlock column="side" blockId="facet-values">
                    <FormFieldWrapper
                        control={form.control}
                        name="facetValueIds"
                        label={<Trans>Giá trị thuộc tính</Trans>}
                        render={({ field }) => (
                            <AssignedFacetValues facetValues={entity?.facetValues ?? []} {...field} />
                        )}
                    />
                </PageBlock>
                <PageBlock column="side" blockId="assets">
                    <FormItem>
                        <FormLabel>
                            <Trans>Tệp</Trans>
                        </FormLabel>
                        <FormControl>
                            <EntityAssets
                                assets={entity?.assets}
                                featuredAsset={entity?.featuredAsset}
                                compact={true}
                                value={form.getValues()}
                                onChange={value => {
                                    form.setValue('featuredAssetId', value.featuredAssetId ?? undefined, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    });
                                    form.setValue('assetIds', value.assetIds ?? undefined, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    });
                                }}
                            />
                        </FormControl>
                        <FormDescription></FormDescription>
                        <FormMessage />
                    </FormItem>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}
