import { HistoryEntryItem } from '@/vdb/framework/extension-api/types/index.js';
import { Trans } from '@/vdb/lib/trans.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';
import {
    ArrowRightToLine,
    Ban,
    CheckIcon,
    CreditCardIcon,
    Edit3,
    SquarePen,
    Truck,
    UserX,
} from 'lucide-react';
import { OrderHistoryOrderDetail } from './order-history-types.js';

export function orderHistoryUtils(order: OrderHistoryOrderDetail) {
    const { t } = useTranslation();
    const getTimelineIcon = (entry: HistoryEntryItem) => {
        switch (entry.type) {
            case 'ORDER_PAYMENT_TRANSITION':
                return <CreditCardIcon className="h-4 w-4" />;
            case 'ORDER_REFUND_TRANSITION':
                return <CreditCardIcon className="h-4 w-4" />;
            case 'ORDER_NOTE':
                return <SquarePen className="h-4 w-4" />;
            case 'ORDER_STATE_TRANSITION':
                if (entry.data.to === 'Delivered') {
                    return <CheckIcon className="h-4 w-4" />;
                }
                if (entry.data.to === 'Cancelled') {
                    return <Ban className="h-4 w-4" />;
                }
                return <ArrowRightToLine className="h-4 w-4" />;
            case 'ORDER_FULFILLMENT_TRANSITION':
                if (entry.data.to === 'Shipped' || entry.data.to === 'Delivered') {
                    return <Truck className="h-4 w-4" />;
                }
                return <ArrowRightToLine className="h-4 w-4" />;
            case 'ORDER_FULFILLMENT':
                return <Truck className="h-4 w-4" />;
            case 'ORDER_MODIFIED':
                return <Edit3 className="h-4 w-4" />;
            case 'ORDER_CUSTOMER_UPDATED':
                return <UserX className="h-4 w-4" />;
            case 'ORDER_CANCELLATION':
                return <Ban className="h-4 w-4" />;
            default:
                return <CheckIcon className="h-4 w-4" />;
        }
    };

    const getTitle = (entry: HistoryEntryItem) => {
        switch (entry.type) {
            case 'ORDER_PAYMENT_TRANSITION':
                if (entry.data.to === 'Settled') {
                    return t('Payment settled');
                }
                if (entry.data.to === 'Authorized') {
                    return t('Payment authorized');
                }
                if (entry.data.to === 'Declined' || entry.data.to === 'Cancelled') {
                    return t('Payment failed');
                }
                return t('Payment transitioned');
            case 'ORDER_REFUND_TRANSITION':
                if (entry.data.to === 'Settled') {
                    return t('Refund settled');
                }
                return t('Refund transitioned');
            case 'ORDER_NOTE':
                return t('Note added');
            case 'ORDER_STATE_TRANSITION': {
                if (entry.data.from === 'Created') {
                    return t('Order placed');
                }
                if (entry.data.to === 'Delivered') {
                    return t('Order fulfilled');
                }
                if (entry.data.to === 'Cancelled') {
                    return t('Order cancelled');
                }
                if (entry.data.to === 'Shipped') {
                    return t('Order shipped');
                }
                return t('Order transitioned');
            }
            case 'ORDER_FULFILLMENT_TRANSITION':
                if (entry.data.to === 'Shipped') {
                    return t('Order shipped');
                }
                if (entry.data.to === 'Delivered') {
                    return t('Order delivered');
                }
                return t('Fulfillment transitioned');
            case 'ORDER_FULFILLMENT':
                return t('Fulfillment created');
            case 'ORDER_MODIFIED':
                return t('Order modified');
            case 'ORDER_CUSTOMER_UPDATED':
                return t('Customer updated');
            case 'ORDER_CANCELLATION':
                return t('Order cancelled');
            default:
                return t(entry.type.replace(/_/g, ' ').toLowerCase());
        }
    };

    const getIconColor = ({ type, data }: HistoryEntryItem) => {
        const success = 'bg-success text-success-foreground';
        const destructive = 'bg-danger text-danger-foreground';
        const regular = 'bg-muted text-muted-foreground';

        if (type === 'ORDER_PAYMENT_TRANSITION' && data.to === 'Settled') {
            return success;
        }
        if (type === 'ORDER_STATE_TRANSITION' && data.to === 'Delivered') {
            return success;
        }
        if (type === 'ORDER_FULFILLMENT_TRANSITION' && data.to === 'Delivered') {
            return success;
        }
        if (type === 'ORDER_CANCELLATION') {
            return destructive;
        }
        if (type === 'ORDER_STATE_TRANSITION' && data.to === 'Cancelled') {
            return destructive;
        }
        if (type === 'ORDER_PAYMENT_TRANSITION' && (data.to === 'Declined' || data.to === 'Cancelled')) {
            return destructive;
        }
        return regular;
    };

    const getActorName = (entry: HistoryEntryItem) => {
        if (entry.administrator) {
            return `${entry.administrator.firstName} ${entry.administrator.lastName}`;
        } else if (order?.customer) {
            return `${order.customer.firstName} ${order.customer.lastName}`;
        }
        return '';
    };

    const isPrimaryEvent = (entry: HistoryEntryItem) => {
        switch (entry.type) {
            case 'ORDER_STATE_TRANSITION':
                return (
                    entry.data.to === 'Delivered' ||
                    entry.data.to === 'Cancelled' ||
                    entry.data.to === 'Settled' ||
                    entry.data.from === 'Created'
                );
            case 'ORDER_REFUND_TRANSITION':
                return entry.data.to === 'Settled';
            case 'ORDER_PAYMENT_TRANSITION':
                return entry.data.to === 'Settled' || entry.data.to === 'Cancelled';
            case 'ORDER_FULFILLMENT_TRANSITION':
                return entry.data.to === 'Delivered' || entry.data.to === 'Shipped';
            case 'ORDER_NOTE':
            case 'ORDER_MODIFIED':
            case 'ORDER_CUSTOMER_UPDATED':
            case 'ORDER_CANCELLATION':
                return true;
            default:
                return false; // All other events are secondary
        }
    };

    return {
        getTimelineIcon,
        getTitle,
        getIconColor,
        getActorName,
        isPrimaryEvent,
    };
}
