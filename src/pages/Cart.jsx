import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, MessageCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Cart.css';

export default function Cart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(false);

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  async () => (await api.get('/cart')).data.data,
    enabled: !!user, // only fetch if logged in
  });

  const remove = useMutation({
    mutationFn: (payload) => api.delete('/cart/remove', { data: payload }),
    onSuccess:  () => queryClient.invalidateQueries(['cart']),
  });

  const submit = useMutation({
    mutationFn: () => api.post('/cart/submit'),
    onSuccess:  () => { queryClient.invalidateQueries(['cart']); setConfirmModal(false); },
  });

  const buildWhatsAppMsg = () => {
    if (!cart?.items?.length) return '#';
    const lines = [
      `*Quote Request — Badol Tyre Ghar*`,
      `Name: ${user?.profile?.name || user?.phone}`,
      ``,
      ...cart.items.map((item, i) => {
        const p = item.productId;
        const v = p?.variants?.find((v) => v.sku === item.variantSku) || p?.variants?.[0];
        return `${i + 1}. ${p?.name || '—'} | Size: ${p?.commonSpecs?.size || '—'} | Ply: ${v?.ply || '—'} | Qty: ${item.quantity}`;
      }),
      ``,
      `Please confirm availability and pricing. Thank you.`,
    ].join('\n');
    return `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
  };

  if (isLoading) return <div className="cart-skeleton" />;

  // Guest state — not logged in
  if (!user) {
    return (
      <div className="cart-root">
        <h1 className="cart-title">Quote List</h1>
        <div className="cart-empty">
          <MessageCircle size={48} color="var(--color-text-muted)" />
          <p>Login to save and send your quote list.</p>
          <a href="/login" className="cart-browse-btn">Login / Register</a>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div className="cart-root">
      <h1 className="cart-title">Quote List</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <MessageCircle size={48} color="var(--color-text-muted)" />
          <p>Your quote list is empty.</p>
          <a href="/catalog" className="cart-browse-btn">Browse Catalog</a>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => {
              const p = item.productId;
              const v = p?.variants?.find((v) => v.sku === item.variantSku) || p?.variants?.[0];
              return (
                <div key={`${item.productId?._id}-${item.variantSku}`} className="cart-item">
                  {p?.media?.[0] && <img src={p.media[0]} alt={p.name} className="cart-item-img" />}
                  <div className="cart-item-info">
                    <p className="cart-item-name">{p?.name || 'Unknown Product'}</p>
                    <p className="cart-item-meta">
                      {p?.commonSpecs?.size}
                      {v?.ply && ` · ${v.ply}`}
                      {v?.designModel && ` · ${v.designModel}`}
                    </p>
                    <p className="cart-item-qty">Qty: {item.quantity}</p>
                  </div>
                  <div className="cart-item-right">
                    {v?.price && <p className="cart-item-price">৳ {v.price.toLocaleString()}</p>}
                    <button
                      className="cart-item-remove"
                      onClick={() => remove.mutate({ productId: p._id, variantSku: item.variantSku })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-actions">
            <a
              href={buildWhatsAppMsg()}
              target="_blank"
              rel="noreferrer"
              className="cart-whatsapp-btn"
              onClick={() => setTimeout(() => setConfirmModal(true), 1500)}
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
            <p>Confirm so we can prepare your quote faster.</p>
            <div className="confirm-actions">
              <button className="btn-yes" onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? 'Submitting...' : 'Yes, I sent it'}
              </button>
              <button className="btn-no" onClick={() => setConfirmModal(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
