import { ClientResponseError, type AuthModel } from "pocketbase";
import { getPocketBaseClient, isPocketBaseEnabled } from "./pocketbaseClient";

export interface AuthSession {
  isEnabled: boolean;
  isAuthenticated: boolean;
  user: AuthModel | null;
  token: string;
  email?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  passwordConfirm: string;
}

export function getAuthSession(): AuthSession {
  if (!isPocketBaseEnabled()) {
    return {
      isEnabled: false,
      isAuthenticated: false,
      user: null,
      token: "",
    };
  }

  const pb = getPocketBaseClient();
  return {
    isEnabled: true,
    isAuthenticated: pb.authStore.isValid,
    user: pb.authStore.model,
    token: pb.authStore.token,
    email: getUserEmail(pb.authStore.model),
  };
}

export async function loginWithPassword(credentials: LoginCredentials): Promise<AuthSession> {
  if (!isPocketBaseEnabled()) {
    throw new Error("PocketBase auth is scaffolded but disabled.");
  }

  const pb = getPocketBaseClient();
  try {
    await pb.collection("users").authWithPassword(credentials.email, credentials.password);
  } catch (error) {
    throw new Error(describeAuthError(error, "Couldn't sign you in. Check your email and password."));
  }
  return getAuthSession();
}

// Creates a new account in the built-in `users` collection, then signs it in so
// the caller lands authenticated (and field sync switches to PocketBase).
export async function registerWithPassword(credentials: RegisterCredentials): Promise<AuthSession> {
  if (!isPocketBaseEnabled()) {
    throw new Error("PocketBase auth is scaffolded but disabled.");
  }

  const pb = getPocketBaseClient();
  try {
    await pb.collection("users").create({
      email: credentials.email,
      password: credentials.password,
      passwordConfirm: credentials.passwordConfirm,
    });
    await pb.collection("users").authWithPassword(credentials.email, credentials.password);
  } catch (error) {
    throw new Error(describeAuthError(error, "Couldn't create your account. Please try again."));
  }
  return getAuthSession();
}

export function logout(): void {
  if (!isPocketBaseEnabled()) return;
  getPocketBaseClient().authStore.clear();
}

export function onAuthChange(callback: (session: AuthSession) => void): () => void {
  if (!isPocketBaseEnabled()) {
    return () => undefined;
  }

  const unsubscribe = getPocketBaseClient().authStore.onChange(() => {
    callback(getAuthSession());
  }, true);

  return unsubscribe;
}

// PocketBase surfaces failures as ClientResponseError, but its top-level
// `.message` is generic ("Something went wrong...") and the useful detail lives
// in `.status` (0 = couldn't reach the server) and `.response.data` (per-field
// validation messages). Flatten that into one line the form can show.
function describeAuthError(error: unknown, fallback: string): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 0) {
      return "Can't reach the account server. Make sure PocketBase is running and try again.";
    }

    const fieldErrors = error.response?.data as Record<string, { message?: string }> | undefined;
    const messages = fieldErrors
      ? Object.values(fieldErrors)
          .map((detail) => detail?.message)
          .filter((message): message is string => Boolean(message))
      : [];

    if (messages.length > 0) {
      return messages.join(" ");
    }

    if (error.response?.message) {
      return error.response.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getUserEmail(user: AuthModel | null): string | undefined {
  if (!user || typeof user !== "object") {
    return undefined;
  }

  const maybeEmail = (user as Record<string, unknown>).email;
  return typeof maybeEmail === "string" ? maybeEmail : undefined;
}
