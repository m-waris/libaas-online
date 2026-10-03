'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'libaas-storefront-cart';

export type CartLine = {
  variant_id: string;
  quantity: number;
};

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  addItem: (variantId: string, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readInitialCart() {
  if (typeof window === 'undefined') {
    return [] as CartLine[];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [] as CartLine[];
    }

    const parsed = JSON.parse(rawValue) as CartLine[];

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item.variant_id === 'string' && Number.isFinite(item.quantity))
      : [];
  } catch {
    return [] as CartLine[];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => readInitialCart());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (variantId: string, quantity = 1) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.variant_id === variantId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.variant_id === variantId ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [...currentItems, { variant_id: variantId, quantity }];
    });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    setItems((currentItems) => {
      if (quantity <= 0) {
        return currentItems.filter((item) => item.variant_id !== variantId);
      }

      return currentItems.map((item) =>
        item.variant_id === variantId ? { ...item, quantity } : item,
      );
    });
  };

  const removeItem = (variantId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.variant_id !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
