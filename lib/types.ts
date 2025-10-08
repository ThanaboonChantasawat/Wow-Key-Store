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