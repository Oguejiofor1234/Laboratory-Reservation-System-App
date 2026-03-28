const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const equipment = [
  {
    name: '3D Printer',
    description: 'Fused deposition modeling',
    type: 'fabrication',
    icon: '🖨️',
    totalUnits: 5,
    requiresTraining: true,
  },
  {
    name: 'Laser Cutter',
    description: 'CO2 laser engraving',
    type: 'fabrication',
    icon: '⚡',
    totalUnits: 2,
    requiresTraining: true,
  },
  {
    name: 'Oscilloscope',
    description: 'Digital storage oscilloscope',
    type: 'measurement',
    icon: '📡',
    totalUnits: 6,
    requiresTraining: false,
  },
  {
    name: 'Soldering Station',
    description: 'Precision soldering iron',
    type: 'electronics',
    icon: '🔧',
    totalUnits: 10,
    requiresTraining: false,
  },
  {
    name: 'CNC Mill',
    description: 'Computer numerical control milling machine',
    type: 'fabrication',
    icon: '⚙️',
    totalUnits: 2,
    requiresTraining: true,
  },
  {
    name: 'Microscope',
    description: 'Digital compound microscope',
    type: 'measurement',
    icon: '🔬',
    totalUnits: 4,
    requiresTraining: false,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed equipment
  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }
  console.log(`✅ Seeded ${equipment.length} equipment items`);

  // Create demo technologist
  const hashedPassword = await bcrypt.hash('Tech@1708!', 12);
  await prisma.user.upsert({
    where: { email: 'tech@lab1708.edu' },
    update: {},
    create: {
      email: 'tech@lab1708.edu',
      password: hashedPassword,
      firstName: 'Lab',
      lastName: 'Technologist',
      role: 'TECHNOLOGIST',
      isEmailVerified: true,
    },
  });
  console.log('✅ Seeded demo technologist: tech@lab1708.edu / Tech@1708!');

  // Create demo student
  const studentPassword = await bcrypt.hash('Student@1708!', 12);
  await prisma.user.upsert({
    where: { email: 'student@lab1708.edu' },
    update: {},
    create: {
      email: 'student@lab1708.edu',
      password: studentPassword,
      firstName: 'Demo',
      lastName: 'Student',
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });
  console.log('✅ Seeded demo student: student@lab1708.edu / Student@1708!');

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
