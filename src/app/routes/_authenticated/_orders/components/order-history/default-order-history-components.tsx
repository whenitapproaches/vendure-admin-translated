import { HistoryEntry, HistoryEntryProps } from '@/vdb/framework/history-entry/history-entry.js';
import { Trans } from '@/vdb/lib/trans.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

export function OrderStateTransitionComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    if (entry.data.from === 'Created') return null;

    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('From')} {entry.data.from} {t('to')} {entry.data.to}
            </p>
        </HistoryEntry>
    );
}

export function OrderPaymentTransitionComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Payment #')}{entry.data.paymentId} {t('transitioned to')} {entry.data.to}
            </p>
        </HistoryEntry>
    );
}

export function OrderRefundTransitionComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Refund #')}{entry.data.refundId} {t('transitioned to')} {entry.data.to}
            </p>
        </HistoryEntry>
    );
}

export function OrderFulfillmentTransitionComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Fulfillment #')}{entry.data.fulfillmentId} {t('From')} {entry.data.from} {t('to')} {entry.data.to}
            </p>
        </HistoryEntry>
    );
}

export function OrderFulfillmentComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Fulfillment #')}{entry.data.fulfillmentId} {t('created')}
            </p>
        </HistoryEntry>
    );
}

export function OrderModifiedComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    const { entry } = props;
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Order modification #')}{entry.data.modificationId}
            </p>
        </HistoryEntry>
    );
}

export function OrderCustomerUpdatedComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Customer information updated')}
            </p>
        </HistoryEntry>
    );
}

export function OrderCancellationComponent(props: Readonly<HistoryEntryProps>) {
    const { t } = useTranslation();
    return (
        <HistoryEntry {...props}>
            <p className="text-xs text-muted-foreground">
                {t('Order cancelled')}
            </p>
        </HistoryEntry>
    );
}
