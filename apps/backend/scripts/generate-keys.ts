#!/usr/bin/env ts-node
/**
 * Batch license key generation script
 * Usage: npm run generate-keys -- <productId> <count> [options]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LicenseKeysService } from '../src/modules/license-keys/license-keys.service';
import { parse } from 'ts-command-line-args';

interface CLIArgs {
  productId: string;
  count: number;
  validityDays?: number;
  maxActivations?: number;
  batchSize?: number;
  help?: boolean;
}

const args = parse<CLIArgs>({
  productId: { type: String, alias: 'p' },
  count: { type: Number, alias: 'n' },
  validityDays: { type: Number, alias: 'v', optional: true },
  maxActivations: { type: Number, alias: 'a', optional: true },
  batchSize: { type: Number, alias: 'b', optional: true, defaultValue: 100 },
  help: { type: Boolean, alias: 'h', optional: true },
});

if (args.help) {
  console.log(`
Batch License Key Generation Tool

Usage:
  npm run generate-keys -- <productId> <count> [options]

Options:
  -p, --productId       Product ID (required)
  -n, --count           Number of keys to generate (required, max 10000)
  -v, --validityDays    Validity period in days (optional)
  -a, --maxActivations  Maximum activations per key (optional)
  -b, --batchSize       Batch size for processing (default: 100)
  -h, --help            Show this help message

Examples:
  npm run generate-keys -- -p prod_abc123 -n 1000
  npm run generate-keys -- -p prod_abc123 -n 5000 -v 365 -a 1
  `);
  process.exit(0);
}

async function main() {
  console.log('License Key Shop - Batch Key Generation\n');
  console.log(`Product ID: ${args.productId}`);
  console.log(`Count: ${args.count}`);
  console.log(`Batch Size: ${args.batchSize}`);

  if (args.validityDays) {
    console.log(`Validity: ${args.validityDays} days`);
  }
  if (args.maxActivations) {
    console.log(`Max Activations: ${args.maxActivations}`);
  }

  console.log('\nStarting generation...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const licenseKeysService = app.get(LicenseKeysService);

  try {
    const startTime = Date.now();

    const result = await licenseKeysService.generateKeys(
      args.productId,
      args.count,
      {
        validityDays: args.validityDays,
        maxActivations: args.maxActivations,
      },
    );

    const elapsed = Date.now() - startTime;
    const rate = (args.count / (elapsed / 1000)).toFixed(2);

    console.log('\n✓ Generation complete!');
    console.log(`\nKeys Generated: ${result.count}`);
    console.log(`Product: ${result.productId}`);
    console.log(`Time: ${elapsed}ms`);
    console.log(`Rate: ${rate} keys/second`);

    if (args.count >= 1000 && elapsed < 5000) {
      console.log('\n✓ Performance target met (< 5s for 1000 keys)');
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Generation failed:');
    console.error(error.message);
    await app.close();
    process.exit(1);
  }
}

main();
