import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  Users, Package, Tag, MessageSquare, BarChart2, Download,
  TrendingUp, FileSpreadsheet, Layers, Bookmark, Image as ImageIcon, Search, FileText,
  ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

// Modular Sub-pages
import DashboardHome      from './admin/DashboardHome';
import CatalogManager     from './admin/CatalogManager';
import ProductsManager    from './admin/ProductsManager';
import TagsManager        from './admin/TagsManager';
import DealerQueue        from './admin/DealerQueue';
import InquiryCRM         from './admin/InquiryCRM';
import CampaignManager    from './admin/CampaignManager';
import BulkMarkup         from './admin/BulkMarkup';
import DataExport         from './admin/DataExport';
import AssetAuditor       from './admin/AssetAuditor';
import BrandManager       from './admin/BrandManager';
import BrandingManager    from './admin/BrandingManager';
import SearchIntelligence from './admin/SearchIntelligence';
import PdfManager         from './admin/PdfManager';
import AdminRegistrations from './admin/AdminRegistrations';
import api from '../services/api';

import './Admin.css';

function usePendingCount() {
  const { data } = useQuery({
    queryKey: ['registrations-pending-count'],
    queryFn: () =>
      api.get('/admin/dealers/registrations', { params: { status: 'pending', limit: 1 } })
         .then(r => r.data.data?.total ?? 0),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}

export default function Admin() {
  const pendingCount = usePendingCount();

  const ADMIN_LINKS = [
    { to: '/admin',              icon: BarChart2,       label: 'Overview' },
    { to: '/admin/catalog',      icon: FileSpreadsheet, label: 'Catalog' },
    { to: '/admin/products',     icon: Layers,          label: 'Products' },
    { to: '/admin/tags',         icon: Tag,             label: 'Search Tags' },
    { to: '/admin/search-intel', icon: Search,          label: 'Search Intel' },
    { to: '/admin/pdf',          icon: FileText,        label: 'PDF Catalogs' },
    { to: '/admin/brands',       icon: Bookmark,        label: 'Brands' },
    { to: '/admin/auditor',      icon: Package,         label: 'Asset Audit' },
    { to: '/admin/dealers',      icon: Users,           label: 'Dealers' },
    { to: '/admin/registrations', icon: ClipboardList,  label: 'Registrations', badge: pendingCount },
    { to: '/admin/inquiries',    icon: MessageSquare,   label: 'Inquiries' },
    { to: '/admin/campaigns',    icon: Tag,             label: 'Campaigns' },
    { to: '/admin/markup',       icon: TrendingUp,      label: 'Bulk Markup' },
    { to: '/admin/branding',     icon: ImageIcon,       label: 'Branding' },
    { to: '/admin/export',       icon: Download,        label: 'Export' },
  ];

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <p className="admin-sidebar-title">Admin Dashboard</p>
          <span className="admin-sidebar-v">v3.0-modular</span>
        </div>
        
        <nav className="admin-nav">
          {ADMIN_LINKS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} /> <span>{label}</span>
              {badge > 0 && <span className="admin-nav-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="admin-content">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            <Route index              element={<DashboardHome />} />
            <Route path="catalog"     element={<CatalogManager />} />
            <Route path="products"    element={<ProductsManager />} />
            <Route path="tags"        element={<TagsManager />} />
            <Route path="search-intel" element={<SearchIntelligence />} />
            <Route path="pdf"         element={<PdfManager />} />
            <Route path="brands"      element={<BrandManager />} />
            <Route path="auditor"     element={<AssetAuditor />} />
            <Route path="dealers"     element={<DealerQueue />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="inquiries"   element={<InquiryCRM />} />
            <Route path="campaigns"   element={<CampaignManager />} />
            <Route path="markup"      element={<BulkMarkup />} />
            <Route path="branding"    element={<BrandingManager />} />
            <Route path="export"      element={<DataExport />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}
