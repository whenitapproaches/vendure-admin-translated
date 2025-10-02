import React from 'react';
import { useTranslation } from './custom-trans.js';

/**
 * This is a temporary work-around because the Lingui macros do not
 * currently work when the dashboard is packaged in an npm
 * module. Related issue: https://github.com/kentcdodds/babel-plugin-macros/issues/87
 */
export function Trans({ children }: Readonly<{ children: React.ReactNode; context?: string }>) {
    const { t } = useTranslation();
    
    // If children is a string, translate it
    if (typeof children === 'string') {
        return <>{t(children)}</>;
    }
    
    // If children is a React element with string content, translate it
    if (React.isValidElement(children) && typeof children.props?.children === 'string') {
        return <>{t(children.props.children)}</>;
    }
    
    // Fallback to original children
    return <>{children}</>;
}

export function useLingui() {
    const { locale, setLocale } = useTranslation();
    return { 
        i18n: { 
            locale,
            t: (key: string) => key,
        }, 
        setLocale 
    };
}
