import { StatsCard } from '@/components/dashboard/stats-card';
import { PurchaseCard } from '@/components/dashboard/purchase-card';
import Link from 'next/link';

async function getDashboardData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Fetch stats and recent purchases
    const [statsResponse, purchasesResponse] = await Promise.all([
      fetch(`${apiUrl}/users/stats`, {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${apiUrl}/users/purchases?limit=5`, {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    ]);

    if (!statsResponse.ok || !purchasesResponse.ok) {
      return { stats: null, purchases: [], error: 'Failed to fetch dashboard data' };
    }

    const stats = await statsResponse.json();
    const purchases = await purchasesResponse.json();

    return { stats, purchases: purchases.data || purchases, error: null };
  } catch (error) {
    console.error('Dashboard error:', error);
    return { stats: null, purchases: [], error: 'Failed to connect to server' };
  }
}

export default async function DashboardPage() {
  const { stats, purchases, error } = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here is an overview of your account.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <p className="mt-2 text-sm text-red-600">
            Make sure the backend server is running on {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
          </p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Purchases"
              value={stats?.totalPurchases || 0}
              icon="🛒"
            />
            <StatsCard
              title="Active Keys"
              value={stats?.activeKeys || 0}
              icon="🔑"
            />
            <StatsCard
              title="Total Spent"
              value={`$${stats?.totalSpent || '0.00'}`}
              icon="💳"
            />
            <StatsCard
              title="Available Licenses"
              value={stats?.availableLicenses || 0}
              icon="✨"
            />
          </div>

          {/* Quick actions */}
          <div className="flex gap-4">
            <Link
              href="/checkout"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Buy New License
            </Link>
            <Link
              href="/dashboard/license-keys"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Keys
            </Link>
          </div>

          {/* Recent purchases */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Recent Purchases</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {purchases && purchases.length > 0 ? (
                purchases.map((purchase: any) => (
                  <PurchaseCard
                    key={purchase.id}
                    id={purchase.id}
                    productName={purchase.product?.name || 'Unknown Product'}
                    amount={purchase.amount}
                    currency={purchase.currency}
                    status={purchase.status}
                    createdAt={purchase.createdAt}
                  />
                ))
              ) : (
                <li className="px-4 py-8 text-center text-sm text-gray-500">
                  No purchases yet.{' '}
                  <Link href="/checkout" className="font-medium text-blue-600 hover:text-blue-500">
                    Buy your first license
                  </Link>
                </li>
              )}
            </ul>
            {purchases && purchases.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                <Link
                  href="/dashboard/purchases"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all purchases →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
