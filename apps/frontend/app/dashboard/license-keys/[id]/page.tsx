'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LicenseKey {
  id: string;
  keyString: string;
  product: {
    id: string;
    name: string;
    description: string;
  };
  status: 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  activations: number;
  maxActivations: number;
  expiresAt: string | null;
  createdAt: string;
  validationLogs?: Array<{
    id: string;
    isValid: boolean;
    ipAddress: string;
    createdAt: string;
  }>;
}

const statusColors = {
  AVAILABLE: 'bg-blue-100 text-blue-800',
  SOLD: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

export default function LicenseKeyDetailsPage() {
  const params = useParams();
  const [licenseKey, setLicenseKey] = useState<LicenseKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchLicenseKey() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/users/license-keys/${params.id}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch license key');
        }

        const data = await response.json();
        setLicenseKey(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLicenseKey();
  }, [params.id]);

  const handleCopy = async () => {
    if (licenseKey) {
      await navigator.clipboard.writeText(licenseKey.keyString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (format: 'json' | 'txt') => {
    if (!licenseKey) return;

    const content =
      format === 'json'
        ? JSON.stringify(licenseKey, null, 2)
        : `License Key: ${licenseKey.keyString}\nProduct: ${licenseKey.product.name}\nStatus: ${licenseKey.status}`;

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-key-${licenseKey.id}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-600">Loading license key details...</p>
        </div>
      </div>
    );
  }

  if (error || !licenseKey) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'License key not found'}</p>
        </div>
        <Link
          href="/dashboard/license-keys"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← Back to license keys
        </Link>
      </div>
    );
  }

  const formatKey = (key: string) => {
    return key.match(/.{1,4}/g)?.join('-') || key;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const expiryDate = licenseKey.expiresAt
    ? formatDate(licenseKey.expiresAt)
    : 'Lifetime';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/license-keys"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to license keys
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            License Key Details
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[licenseKey.status]}`}
        >
          {licenseKey.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Key display */}
        <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">License Key</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <dt className="mb-2 text-sm font-medium text-gray-500">Key</dt>
              <div className="flex items-center gap-2">
                <dd className="flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2">
                  <code className="text-lg font-mono text-gray-900">
                    {formatKey(licenseKey.keyString)}
                  </code>
                </dd>
                <button
                  onClick={handleCopy}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload('txt')}
                className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download TXT
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Product</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {licenseKey.product.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {licenseKey.product.description}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Activation info */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Activation</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Activations</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {licenseKey.activations} / {licenseKey.maxActivations}
                </dd>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600"
                    style={{
                      width: `${(licenseKey.activations / licenseKey.maxActivations) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Expires</dt>
                <dd className="mt-1 text-sm text-gray-900">{expiryDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(licenseKey.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Validation logs */}
        {licenseKey.validationLogs && licenseKey.validationLogs.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">
                Validation History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {licenseKey.validationLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {log.ipAddress || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {log.isValid ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold text-green-800">
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold text-red-800">
                            Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
