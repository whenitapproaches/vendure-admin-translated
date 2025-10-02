import React from 'react';
import { Trans } from '@/vdb/lib/trans.js';
import { useTranslation } from '@/vdb/lib/custom-trans.js';

export function TranslationTest() {
    const { locale, setLocale, t } = useTranslation();

    return (
        <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">{t("Translation Test")}</h3>
            
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{t("Current Language")}: {locale}</label>
                <div className="space-x-2">
                    <button 
                        onClick={() => setLocale('vi')}
                        className={`px-3 py-1 rounded ${locale === 'vi' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        Tiếng Việt
                    </button>
                    <button 
                        onClick={() => setLocale('en')}
                        className={`px-3 py-1 rounded ${locale === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    >
                        English
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <p><strong>{t("Direct translation")}:</strong> {t('Save')}</p>
                <p><strong>{t("Trans component")}:</strong> <Trans>Save</Trans></p>
                <p><strong>{t("More examples")}:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                    <li><Trans>Delete</Trans></li>
                    <li><Trans>Edit</Trans></li>
                    <li><Trans>Create</Trans></li>
                    <li><Trans>Loading...</Trans></li>
                    <li><Trans>Error</Trans></li>
                    <li><Trans>Success</Trans></li>
                </ul>
            </div>
        </div>
    );
}
