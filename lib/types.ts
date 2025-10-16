// Types for Firestore collections

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface GameImage {
  url: string;
  isCover: boolean;
}

export interface GameImageContainer {
  images: GameImage[];
}

export interface Game {
  id: string;
  name: string;
  gameId: string;
  gameImages: GameImageContainer[]
  description: string;
  price: number;
  categoryIds: string[];
}

// Helper type for Game with populated categories
export interface GameWithCategories extends Game {
  categories?: Category[];
}

// Order related types
export interface GameAccountInfo {
  email?: string;              // Email ที่ใช้เข้าเกม
  username?: string;           // Username ที่ใช้เข้าเกม
  password?: string;           // Password
  additionalInfo?: string;     // ข้อมูลเพิ่มเติม เช่น Level, Skins, Characters
}