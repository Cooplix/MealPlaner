import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../../api";
import { InlineAlert } from "../../components/InlineAlert";
import { useTranslation } from "../../i18n";
import type { UserProfile } from "../../types";

interface ProfilePageProps {
  user: UserProfile;
  onUserChange: (updated: UserProfile) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "unknown error");
}

export function ProfilePage({ user, onUserChange }: ProfilePageProps) {
  const { t } = useTranslation();

  const [nameValue, setNameValue] = useState(() => user.name);
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [newUserLogin, setNewUserLogin] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [newUserSuccess, setNewUserSuccess] = useState<string | null>(null);

  useEffect(() => {
    setNameValue(user.name);
  }, [user.name]);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError(t("profile.validation.nameRequired"));
      return;
    }

    try {
      setNameSubmitting(true);
      const updated = await api.updateProfileName(trimmed);
      onUserChange(updated);
      setNameSuccess(t("profile.messages.nameUpdated"));
    } catch (error) {
      const message = getErrorMessage(error);
      setNameError(t("profile.errors.updateName", { message }));
    } finally {
      setNameSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError(t("profile.validation.passwordRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("profile.validation.passwordLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.validation.passwordMismatch"));
      return;
    }

    try {
      setPasswordSubmitting(true);
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(t("profile.messages.passwordUpdated"));
    } catch (error) {
      const message = getErrorMessage(error);
      setPasswordError(t("profile.errors.updatePassword", { message }));
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewUserError(null);
    setNewUserSuccess(null);

    const trimmedLogin = newUserLogin.trim();
    const trimmedName = newUserName.trim();

    if (!trimmedLogin) {
      setNewUserError(t("profile.validation.loginRequired"));
      return;
    }
    if (!trimmedName) {
      setNewUserError(t("profile.validation.nameRequired"));
      return;
    }
    if (newUserPassword.length < 6) {
      setNewUserError(t("profile.validation.passwordLength"));
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      setNewUserError(t("profile.validation.passwordMismatch"));
      return;
    }

    try {
      setNewUserSubmitting(true);
      await api.createUser({
        login: trimmedLogin,
        name: trimmedName,
        password: newUserPassword,
        isAdmin: newUserIsAdmin,
      });
      setNewUserLogin("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserConfirmPassword("");
      setNewUserIsAdmin(false);
      setNewUserSuccess(t("profile.messages.userCreated"));
    } catch (error) {
      const message = getErrorMessage(error);
      setNewUserError(t("profile.errors.createUser", { message }));
    } finally {
      setNewUserSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{t("profile.title")}</h1>
        <p className="text-sm text-gray-500">{t("profile.subtitle")}</p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("profile.info.heading")}</h2>
        <p className="text-sm text-gray-500">{t("profile.info.description")}</p>
        <form className="mt-4 space-y-4" onSubmit={handleNameSubmit}>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="profile-login">
              {t("profile.info.loginLabel")}
            </label>
            <input
              id="profile-login"
              className="w-full rounded-xl border px-3 py-2 bg-gray-100 text-gray-600"
              value={user.login}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="profile-name">
              {t("profile.info.nameLabel")}
            </label>
            <input
              id="profile-name"
              className="w-full rounded-xl border px-3 py-2"
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              disabled={nameSubmitting}
            />
          </div>
          {nameError && (
            <InlineAlert tone="error" message={nameError} />
          )}
          {nameSuccess && (
            <InlineAlert tone="success" message={nameSuccess} />
          )}
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={nameSubmitting}
          >
            {nameSubmitting ? "…" : t("profile.info.saveButton")}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t("profile.password.heading")}</h2>
        <p className="text-sm text-gray-500">{t("profile.password.description")}</p>
        <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="profile-current-password">
              {t("profile.password.currentLabel")}
            </label>
            <input
              id="profile-current-password"
              type="password"
              className="w-full rounded-xl border px-3 py-2"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={passwordSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="profile-new-password">
              {t("profile.password.newLabel")}
            </label>
            <input
              id="profile-new-password"
              type="password"
              className="w-full rounded-xl border px-3 py-2"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={passwordSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600" htmlFor="profile-confirm-password">
              {t("profile.password.confirmLabel")}
            </label>
            <input
              id="profile-confirm-password"
              type="password"
              className="w-full rounded-xl border px-3 py-2"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={passwordSubmitting}
            />
          </div>
          {passwordError && (
            <InlineAlert tone="error" message={passwordError} />
          )}
          {passwordSuccess && (
            <InlineAlert tone="success" message={passwordSuccess} />
          )}
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={passwordSubmitting}
          >
            {passwordSubmitting ? "…" : t("profile.password.saveButton")}
          </button>
        </form>
      </section>

      {user.isAdmin && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t("profile.admin.heading")}</h2>
          <p className="text-sm text-gray-500">{t("profile.admin.description")}</p>
          <form className="mt-4 space-y-4" onSubmit={handleCreateUser}>
            <div className="space-y-1">
              <label className="block text-sm text-gray-600" htmlFor="profile-new-user-login">
                {t("profile.admin.loginLabel")}
              </label>
              <input
                id="profile-new-user-login"
                className="w-full rounded-xl border px-3 py-2"
                value={newUserLogin}
                onChange={(event) => setNewUserLogin(event.target.value)}
                disabled={newUserSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-600" htmlFor="profile-new-user-name">
                {t("profile.admin.nameLabel")}
              </label>
              <input
                id="profile-new-user-name"
                className="w-full rounded-xl border px-3 py-2"
                value={newUserName}
                onChange={(event) => setNewUserName(event.target.value)}
                disabled={newUserSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-600" htmlFor="profile-new-user-password">
                {t("profile.admin.passwordLabel")}
              </label>
              <input
                id="profile-new-user-password"
                type="password"
                className="w-full rounded-xl border px-3 py-2"
                autoComplete="new-password"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                disabled={newUserSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-gray-600" htmlFor="profile-new-user-confirm-password">
                {t("profile.admin.confirmLabel")}
              </label>
              <input
                id="profile-new-user-confirm-password"
                type="password"
                className="w-full rounded-xl border px-3 py-2"
                autoComplete="new-password"
                value={newUserConfirmPassword}
                onChange={(event) => setNewUserConfirmPassword(event.target.value)}
                disabled={newUserSubmitting}
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={newUserIsAdmin}
                onChange={(event) => setNewUserIsAdmin(event.target.checked)}
                disabled={newUserSubmitting}
              />
              <span>{t("profile.admin.adminLabel")}</span>
            </label>
            {newUserError && (
              <InlineAlert tone="error" message={newUserError} />
            )}
            {newUserSuccess && (
              <InlineAlert tone="success" message={newUserSuccess} />
            )}
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={newUserSubmitting}
            >
              {newUserSubmitting ? "…" : t("profile.admin.saveButton")}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
