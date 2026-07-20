import { useStore } from '@/store/useStore';
import { translations, TranslationKey, Language } from '@/lib/translations';

export function useTranslation() {
  const { user } = useStore();
  const lang = (user?.preferences?.language as Language) || 'pt-BR';
  
  const language = translations[lang] ? lang : 'pt-BR';
  
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['pt-BR'][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    
    return text;
  };

  return { t, language };
}
