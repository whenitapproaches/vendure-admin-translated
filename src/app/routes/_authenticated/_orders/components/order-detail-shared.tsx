import { CustomFieldsForm } from '@/vdb/components/shared/custom-fields-form.js';
import { PermissionGuard } from '@/vdb/components/shared/permission-guard.js';
import { Button } from '@/vdb/components/ui/button.js';
import { DropdownMenuItem } from '@/vdb/components/ui/dropdown-menu.js';
import {
    Page,
    PageActionBar,
    PageActionBarRight,
    PageBlock,
    PageLayout,
    PageTitle,
} from '@/vdb/framework/layout-engine/page-layout.js';
import { getDetailQueryOptions, useDetailPage } from '@/vdb/framework/page/use-detail-page.js';
import { api } from '@/vdb/graphql/api.js';
import { useCustomFieldConfig } from '@/vdb/hooks/use-custom-field-config.js';
import { Trans, useLingui } from '@/vdb/lib/trans.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ResultOf } from 'gql.tada';
import { Pencil, User, X } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import {
    cancelOrderWithItemsDocument,
    orderDetailDocument,
    setOrderCustomFieldsDocument,
    transitionOrderToStateDocument,
} from '../orders.graphql.js';
import { canAddFulfillment, shouldShowAddManualPaymentButton } from '../utils/order-utils.js';
import { AddManualPaymentDialog } from './add-manual-payment-dialog.js';
import { FulfillOrderDialog } from './fulfill-order-dialog.js';
import { FulfillmentDetails } from './fulfillment-details.js';
import { OrderAddress } from './order-address.js';
import { OrderHistoryContainer } from './order-history/order-history-container.js';
import { orderHistoryQueryKey } from './order-history/use-order-history.js';
import { OrderTable } from './order-table.js';
import { OrderTaxSummary } from './order-tax-summary.js';
import { PaymentDetails } from './payment-details.js';
import { getTypeForState, StateTransitionControl } from './state-transition-control.js';
import { useTransitionOrderToState } from './use-transition-order-to-state.js';

export type OrderDetail = NonNullable<ResultOf<typeof orderDetailDocument>['order']>;

export interface OrderDetailSharedProps {
    // Required props
    pageId: string;
    orderId: string;
    // Title customization
    titleSlot?: (order: OrderDetail) => React.ReactNode;
    // Optional content slots
    beforeOrderTable?: (order: OrderDetail) => React.ReactNode;
}

function DefaultOrderTitle({ entity }: { entity: any }) {
    return <>{entity?.code ?? ''}</>;
}

/**
 * @description
 * Shared functionality between the order and seller order detail pages.
 */
