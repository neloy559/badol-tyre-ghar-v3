import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Clock, User } from 'lucide-react';
import './Profile.css';

const ROLE_LABEL = {
  admin:        { text: 'Admin',          color: 'var(--color-warning)' },
  editor:       { text: 'Editor',         color: 'var(--color-info)' },
  sales_partner:{ text: 'Sales Partner',  color: 'var(--color-success)' },
  dealer:       { text: 'Dealer',         color: 'var(--color-info)' },
  customer:     { text: 'Customer',       color: 'var(--color-text-muted)' },
};

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/'); };

  const roleInfo = ROLE_LABEL[user?.role] || ROLE_LABEL.customer;

  // BUG-011 fix: isB2B was always undefined — AuthContext never exposes it.
  // Derive it directly from user.role.
  const isB2B = user?.role === 'dealer' || user?.role === 'sales_partner';

  return (
    <div className="profile-root">
      <div className="profile-card">

        {/* Avatar */}
        <div className="profile-avatar">
          <User size={36} color="var(--color-text-muted)" />
        </div>

        <div className="profile-info">
          <h1 className="profile-name">{user?.profile?.name || 'BTG User'}</h1>
          {user?.profile?.shopName && <p className="profile-shop">{user.profile.shopName}</p>}
          <p className="profile-phone">{user?.phone}</p>

          <div className="profile-badges">
            <span className="role-badge" style={{ color: roleInfo.color }}>{roleInfo.text}</span>
            {user?.isVerified
              ? <span className="verified-badge"><ShieldCheck size={12} /> Verified</span>
              : user?.role !== 'customer' && <span className="pending-badge"><Clock size={12} /> Pending Verification</span>
            }
          </div>
        </div>

        {/* B2B Credit Info */}
        {isB2B && (
          <div className="profile-credit">
            <div className="credit-row">
              <span>Credit Limit</span>
              <strong>৳ {user?.creditLimit?.toLocaleString() || 0}</strong>
            </div>
            <div className="credit-row">
              <span>Payment Terms</span>
              <strong>{user?.paymentTerms || 'Cash'}</strong>
            </div>
            <div className="credit-row">
              <span>Discount Tier</span>
              <strong>{user?.discountMultiplier < 1 ? `${((1 - user.discountMultiplier) * 100).toFixed(0)}% extra off` : 'Standard'}</strong>
            </div>
          </div>
        )}

        {/* Verification Request (for unverified dealers) */}
        {!user?.isVerified && user?.role !== 'customer' && !user?.verificationDetails?.appliedAt && (
          <div className="profile-verify-prompt">
            <p>Submit your Trade License to unlock B2B wholesale pricing.</p>
            <button className="btn-apply-verify">Apply for Verification</button>
          </div>
        )}

        {/* Admin Link */}
        {isAdmin && (
          <a href="/admin" className="profile-admin-link">
            Go to Admin Dashboard →
          </a>
        )}

        <button className="profile-logout" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}
