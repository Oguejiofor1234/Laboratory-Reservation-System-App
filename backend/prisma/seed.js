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
  {
    name: 'CHNS-O Analyzer',
    description: 'Elemental analysis of C, H, N, S & O',
    type: 'analysis',
    icon: '🧪',
    totalUnits: 1,
    requiresTraining: true,
    maintenanceMode: true,
    maintenanceNote: 'Currently unavailable — scheduled for maintenance.',
  },
  {
    name: 'FTIR Spectrometer',
    description: 'Fourier-transform infrared spectroscopy',
    type: 'analysis',
    icon: '📊',
    totalUnits: 1,
    requiresTraining: true,
    maintenanceMode: true,
    maintenanceNote: 'Currently unavailable — pending calibration.',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const studentPassword = await bcrypt.hash('Student@1780!', 12);
  await prisma.user.upsert({
    where: { email: 'student@lab1780.edu' },
    update: {},
    create: {
      email: 'student@lab1780.edu',
      password: studentPassword,
      firstName: 'Demo',
      lastName: 'Student',
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });
  console.log('✅ Demo student: student@lab1780.edu / Student@1780!');

  const nelsonPassword = await bcrypt.hash('Nelson@1780!', 12);
  const nelson = await prisma.user.upsert({
    where: { email: 'nelson@lab1780.edu' },
    update: { firstName: 'Nelson', lastName: 'Landary', role: 'TECHNOLOGIST', isEmailVerified: true },
    create: {
      email: 'nelson@lab1780.edu',
      password: nelsonPassword,
      firstName: 'Nelson',
      lastName: 'Landary',
      role: 'TECHNOLOGIST',
      isEmailVerified: true,
    },
  });
  console.log('✅ Nelson Merlin: nelson@lab1780.edu / Nelson@1780!');

  const simonPassword = await bcrypt.hash('Simon@1780!', 12);
  const simon = await prisma.user.upsert({
    where: { email: 'simon@lab1780.edu' },
    update: { firstName: 'Simon', lastName: 'Laliberte-Riverin', role: 'TECHNOLOGIST', isEmailVerified: true },
    create: {
      email: 'simon@lab1780.edu',
      password: simonPassword,
      firstName: 'Simon',
      lastName: 'Laliberte-Riverin',
      role: 'TECHNOLOGIST',
      isEmailVerified: true,
    },
  });
  console.log('✅ Simon Dubois: simon@lab1780.edu / Simon@1780!');

  const guillaumePassword = await bcrypt.hash('Guillaume@1780!', 12);
  const guillaume = await prisma.user.upsert({
    where: { email: 'guillaume@lab1780.edu' },
    update: { firstName: 'Guillaume', lastName: 'Gauvin', role: 'TECHNOLOGIST', isEmailVerified: true },
    create: {
      email: 'guillaume@lab1780.edu',
      password: guillaumePassword,
      firstName: 'Guillaume',
      lastName: 'Gauvin',
      role: 'TECHNOLOGIST',
      isEmailVerified: true,
    },
  });
  console.log('✅ Guillaume Bernard: guillaume@lab1780.edu / Guillaume@1780!');

  // ── Equipment with person-in-charge assignments ─────────────────────────────
  const equipmentAssignments = [
    { name: '3D Printer',         personInChargeId: nelson.id },
    { name: 'FTIR Spectrometer',  personInChargeId: nelson.id },
    { name: 'CNC Mill',           personInChargeId: nelson.id },
    { name: 'CHNS-O Analyzer',    personInChargeId: simon.id },
    { name: 'Laser Cutter',       personInChargeId: simon.id },
    { name: 'Microscope',         personInChargeId: simon.id },
    { name: 'Oscilloscope',       personInChargeId: guillaume.id },
    { name: 'Soldering Station',  personInChargeId: guillaume.id },
  ];

  for (const item of equipment) {
    const assignment = equipmentAssignments.find(a => a.name === item.name);
    await prisma.equipment.upsert({
      where: { name: item.name },
      update: { personInChargeId: assignment?.personInChargeId || null },
      create: { ...item, personInChargeId: assignment?.personInChargeId || null },
    });
  }
  console.log(`✅ Seeded ${equipment.length} equipment items with person-in-charge`);

  console.log('🎉 Database seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
