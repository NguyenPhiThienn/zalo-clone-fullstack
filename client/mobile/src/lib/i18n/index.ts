import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './locales/en.json';
import vi from './locales/vi.json';

const LANGUAGE_KEY = '@app_language';

// Language detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // Kiểm tra ngôn ngữ đã lưu
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Nếu chưa có, dùng ngôn ngữ thiết bị
      const locales = Localization.getLocales();
      const deviceLanguage = locales[0]?.languageCode || 'en';

      // Map device language to supported languages
      const languageMap: { [key: string]: string } = {
        'vi': 'vi',
        'en': 'en',
      };

      const supportedLanguage = languageMap[deviceLanguage] || 'en';
      callback(supportedLanguage);
    } catch (error) {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error(error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
