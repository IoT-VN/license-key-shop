import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Basic License',
        description: 'Single device license with basic features',
        price: 100000,
        currency: 'VND',
        maxActivations: 1,
        validityDays: 365,
        metadata: {
          features: ['basic', 'email-support'],
          version: '1.0.0',
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pro License',
        description: 'Multi-device license with premium features',
        price: 500000,
        currency: 'VND',
        maxActivations: 3,
        validityDays: 365,
        metadata: {
          features: ['premium', 'priority-support', 'api-access'],
          version: '1.0.0',
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Enterprise License',
        description: 'Unlimited devices with all features',
        price: 2000000,
        currency: 'VND',
        maxActivations: 999,
        validityDays: null, // lifetime
        metadata: {
          features: ['enterprise', '24-7-support', 'custom-integration', 'sla'],
          version: '1.0.0',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} sample products`);

  // Create sample admin user (requires Clerk ID from your Clerk dashboard)
  // Uncomment and replace with actual Clerk ID
  /*
  const adminUser = await prisma.user.create({
    data: {
      clerkId: 'user_XXXXXXXXXXXXX', // Replace with actual Clerk ID
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user');
  */

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
