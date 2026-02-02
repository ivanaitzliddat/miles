/**
 * A registered user (identified by their Telegram ID).
 */
export interface User {
  id: number;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  createdAt: string;
}

/**
 * A card that a user has added to their collection.
 */
export interface UserCard {
  id: number;
  userId: number;
  cardId: number;
  nickname: string | null;
  addedAt: string;
}
