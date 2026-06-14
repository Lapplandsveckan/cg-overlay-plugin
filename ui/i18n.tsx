import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import en from './locales/en.json';
import sv from './locales/sv.json';

i18n.addResourceBundle('en', 'cg-overlay-plugin', en, true, true);
i18n.addResourceBundle('sv', 'cg-overlay-plugin', sv, true, true);

export { useTranslation };
