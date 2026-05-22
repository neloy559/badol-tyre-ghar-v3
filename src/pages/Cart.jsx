import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, MessageCircle, CheckCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import './Cart.css';

/**
 * Cart page — reads from CartContext (localStorage-backed).
 * BUG-008 fix: was reading from server API (/cart) which is a separate system
 * from CartContext. Items added via Product page (CartContext) never appeared here.
 * Now unified: CartContext is the single source of truth for the quote list.
 */
export default function Cart() {
  const { user } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buildWhatsAppMsg = () => {
    if (!items.length) return '#';
    const lines = [
      `*Badol Tyre Ghar — Quote Request*`,
      user ? `Customer: ${user.profile?.name || user.phone}` : 'Guest Inquiry',
      ``,
      ...items.map((item, i) => {
        const p = item.product;
        const v = item.variant;
        // No prices — customer asks, owner replies manually
        return `${i + 1}. ${p?.name || '—'} | Size: ${p?.commonSpecs?.size || '—'} | Ply: ${v?.ply || '—'} | Qty: ${item.quantity}`;
      }),
      ``,
      `দয়া করে এই পণ্যগুলোর দাম ও প্রাপ্যতা জানাবেন। ধন্যবাদ।`,
    ].join('\n');
    return `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
  };

  const handleSubmitInquiry = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await api.post('/cart/submit', {
        items: items.map(item => ({
          productId: item.product._id,
          variantSku: item.variant?.sku,
          quantity: item.quantity,
        }))
      });
      clearCart();
      setConfirmModal(false);
    } catch (err) {
      console.error('Submit inquiry error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Guest state
  if (!user) {
    return (
      <div className="cart-root">
        <h1 className="cart-title">Quote List</h1>
        <div className="cart-empty">
          <MessageCircle size={48} color="var(--color-text-muted)" />
          <p>Login to save and send your quote list.</p>
          <Link to="/login" className="cart-browse-btn">Login / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-root">
      <h1 className="cart-title">Quote List</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <ShoppingBag size={48} color="var(--color-text-muted)" />
          <p>Your quote list is empty.</p>
          <Link to="/catalog" className="cart-browse-btn">Browse Catalog</Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => {
              // BUG-009 fix: null guard — skip if product reference is missing
              const p = item.product;
              const v = item.variant;
              if (!p) return null;

              const price = v?.pricing?.retail || v?.pricing?.wholesale || v?.price;

              return (
                <div key={`${p._id}-${v?.sku}`} className="cart-item">
                  {p.media?.[0] && (
                    <img src={p.media[0]} alt={p.name} className="cart-item-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="cart-item-info">
                    <p className="cart-item-name">{p.name}</p>
                    <p className="cart-item-meta">
                      {p.commonSpecs?.size}
                      {v?.ply && ` · ${v.ply}`}
                      {v?.designModel && ` · ${v.designModel}`}
                    </p>
                    <div className="cart-item-qty-row">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(p._id, v?.sku, -1)}
                      >−</button>
                      <span className="cart-item-qty">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(p._id, v?.sku, 1)}
                      >+</button>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <button
                      className="cart-item-remove"
                      onClick={() => removeFromCart(p._id, v?.sku)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No price total shown — customer asks, owner replies manually */}

          <div className="cart-actions">
            <a
              href={buildWhatsAppMsg()}
              target="_blank"
              rel="noreferrer"
              className="cart-whatsapp-btn"
              onClick={() => { if (user) setTimeout(() => setConfirmModal(true), 1500); }}
            >
              <MessageCircle size={20} />
              Send Inquiry via WhatsApp
            </a>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="confirm-overlay" onClick={() => setConfirmModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <CheckCircle size={40} color="var(--color-success)" />
            <h2>Did you send the inquiry?</h2>
            <p>Confirm so we can track your request and respond faster.</p>
            <div className="confirm-actions">
              <button
                className="btn-yes"
                onClick={handleSubmitInquiry}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, I sent it'}
              </button>
              <button className="btn-no" onClick={() => setConfirmModal(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
