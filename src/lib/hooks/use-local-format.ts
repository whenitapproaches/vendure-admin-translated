import { useCallback, useMemo } from 'react';

import { useServerConfig } from './use-server-config.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

/**
 * @description
 * This hook is used to format numbers and currencies using the configured language and
 * locale of the dashboard app.
 *
 * @example
 * ```ts
 * const {
 *          formatCurrency,
 *          formatNumber,
 *          formatDate,
 *          formatLanguageName,
 *          formatCurrencyName,
 *          toMajorUnits,
 * } = useLocalFormat();
 * ```
 *
 * @docsCategory hooks
 * @docsPage useLocalFormat
 * @docsWeight 0
 */
export function useLocalFormat() {
    const { moneyStrategyPrecision } = useServerConfig() ?? { moneyStrategyPrecision: 2 };
    const precisionFactor = useMemo(() => Math.pow(10, moneyStrategyPrecision), [moneyStrategyPrecision]);
    const { locale, t } = useTranslation();
    const localeCode = locale === 'vi' ? 'vi-VN' : 'en-US';

    const toMajorUnits = useCallback(
        (value: number): number => {
            return value / precisionFactor;
        },
        [precisionFactor],
    );

    const toMinorUnits = useCallback(
        (value: number): number => {
            return Math.round(value * precisionFactor);
        },
        [precisionFactor],
    );

    const formatCurrency = useCallback(
        (value: number, currency: string, precision?: number) => {
            return new Intl.NumberFormat(localeCode, {
                style: 'currency',
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(toMajorUnits(value));
        },
        [localeCode, moneyStrategyPrecision, toMajorUnits],
    );

    const formatNumber = useCallback(
        (value: number) => {
            return new Intl.NumberFormat(localeCode).format(value);
        },
        [localeCode],
    );

    const formatDate = useCallback(
        (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
            return new Intl.DateTimeFormat(localeCode, options).format(new Date(value));
        },
        [localeCode],
    );

    const formatRelativeDate = useCallback(
        (value: string | Date, options?: Intl.RelativeTimeFormatOptions) => {
            const now = new Date();
            const date = new Date(value);
            const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            
            // For Vietnamese, we'll use custom translations for common relative dates
            if (locale === 'vi') {
                const diffMinutes = Math.floor(diffSeconds / 60);
                const diffHours = Math.floor(diffSeconds / 3600);
                const diffDays = Math.floor(diffSeconds / 86400);
                
                if (diffSeconds < 60) {
                    return t('just now');
                } else if (diffMinutes < 60) {
                    return t('{{count}} minutes ago').replace('{{count}}', diffMinutes.toString());
                } else if (diffHours < 24) {
                    return t('{{count}} hours ago').replace('{{count}}', diffHours.toString());
                } else if (diffDays === 1) {
                    return t('yesterday');
                } else if (diffDays < 7) {
                    return t('{{count}} days ago').replace('{{count}}', diffDays.toString());
                } else {
                    return new Intl.RelativeTimeFormat(localeCode, options).format(
                        Math.floor((diffSeconds / 86400) * -1),
                        'days',
                    );
                }
            }
            
            // Default behavior for other locales
            if (diffSeconds < 60) {
                return new Intl.RelativeTimeFormat(localeCode, options).format(diffSeconds * -1, 'seconds');
            } else if (diffSeconds < 3600) {
                return new Intl.RelativeTimeFormat(localeCode, options).format(
                    Math.floor((diffSeconds / 60) * -1),
                    'minutes',
                );
            } else if (diffSeconds < 86400) {
                return new Intl.RelativeTimeFormat(localeCode, options).format(
                    Math.floor((diffSeconds / 3600) * -1),
                    'hours',
                );
            } else if (diffSeconds < 2592000) {
                return new Intl.RelativeTimeFormat(localeCode, options).format(
                    Math.floor((diffSeconds / 86400) * -1),
                    'days',
                );
            } else if (diffSeconds < 31536000) {
                return new Intl.RelativeTimeFormat(localeCode, options).format(
                    Math.floor((diffSeconds / 2592000) * -1),
                    'months',
                );
            } else {
                return new Intl.RelativeTimeFormat(localeCode, options).format(
                    Math.floor((diffSeconds / 31536000) * -1),
                    'years',
                );
            }
        },
        [locale, localeCode, t],
    );

    const formatLanguageName = useCallback(
        (value: string): string => {
            try {
                return (
                    new Intl.DisplayNames([locale], { type: 'language' }).of(value.replace('_', '-')) ?? value
                );
            } catch (e: any) {
                return value;
            }
        },
        [locale],
    );

    const formatCurrencyName = useCallback(
        (currencyCode: string, display: 'full' | 'symbol' | 'name' = 'full'): string => {
            if (!currencyCode) return '';

            try {
                const name =
                    display === 'full' || display === 'name'
                        ? (new Intl.DisplayNames([locale], { type: 'currency' }).of(currencyCode) ?? '')
                        : '';

                const symbol =
                    display === 'full' || display === 'symbol'
                        ? (new Intl.NumberFormat(locale, {
                              style: 'currency',
                              currency: currencyCode,
                              currencyDisplay: 'symbol',
                          })
                              .formatToParts()
                              .find(p => p.type === 'currency')?.value ?? currencyCode)
                        : '';

                return display === 'full' ? `${name} (${symbol})` : display === 'name' ? name : symbol;
            } catch (e) {
                return currencyCode;
            }
        },
        [locale],
    );

    return {
        formatCurrency,
        formatNumber,
        formatDate,
        formatRelativeDate,
        formatLanguageName,
        formatCurrencyName,
        toMajorUnits,
        toMinorUnits,
    };
}
