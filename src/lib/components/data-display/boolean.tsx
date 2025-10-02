import { CheckIcon, XIcon } from 'lucide-react';
import React from 'react';
import { Badge } from '../ui/badge.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

export function BooleanDisplayCheckbox({ value }: Readonly<{ value: boolean }>) {
    return value ? <CheckIcon className="opacity-70" /> : <XIcon className="opacity-70" />;
}

export function BooleanDisplayBadge({
    value,
    labelTrue,
    labelFalse,
}: {
    value: boolean;
    labelTrue?: string | React.ReactNode;
    labelFalse?: string | React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <Badge variant={value ? 'success' : 'destructive'}>
            {value ? (labelTrue ?? t('Enabled')) : (labelFalse ?? t('Disabled'))}
        </Badge>
    );
}