export function OrderDetailShared({
    pageId,
    orderId,
    titleSlot,
    beforeOrderTable,
}: Readonly<OrderDetailSharedProps>) {
    const { i18n } = useLingui();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { form, submitHandler, entity, refreshEntity } = useDetailPage({
        pageId,
        queryDocument: orderDetailDocument,
        updateDocument: setOrderCustomFieldsDocument,
        setValuesForUpdate: (entity: any) => {
            return {
                id: entity.id,
                customFields: entity.customFields,
            };
        },
        params: { id: orderId },
        onSuccess: async () => {
            toast(t('Successfully updated order'));
            form.reset(form.getValues());
        },
        onError: err => {
            toast(t('Failed to update order'), {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        },
    });

    const { transitionToState } = useTransitionOrderToState(entity?.id);
    const transitionOrderToStateMutation = useMutation({
        mutationFn: api.mutate(transitionOrderToStateDocument),
    });

    const customFieldConfig = useCustomFieldConfig('Order');

    const stateTransitionActions = useMemo(() => {
        if (!entity) {
            return [];
        }
        return entity.nextStates.map((state: string) => ({
            label: `${t('Transition to')} ${state}`,
            type: getTypeForState(state),
            onClick: async () => {
                const transitionError = await transitionToState(state);
                if (transitionError) {
                    toast(t('Failed to transition order to state'), {
                        description: transitionError,
                    });
                } else {
                    refreshOrderAndHistory();
                }
            },
        }));
    }, [entity, transitionToState, i18n]);

    if (!entity) {
        return null;
    }

    const handleModifyClick = async () => {
        try {
            await transitionOrderToStateMutation.mutateAsync({
                id: entity.id,
                state: 'Modifying',
            });
            const queryKey = getDetailQueryOptions(orderDetailDocument, { id: entity.id }).queryKey;
            await queryClient.invalidateQueries({ queryKey });
            await navigate({ to: `/orders/$id/modify`, params: { id: entity.id } });
        } catch (error) {
            toast(t('Failed to modify order'), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    const nextStates = entity.nextStates;
    const showAddPaymentButton = shouldShowAddManualPaymentButton(entity);
    const showFulfillButton = canAddFulfillment(entity);

    async function refreshOrderAndHistory() {
        if (entity) {
            const queryKey = getDetailQueryOptions(orderDetailDocument, { id: entity.id }).queryKey;
            await queryClient.invalidateQueries({ queryKey });
            queryClient.refetchQueries({ queryKey: orderHistoryQueryKey(entity.id) });
        }
    }

    const cancelOrderWithItemsMutation = useMutation({
        mutationFn: api.mutate(cancelOrderWithItemsDocument),
    })

    const handleCancelOrderClick = async () => {
        if (!confirm(t("Are you sure you want to cancel this order? This will cancel all order items and cannot be undone."))) {
            return
        }

        try {
            await cancelOrderWithItemsMutation.mutateAsync({
                orderId: entity.id,
            })

            toast(t("Order cancelled successfully"))

            // Refresh the order data
            const queryKey = getDetailQueryOptions(orderDetailDocument, {
                id: entity.id,
            }).queryKey
            await queryClient.invalidateQueries({ queryKey })
            queryClient.refetchQueries({ queryKey: orderHistoryQueryKey(entity.id) })
        } catch (error) {
            toast(t("Failed to cancel order"), {
                description: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }

    return (
        <Page pageId={pageId} form={form} submitHandler={submitHandler} entity={entity}>
            <PageTitle>{titleSlot?.(entity) || <DefaultOrderTitle entity={entity} />}</PageTitle>
            <PageActionBar>
                <PageActionBarRight
                    dropdownMenuItems={[
                        ...(nextStates.includes('Modifying')
                            ? [
                                {
                                    component: () => (
                                        <DropdownMenuItem onClick={handleModifyClick}>
                                            <Pencil className="w-4 h-4" />
                                            <Trans>Modify</Trans>
                                        </DropdownMenuItem>
                                    ),
                                },
                            ]
                            : []),
                        ...(nextStates.includes("Cancelled") && entity.state !== "Cancelled"
                            ? [
                                {
                                    component: () => (
                                        <DropdownMenuItem
                                            onClick={handleCancelOrderClick}
                                            disabled={cancelOrderWithItemsMutation.isPending}
                                        >
                                            <X className="w-4 h-4" />
                                            <Trans>Cancel</Trans>
                                        </DropdownMenuItem>
                                    ),
                                },
                            ]
                            : []),
                    ]}
                >
                    {showAddPaymentButton && (
                        <PermissionGuard requires={['UpdateOrder']}>
                            <AddManualPaymentDialog
                                order={entity}
                                onSuccess={() => {
                                    refreshEntity();
                                }}
                            />
                        </PermissionGuard>
                    )}
                    {showFulfillButton && (
                        <PermissionGuard requires={['UpdateOrder']}>
                            <FulfillOrderDialog
                                order={entity}
                                onSuccess={() => {
                                    refreshOrderAndHistory();
                                }}
                            />
                        </PermissionGuard>
                    )}
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                {/* Main Column Blocks */}
                {beforeOrderTable?.(entity)}
                <PageBlock column="main" blockId="order-table">
                    <OrderTable order={entity} pageId={pageId} />
                </PageBlock>
                <PageBlock column="main" blockId="tax-summary" title={t('Tax summary')}>
                    <OrderTaxSummary order={entity} />
                </PageBlock>
                {customFieldConfig?.length ? (
                    <PageBlock column="main" blockId="custom-fields">
                        <CustomFieldsForm entityType="Order" control={form.control} />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={!form.formState.isDirty || !form.formState.isValid}
                            >
                                {t('Save')}
                            </Button>
                        </div>
                    </PageBlock>
                ) : null}
                <PageBlock column="main" blockId="payment-details" title={t('Payment details')}>
                    <div className="grid lg:grid-cols-2 gap-4">
                        {entity?.payments?.map((payment: any) => (
                            <PaymentDetails
                                key={payment.id}
                                payment={payment}
                                currencyCode={entity.currencyCode}
                                onSuccess={refreshOrderAndHistory}
                            />
                        ))}
                    </div>
                </PageBlock>
                <PageBlock column="main" blockId="order-history" title={t('Order history')}>
                    <OrderHistoryContainer orderId={orderId} />
                </PageBlock>

                {/* Side Column Blocks */}
                <PageBlock column="side" blockId="state">
                    <StateTransitionControl
                        currentState={entity?.state}
                        actions={stateTransitionActions}
                        isLoading={transitionOrderToStateMutation.isPending}
                    />
                </PageBlock>
                <PageBlock column="side" blockId="customer" title={t('Customer')}>
                    {entity?.customer ? (
                        <Button variant="ghost" asChild>
                            <Link to={`/customers/${entity.customer.id}`}>
                                <User className="w-4 h-4" />
                                {entity.customer.firstName} {entity.customer.lastName}
                            </Link>
                        </Button>
                    ) : (
                        <div className="text-muted-foreground text-xs font-medium p-3 border rounded-md">
                            {t('No customer')}
                        </div>
                    )}
                    <div className="mt-4 divide-y">
                        {entity?.shippingAddress && (
                            <div className="pb-6">
                                <div className="font-medium">
                                    {t('Shipping address')}
                                </div>
                                <OrderAddress address={entity.shippingAddress} />
                            </div>
                        )}
                        {entity?.billingAddress && (
                            <div className="pt-4">
                                <div className="font-medium">
                                    {t('Billing address')}
                                </div>
                                <OrderAddress address={entity.billingAddress} />
                            </div>
                        )}
                    </div>
                </PageBlock>
                <PageBlock
                    column="side"
                    blockId="fulfillment-details"
                    title={t('Fulfillment details')}
                >
                    {entity?.fulfillments?.length && entity.fulfillments.length > 0 ? (
                        <div className="space-y-2">
                            {entity?.fulfillments?.map((fulfillment: any) => (
                                <FulfillmentDetails
                                    key={fulfillment.id}
                                    order={entity}
                                    fulfillment={fulfillment}
                                    onSuccess={() => {
                                        refreshEntity();
                                        queryClient.refetchQueries({
                                            queryKey: orderHistoryQueryKey(entity.id),
                                        });
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-xs font-medium p-3 border rounded-md">
                            {t('No fulfillments')}
                        </div>
                    )}
                </PageBlock>
            </PageLayout>
        </Page>
    );
}
