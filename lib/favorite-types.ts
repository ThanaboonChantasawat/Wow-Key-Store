// Favorite type definition
export interface Favorite {
  id: string;
  userId: string;
  itemId: string; // Can be gameId or productId
  itemType: 'game' | 'product'; // Type of item
  gameId?: string; // Keep for backward compatibility
  createdAt: Date;
}
