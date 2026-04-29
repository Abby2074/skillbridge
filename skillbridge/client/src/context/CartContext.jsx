import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function getCartKey(userId) {
  return userId ? `sb_cart_${userId}` : 'sb_cart_guest';
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.user_id;

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(getCartKey(userId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // When user changes (login/logout), load that user's cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getCartKey(userId));
      setItems(saved ? JSON.parse(saved) : []);
    } catch { setItems([]); }
  }, [userId]);

  // Save cart whenever items change
  useEffect(() => {
    localStorage.setItem(getCartKey(userId), JSON.stringify(items));
  }, [items, userId]);

  const addItem = (item) => {
    setItems(prev => {
      const key = item.type === 'gig' ? `gig-${item.gig_id}` : `session-${item.listing_id}`;
      if (prev.find(i => (i.type === 'gig' ? `gig-${i.gig_id}` : `session-${i.listing_id}`) === key)) return prev;
      return [...prev, { ...item, cart_key: key, added_at: new Date().toISOString() }];
    });
  };

  const removeItem = (cartKey) => {
    setItems(prev => prev.filter(i => i.cart_key !== cartKey));
  };

  const updateItemPrice = (cartKey, price) => {
    setItems(prev => prev.map(i => i.cart_key === cartKey ? { ...i, agreed_price: price } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, i) => sum + Number(i.agreed_price || i.price || 0), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemPrice, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
