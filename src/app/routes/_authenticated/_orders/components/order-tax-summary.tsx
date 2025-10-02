import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/vdb/components/ui/table.js';
import { useLocalFormat } from '@/vdb/hooks/use-local-format.js';
import { Trans } from '@/vdb/lib/trans.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';
import { Order } from '../utils/order-types.js';

export function OrderTaxSummary({ order }: Readonly<{ order: Order }>) {
    const { t } = useTranslation();
    const { formatCurrency } = useLocalFormat();
    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            {t('Description')}
                        </TableHead>
                        <TableHead>
                            {t('Tax rate')}
                        </TableHead>
                        <TableHead>
                            {t('Tax base')}
                        </TableHead>
                        <TableHead>
                            {t('Tax total')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.taxSummary.map(taxLine => (
                        <TableRow key={taxLine.description}>
                            <TableCell>{taxLine.description}</TableCell>
                            <TableCell>{taxLine.taxRate}%</TableCell>
                            <TableCell>{formatCurrency(taxLine.taxBase, order.currencyCode)}</TableCell>
                            <TableCell>{formatCurrency(taxLine.taxTotal, order.currencyCode)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
