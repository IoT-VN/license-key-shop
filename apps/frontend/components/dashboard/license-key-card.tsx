'use client';

import { useState } from 'react';

interface LicenseKeyCardProps {
  id: string;
  keyString: string;
  productName: string;
  status: 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  activations: number;
  maxActivations: number;
  expiresAt?: string;
}

const statusColors = {
  AVAILABLE: 'bg-blue-100 text-blue-800',
  SOLD: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

export function LicenseKeyCard({
  id,
  keyString,
  productName,
  status,
  activations,
  maxActivations,
  expiresAt,
}: LicenseKeyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatKey = (key: string) => {
    return key.match(/.{1,4}/g)?.join('-') || key;
  };

  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Lifetime';

  const activationPercentage = (activations / maxActivations) * 100;

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{productName}</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[status]}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 sm:p-6">
        {/* License key */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            License Key
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2 text-sm font-mono text-gray-900">
              {formatKey(keyString)}
            </code>
            <button
              onClick={handleCopy}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Activations */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Activations</span>
            <span className="text-gray-500">
              {activations} / {maxActivations}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${activationPercentage}%` }}
            />
          </div>
        </div>

        {/* Expiry */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Expires</span>
          <span className="text-gray-500">{expiryDate}</span>
        </div>
      </div>
    </div>
  );
}
