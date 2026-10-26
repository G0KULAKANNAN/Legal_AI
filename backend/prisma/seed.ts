import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LegalAI database...');

  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@legalai.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPass123!LegalAI';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'LegalAI Master Admin',
        role: Role.ADMIN,
        preferredLanguage: 'en',
      },
    });
    console.log(`✅ Default admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Admin user ${adminEmail} already exists.`);
  }

  // Seed India Legal Sources
  const legalSources = [
    {
      act: 'Indian Contract Act, 1872',
      section: 'Section 10 & Section 23',
      title: 'What agreements are contracts & Lawful object/considerations',
      description: 'All agreements are contracts if made by free consent of parties competent to contract, for a lawful consideration and object. Agreements of illegal/unlawful object are void.',
      applicability: 'Applies to all legal agreements, employment contracts, and commercial transactions in India.',
      sourceUrl: 'https://www.indiacode.nic.in/handle/123456789/2187',
    },
    {
      act: 'Rent Control Act / Model Tenancy Act, 2021',
      section: 'Section 13 & Section 22',
      title: 'Security Deposit Caps & Eviction Notice Requirements',
      description: 'Cap on security deposit to maximum 2 months rent for residential premises and 6 months for commercial premises. Notice required prior to termination.',
      applicability: 'Residential house leases and commercial building rentals.',
      sourceUrl: 'https://mohua.gov.in/upload/uploadfiles/files/Model_Tenancy_Act_English.pdf',
    },
    {
      act: 'Industrial Employment (Standing Orders) Act / Labour Codes',
      section: 'Notice Period & Termination',
      title: 'Reasonable Notice Period & Non-Compete Validity',
      description: 'Post-employment non-compete restrictions extending beyond employment term are generally void under Section 27 of Indian Contract Act. Reasonable notice periods required.',
      applicability: 'Job offer letters and employment contracts.',
      sourceUrl: 'https://labour.gov.in/labour-codes',
    },
  ];

  for (const src of legalSources) {
    const existing = await prisma.legalSource.findFirst({
      where: { act: src.act, section: src.section },
    });
    if (!existing) {
      await prisma.legalSource.create({ data: src });
      console.log(`✅ Added legal source: ${src.act} - ${src.section}`);
    }
  }

  // Seed sample reported issue if admin exists
  if (existingAdmin) {
    const issueCount = await prisma.reportedIssue.count();
    if (issueCount === 0) {
      await prisma.reportedIssue.create({
        data: {
          userId: existingAdmin.id,
          issue: 'Rental agreement lock-in clause validation query regarding 11-month escalation.',
          category: 'CLAUSE_QUERY',
          status: 'OPEN',
        },
      });
      console.log('✅ Added sample reported issue');
    }
  }

  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
