import { ConfigurableOperationMultiSelector } from '@/vdb/components/shared/configurable-operation-multi-selector.js';
import { configurableOperationDefFragment } from '@/vdb/graphql/fragments.js';
import { graphql } from '@/vdb/graphql/graphql.js';
import { ConfigurableOperationInput as ConfigurableOperationInputType } from '@vendure/common/lib/generated-types';

export const promotionActionsDocument = graphql(
    `
        query GetPromotionActions {
            promotionActions {
                ...ConfigurableOperationDef
            }
        }
    `,
    [configurableOperationDefFragment],
);

interface PromotionActionsSelectorProps {
    value: ConfigurableOperationInputType[];
    onChange: (value: ConfigurableOperationInputType[]) => void;
}

export function PromotionActionsSelector({ value, onChange }: Readonly<PromotionActionsSelectorProps>) {
    return (
        <ConfigurableOperationMultiSelector
            value={value}
            onChange={onChange}
            queryDocument={promotionActionsDocument}
            queryKey="promotionActions"
            dataPath="promotionActions"
            buttonText="Thêm hành động"
            dropdownTitle="Hành động khả dụng"
            showEnhancedDropdown={true}
        />
    );
}
