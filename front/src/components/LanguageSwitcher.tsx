import type { ChangeEvent } from "react";

import { useTranslation } from "../i18n";
import type { Language } from "../i18n";

export function LanguageSwitcher() {
  const { language, setLanguage, languages, t } = useTranslation();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value as Language);
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{t("app.language")}:</span>
      <select
        aria-label={t("app.language")}
        className="px-2 py-1.5 rounded-lg border bg-white text-sm"
        value={language}
        onChange={handleChange}
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
