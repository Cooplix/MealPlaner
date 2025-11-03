import { FormEvent, useState } from "react";

import { useTranslation } from "../../i18n";

interface LoginPageProps {
  onSubmit: (credentials: { login: string; password: string }) => Promise<void>;
  submitting: boolean;
  error?: string | null;
}

export function LoginPage({ onSubmit, submitting, error }: LoginPageProps) {
  const { t } = useTranslation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ login, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">{t("auth.loginTitle")}</h1>
        <div className="space-y-1">
          <label className="block text-sm text-gray-600" htmlFor="login">
            {t("auth.loginLabel")}
          </label>
          <input
            id="login"
            className="w-full rounded-xl border px-3 py-2"
            autoComplete="username"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-gray-600" htmlFor="password">
            {t("auth.passwordLabel")}
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border px-3 py-2"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "…" : t("auth.submit")}
        </button>
      </form>
    </div>
  );
}
