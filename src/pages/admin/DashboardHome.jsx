import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, Clock } from 'lucide-react';
import api from '../../services/api';

const DashboardHome = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get('/admin/analytics/summary')).data.data,
  });

  if (isLoading) return <div className="admin-loading">Loading Analytics...</div>;
  if (isError)   return <div className="admin-loading">Failed to load analytics.</div>;

  const stats = [
    { label: 'Today',      value: data?.hits?.daily   ?? '—', sub: 'API Hits', icon: Clock },
    { label: 'This Week',  value: data?.hits?.weekly  ?? '—', sub: 'API Hits', icon: TrendingUp },
    { label: 'This Month', value: data?.hits?.monthly ?? '—', sub: 'API Hits', icon: BarChart2 },
  ];

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Overview</h2>
      <div className="stat-grid">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon"><Icon size={20} /></div>
            <div className="stat-card-info">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value?.toLocaleString?.() ?? value}</p>
              <p className="stat-sub">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {data?.topPaths?.length > 0 && (
        <div className="admin-table-wrap">
          <h3 className="admin-sub-title">Top Paths (Last 7 Days)</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Endpoint Path</th>
                <th>Total Hits</th>
              </tr>
            </thead>
            <tbody>
              {data.topPaths.map((p) => (
                <tr key={p._id}>
                  <td><code>{p._id}</code></td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
