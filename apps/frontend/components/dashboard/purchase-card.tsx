import Link from 'next/link';

interface PurchaseCardProps {
  id: string;
  productName: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export function PurchaseCard({
  id,
  productName,
  amount,
  currency,
  status,
  createdAt,
}: PurchaseCardProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border-b border-gray-200 px-4 py-4 sm:px-6 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-blue-600">
              {productName}
            </p>
            <dd className="text-sm font-semibold text-gray-900">
              {currency} {amount}
            </dd>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <dd className="flex items-center text-sm text-gray-500">
              <span className={`mr-2 rounded-full px-2 py-1 text-xs font-medium ${statusColors[status]}`}>
                {status}
              </span>
              <span className="sm:hidden">•</span>
              <span className="hidden sm:inline">•</span>
              <time className="ml-2" dateTime={createdAt}>
                {date}
              </time>
            </dd>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Link
          href={`/dashboard/purchases/${id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}
