/**
 * Telegram Web App SDK hook.
 *
 * In Telegram: window.Telegram.WebApp is injected by the client.
 * In browser dev: we use a mock so the app works with npm run dev.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

const DEV_USER: TelegramUser = {
  id: 123456789,        // matches the seed user created during testing
  firstName: "Ivan",
  username: "ivanaitzliddat",
};

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  // Signal to Telegram that the app is ready (removes loading screen)
  if (tg) {
    tg.ready();
    tg.expand(); // expand to full height
  }

  // Extract user from initData (real Telegram) or fall back to dev mock
  const raw = tg?.initDataUnsafe?.user;
  const user: TelegramUser = raw
    ? { id: raw.id, firstName: raw.first_name, lastName: raw.last_name, username: raw.username }
    : DEV_USER;

  return { user, isInsideTelegram: !!raw };
}
