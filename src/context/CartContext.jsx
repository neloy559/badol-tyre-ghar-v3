import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('btg_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('btg_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product, variant, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product._id === product._id && item.variant.sku === variant.sku
      );

      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id && item.variant.sku === variant.sku
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { product, variant, quantity }];
    });
  };

  const removeFromCart = (productId, variantSku) => {
    setItems((prev) => 
      prev.filter((item) => !(item.product._id === productId && item.variant.sku === variantSku))
    );
  };

  const updateQuantity = (productId, variantSku, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product._id === productId && item.variant.sku === variantSku
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = items.reduce((acc, item) => acc + (item.variant.price * item.quantity), 0);

  const value = {
    items,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
