import { ConfigurableOperationSelector } from '@/vdb/components/shared/configurable-operation-selector.js';
import { configurableOperationDefFragment } from '@/vdb/graphql/fragments.js';
import { graphql } from '@/vdb/graphql/graphql.js';
import { ConfigurableOperationInput as ConfigurableOperationInputType } from '@vendure/common/lib/generated-types';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

export const paymentHandlersDocument = graphql(
    `
        query GetPaymentHandlers {
            paymentMethodHandlers {
                ...ConfigurableOperationDef
            }
        }
    `,
    [configurableOperationDefFragment],
);

interface PaymentHandlerSelectorProps {
    value: ConfigurableOperationInputType | undefined;
    onChange: (value: ConfigurableOperationInputType | undefined) => void;
}

export function PaymentHandlerSelector({ value, onChange }: Readonly<PaymentHandlerSelectorProps>) {
    const { t } = useTranslation();
    return (
        <ConfigurableOperationSelector
            value={value}
            onChange={onChange}
            queryDocument={paymentHandlersDocument}
            queryKey="paymentMethodHandlers"
            dataPath="paymentMethodHandlers"
            buttonText={t('Select Payment Handler')}
        />
    );
}
