import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

interface LanguageOption {
  code: "vi" | "en";
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View className="rounded-2xl gap-2">
      {languages.map((language) => {
        const isActive = currentLanguage === language.code;

        return (
          <TouchableOpacity
            key={language.code}
            className={`p-4 py-3 rounded-[20px] ${isActive ? "bg-emerald-100" : "bg-transparent"}`}
            onPress={() => changeLanguage(language.code)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Text className="text-[32px] mr-4">{language.flag}</Text>
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${isActive ? "text-emerald-600" : "text-gray-800"} mb-0.5`}
                  >
                    {language.nativeName}
                  </Text>
                  <Text
                    className={`text-base ${isActive ? "text-green-600" : "text-gray-500"}`}
                  >
                    {language.name}
                  </Text>
                </View>
              </View>
              {isActive && (
                <View className="w-7 h-7 rounded-full bg-emerald-500 items-center justify-center">
                  <Text className="text-white text-base font-bold">✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
