import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, MessageCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getCloudinaryUrl, CLOUDINARY_PRESETS } from '../../utils/cloudinary';
import './FloatingCart.css';

const FloatingCart = ({ isOpen, onClose }) => {
  const { items, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cartVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit:    { x: '100%' }
  };

  const handleWhatsAppInquiry = async () => {
    const adminNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '8801647794452';

    // No prices in message — customer asks, you reply manually
    const lines = [
      `*Badol Tyre Ghar — Quote Request*`,
      `Customer: ${user?.profile?.name || 'Guest'}${user?.phone ? ` (${user.phone})` : ''}`,
      ``,
      `*Items:*`,
      ...items.map((item, i) =>
        `${i + 1}. ${item.product.name} | Size: ${item.product.commonSpecs?.size || '—'} | Ply: ${item.variant?.ply || '—'} | Qty: ${item.quantity}`
      ),
      ``,
      `দয়া করে এই পণ্যগুলোর দাম ও প্রাপ্যতা জানাবেন। ধন্যবাদ।`,
    ].join('\n');

    try {
      await api.post('/cart', {
        items: items.map(i => ({
          product:  i.product._id,
          variant: { sku: i.variant?.sku, ply: i.variant?.ply, designModel: i.variant?.designModel },
          quantity: i.quantity,
        })),
        totalAmount: 0,
      });
    } catch { /* guest or error — still open WhatsApp */ }

    window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(lines)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="btg-cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside 
            className="btg-floating-cart"
            initial={cartVariants.initial}
            animate={cartVariants.animate}
            exit={cartVariants.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="btg-cart-header">
              <div className="btg-cart-title">
                <ShoppingBag size={20} />
                <span>Your RFQ Basket</span>
                <span className="btg-cart-count">{items.length}</span>
              </div>
              <button className="btg-cart-close" onClick={onClose}><X size={24} /></button>
            </div>

            <div className="btg-cart-body">
              {items.length === 0 ? (
                <div className="btg-cart-empty">
                  <div className="empty-icon"><ShoppingBag size={48} /></div>
                  <p>Your basket is empty</p>
                  <button onClick={onClose}>Explore Catalog</button>
                </div>
              ) : (
                <div className="btg-cart-items">
                  {items.map((item) => (
                    <div key={`${item.product._id}-${item.variant.sku}`} className="btg-cart-item">
                      <div className="item-image">
                        <img 
                          src={getCloudinaryUrl(item.product.media?.[0], CLOUDINARY_PRESETS.THUMB)} 
                          alt={item.product.name} 
                        />
                      </div>
                      <div className="item-info">
                        <p className="item-name">{item.product.name}</p>
                        <p className="item-variant">{item.variant.ply || ''} · {item.variant.designModel || ''}</p>
                        <div className="item-controls">
                          <div className="qty-wrap">
                            <button onClick={() => updateQuantity(item.product._id, item.variant.sku, -1)}><Minus size={14} /></button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product._id, item.variant.sku, 1)}><Plus size={14} /></button>
                          </div>
                          <span className="item-price">৳{(item.variant.price * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                      <button 
                        className="item-remove" 
                        onClick={() => removeFromCart(item.product._id, item.variant.sku)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="btg-cart-footer">
                <div className="cart-summary">
                  <span>Estimated Total</span>
                  <strong>৳{cartTotal.toLocaleString()}</strong>
                </div>
                <div className="cart-actions">
                  <button className="btn-clear" onClick={clearCart}>Clear All</button>
                  <button className="btn-whatsapp" onClick={handleWhatsAppInquiry}>
                    <MessageCircle size={20} />
                    <span>Send Inquiry to WhatsApp</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default FloatingCart;
