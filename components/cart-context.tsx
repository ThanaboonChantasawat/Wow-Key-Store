"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { db } from "./firebase-config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface CartItem {
  userId: string;
  itemId: string;
  itemType: 'game' | 'product';
  quantity: number;
  addedAt: Date;
}

interface CartContextType {
  cartItems: CartItem[];
  itemCount: number;
  loading: boolean;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  itemCount: 0,
  loading: true,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "cart"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          addedAt: data.addedAt?.toDate ? data.addedAt.toDate() : new Date(),
        };
      }) as CartItem[];
      
      setCartItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cart:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, itemCount, loading }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
