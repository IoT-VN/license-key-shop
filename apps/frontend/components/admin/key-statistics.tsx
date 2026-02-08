'use client';

interface KeyStatistics {
  total: number;
  available: number;
  sold: number;
  active: number;
  revoked: number;
  expired: number;
}

interface KeyStatisticsProps {
  stats: KeyStatistics;
  loading?: boolean;
}

export function KeyStatistics({ stats, loading }: KeyStatisticsProps) {
  const statCards = [
    { label: 'Total Keys', value: stats.total, color: 'bg-gray-100' },
    { label: 'Available', value: stats.available, color: 'bg-green-100' },
    { label: 'Sold', value: stats.sold, color: 'bg-blue-100' },
    { label: 'Active', value: stats.active, color: 'bg-purple-100' },
    { label: 'Revoked', value: stats.revoked, color: 'bg-red-100' },
    { label: 'Expired', value: stats.expired, color: 'bg-yellow-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
          <div className="text-sm text-gray-600">{stat.label}</div>
          <div className="text-2xl font-semibold">
            {loading ? '-' : stat.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
