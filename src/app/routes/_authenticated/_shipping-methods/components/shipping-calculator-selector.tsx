import { ConfigurableOperationSelector } from '@/vdb/components/shared/configurable-operation-selector.js';
import { configurableOperationDefFragment } from '@/vdb/graphql/fragments.js';
import { graphql } from '@/vdb/graphql/graphql.js';
import { ConfigurableOperationInput as ConfigurableOperationInputType } from '@vendure/common/lib/generated-types';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

export const shippingCalculatorsDocument = graphql(
    `
        query GetShippingCalculators {
            shippingCalculators {
                ...ConfigurableOperationDef
            }
        }
    `,
    [configurableOperationDefFragment],
);

interface ShippingCalculatorSelectorProps {
    value: ConfigurableOperationInputType | undefined;
    onChange: (value: ConfigurableOperationInputType | undefined) => void;
}

export function ShippingCalculatorSelector({ value, onChange }: Readonly<ShippingCalculatorSelectorProps>) {
    const { t } = useTranslation();
    return (
        <ConfigurableOperationSelector
            value={value}
            onChange={onChange}
            queryDocument={shippingCalculatorsDocument}
            queryKey="shippingCalculators"
            dataPath="shippingCalculators"
            buttonText={t('Select Shipping Calculator')}
        />
    );
}
