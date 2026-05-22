import { MapPin, Phone, User, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import SEO from '../components/SEO';
import './Shops.css';

const BRANCHES = [
  {
    id: 1,
    name: 'Main Branch (Shapla Chattar)',
    manager: 'Md. Badol Mia',
    phone: '01647-794452',
    address: 'Shapla Chattar, Station Road, Rangpur',
    district: 'Rangpur',
    map: 'https://maps.app.goo.gl/KmoKqGPqqMJZsao67',
    isMain: true
  },
  {
    id: 2,
    name: 'Station Road Outlet',
    manager: 'Store Manager',
    phone: '01647-794452',
    address: 'Station Road, Near Railway Station, Rangpur',
    district: 'Rangpur',
    map: 'https://maps.app.goo.gl/KmoKqGPqqMJZsao67',
    isMain: false
  },
  {
    id: 3,
    name: 'Thikadarpara Branch',
    manager: 'Store Manager',
    phone: '01647-794452',
    address: 'Thikadarpara Mor, Rangpur',
    district: 'Rangpur',
    map: 'https://maps.app.goo.gl/KmoKqGPqqMJZsao67',
    isMain: false
  }
];

export default function Shops() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView('Our Branches');
  }, []);

  return (
    <div className="shops-root">
      <SEO 
        title="Our Branches" 
        description="Visit Badol Tyre Ghar at Shapla Chattar, Station Road, and Thikadarpara Mor in Rangpur. Bangladesh's trusted tyre wholesale shop."
        url="/shops"
      />
      <div className="shops-header">
        <h1 className="shops-title">Our Branches</h1>
        <p className="shops-sub">Nationwide distribution network ensuring timely delivery.</p>
      </div>

      <div className="shops-grid">
        {BRANCHES.map((b) => (
          <div key={b.id} className={`shop-card ${b.isMain ? 'main-shop' : ''}`}>
            {b.isMain && <span className="main-badge">HQ</span>}
            <h3 className="shop-name">{b.name}</h3>
            
            <div className="shop-detail">
              <User size={14} className="shop-icon" />
              <span>{b.manager} (Manager)</span>
            </div>

            <div className="shop-detail">
              <Phone size={14} className="shop-icon" />
              <a href={`tel:${b.phone}`} className="shop-link">{b.phone}</a>
            </div>

            <div className="shop-detail">
              <MapPin size={14} className="shop-icon" />
              <span>{b.address}</span>
            </div>

            <div className="shop-actions">
              <a href={b.map} target="_blank" rel="noreferrer" className="btn-map">
                <ExternalLink size={14} /> View on Map
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="shops-cta">
        <p>Interested in becoming a local dealer?</p>
        <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`} className="btn-wa-shops">
          Inquire via WhatsApp
        </a>
      </div>
    </div>
  );
}
