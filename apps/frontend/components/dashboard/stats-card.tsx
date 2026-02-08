interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon, trend }: StatsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6">
      <dt className="truncate text-sm font-medium text-gray-500">
        <div className="flex items-center">
          {icon && <span className="mr-2 text-xl">{icon}</span>}
          {title}
        </div>
      </dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </dd>
      {trend && (
        <dd
          className={`mt-2 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend.value}
        </dd>
      )}
    </div>
  );
}
