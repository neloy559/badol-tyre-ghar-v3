import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import api from '../../services/api';
import styles from './DashboardHome.module.css';

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ── Inline KPI Card ───────────────────────────────────────────
function KpiCard({ label, value }) {
  return (
    <div className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value?.toLocaleString?.() ?? value ?? '—'}</p>
    </div>
  );
}

// ── Skeleton Layout ───────────────────────────────────────────
function SkeletonDashboard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonKpiRow}>
        {[1,2,3,4].map(i => <div key={i} className={styles.skeletonKpi} />)}
      </div>
      <div className={styles.skeletonChartRow}>
        <div className={styles.skeletonChart} />
        <div className={styles.skeletonChart} />
      </div>
      <div className={styles.skeletonTable}>
        {[1,2,3,4,5].map(i => <div key={i} className={styles.skeletonRow} />)}
      </div>
      <div className={styles.skeletonFeed}>
        {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className={styles.skeletonFeedItem} />)}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function DashboardHome() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get('/admin/analytics/summary').then(r => r.data.data),
    staleTime: 60_000,
  });

  if (isLoading) return <SkeletonDashboard />;

  if (isError) {
    return (
      <div className={styles.errorState}>
        <p>Failed to load analytics data.</p>
        <button onClick={() => refetch()} className={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.dashboard}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className={styles.pageTitle}>Dashboard Overview</h2>

      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <KpiCard label="Total Products" value={data.kpi.totalProducts} />
        <KpiCard label="Total Dealers"  value={data.kpi.totalDealers} />
        <KpiCard label="Active Dealers" value={data.kpi.activeDealers} />
        <KpiCard label="Total Orders"   value={data.kpi.totalOrders} />
      </div>

      {/* Charts */}
      <div className={styles.chartRow}>
        {/* Products by Brand */}
        <div className={styles.chartBox}>
          <h3 className={styles.chartTitle}>Products by Brand</h3>
          {data.productsByBrand?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.productsByBrand} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="brand" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ed1c24" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.emptyMsg}>No product data available.</p>
          )}
        </div>

        {/* Dealer Registrations (30 days) */}
        <div className={styles.chartBox}>
          <h3 className={styles.chartTitle}>New Dealer Registrations (30 days)</h3>
          {data.dealerRegistrations?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dealerRegistrations} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={d => `Date: ${d}`} />
                <Line type="monotone" dataKey="count" stroke="#ed1c24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.emptyMsg}>No registration data available.</p>
          )}
        </div>
      </div>

      {/* Top Viewed Products Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Top Viewed Products</h3>
        {data.topViewedProducts?.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Views</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.topViewedProducts.map(p => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.meta?.views?.toLocaleString?.() ?? 0}</td>
                  <td>
                    <Link to={`/catalog/${p.slug}`} className={styles.viewLink} target="_blank">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyMsg}>No product views recorded yet.</p>
        )}
      </div>

      {/* Activity Feed */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Admin Activity</h3>
        {data.recentActivity?.length > 0 ? (
          <ul className={styles.activityFeed}>
            {data.recentActivity.map((entry, i) => (
              <li key={entry._id ?? i} className={styles.activityItem}>
                <span className={styles.activityAction}>{entry.action}</span>
                <span className={styles.activityMeta}>
                  {entry.adminId?.profile?.name ?? 'Admin'}
                  {' · '}
                  {timeAgo(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyMsg}>No recent admin activity.</p>
        )}
      </div>
    </motion.div>
  );
}
