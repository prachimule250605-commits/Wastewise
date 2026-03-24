const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Waste = require('./models/Waste');
const Report = require('./models/Report');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wastewise';

const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
const wasteTypes = ['organic', 'recyclable', 'hazardous', 'electronic', 'medical', 'general'];
const sources = ['household', 'commercial', 'industrial', 'municipal'];
const statuses = ['reported', 'collected', 'in-transit', 'processing', 'recycled', 'disposed'];
const addresses = [
  '12, MG Road, Bangalore', '45, Linking Road, Mumbai', '7, Park Street, Kolkata',
  '88, Anna Salai, Chennai', '23, Connaught Place, Delhi', '67, FC Road, Pune',
  '3, Salt Lake, Kolkata', '19, Banjara Hills, Hyderabad', '56, Brigade Road, Bangalore',
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear collections
  await User.deleteMany({});
  await Waste.deleteMany({});
  await Report.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // Create users
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const users = await User.insertMany([
    { name: 'Priya Sharma', email: 'citizen@demo.com', password: passwordHash, role: 'citizen', zone: 'Zone A', points: 150 },
    { name: 'Rohan Mehta', email: 'citizen2@demo.com', password: passwordHash, role: 'citizen', zone: 'Zone B', points: 90 },
    { name: 'Anjali Nair', email: 'citizen3@demo.com', password: passwordHash, role: 'citizen', zone: 'Zone C', points: 230 },
    { name: 'Vikram Singh', email: 'collector@demo.com', password: passwordHash, role: 'collector', zone: 'Zone A', points: 0 },
    { name: 'Deepa Rao', email: 'collector2@demo.com', password: passwordHash, role: 'collector', zone: 'Zone B', points: 0 },
    { name: 'Arvind Kumar', email: 'authority@demo.com', password: passwordHash, role: 'authority', zone: 'Zone A', points: 0 },
  ]);
  console.log(`👥 Created ${users.length} users`);

  // Create waste entries
  const wasteEntries = [];
  for (let i = 0; i < 40; i++) {
    const type = wasteTypes[i % wasteTypes.length];
    const zone = zones[i % zones.length];
    const address = addresses[i % addresses.length];
    const statusIndex = Math.floor(Math.random() * statuses.length);
    const status = statuses[statusIndex];
    const reporter = users[i % 3]; // first 3 are citizens
    const collector = users[3];
    const createdAt = new Date(Date.now() - (40 - i) * 24 * 60 * 60 * 1000 * Math.random() * 2);
    
    const timeline = [
      { status: 'reported', location: address, updatedBy: reporter._id, updatedByName: reporter.name, notes: 'Waste reported by citizen', verified: true, timestamp: createdAt }
    ];

    if (statusIndex >= 1) timeline.push({ status: 'collected', location: `Collection point, ${zone}`, updatedBy: collector._id, updatedByName: collector.name, notes: 'Collected by truck #' + (Math.floor(Math.random() * 10) + 1), verified: true, timestamp: new Date(createdAt.getTime() + 6 * 60 * 60 * 1000) });
    if (statusIndex >= 2) timeline.push({ status: 'in-transit', location: 'Highway NH-48', updatedBy: collector._id, updatedByName: collector.name, notes: 'En route to processing facility', verified: true, timestamp: new Date(createdAt.getTime() + 12 * 60 * 60 * 1000) });
    if (statusIndex >= 3) timeline.push({ status: 'processing', location: 'Peenya Industrial Area Facility', updatedBy: collector._id, updatedByName: collector.name, notes: 'Waste sorting in progress', verified: true, timestamp: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) });
    if (statusIndex >= 4) timeline.push({ status: status, location: status === 'recycled' ? 'Recycling Plant #3' : 'Mandur Landfill', updatedBy: users[5]._id, updatedByName: users[5].name, notes: status === 'recycled' ? 'Successfully processed and recycled' : 'Disposed at certified facility', verified: true, timestamp: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000) });

    const anomaly = Math.random() < 0.08;

    wasteEntries.push({
      type, weight: parseFloat((Math.random() * 50 + 1).toFixed(1)), zone, address,
      source: sources[i % sources.length], status: anomaly ? 'flagged' : status,
      reportedBy: reporter._id, reportedByName: reporter.name,
      collectedBy: statusIndex >= 1 ? collector._id : undefined,
      collectorName: statusIndex >= 1 ? collector.name : undefined,
      processingFacility: statusIndex >= 3 ? 'Peenya Industrial Area Facility' : '',
      anomaly, anomalyReason: anomaly ? 'Waste diverted from designated facility without authorization' : '',
      timeline, createdAt,
    });
  }

  await Waste.insertMany(wasteEntries);
  console.log(`♻️  Created ${wasteEntries.length} waste entries`);

  // Create reports
  const reportData = [
    { title: 'Illegal Dumping Near Lake', description: 'Large amount of construction debris illegally dumped near Ulsoor Lake. Spotted at midnight by residents.', category: 'illegal-dumping', location: 'Ulsoor Lake Road', zone: 'Zone A', priority: 'critical', status: 'open' },
    { title: 'Missed Collection for 3 Days', description: 'Our street has been skipped for garbage collection for 3 consecutive days. Waste is piling up causing health concerns.', category: 'missed-collection', location: '5th Cross, Indiranagar', zone: 'Zone B', priority: 'high', status: 'under-review' },
    { title: 'Medical Waste in General Bin', description: 'Medical waste including syringes found mixed with general waste at community bin. This is extremely dangerous.', category: 'contamination', location: 'JP Nagar 4th Phase', zone: 'Zone C', priority: 'critical', status: 'resolved' },
    { title: 'Collector Accepting Bribes', description: 'Witnessed collector accepting money from commercial establishment to skip their hazardous waste from manifest.', category: 'contractor-fraud', priority: 'high', location: 'Commercial Street', zone: 'Zone A', status: 'under-review' },
    { title: 'E-Waste Dumped in Open Ground', description: 'Electronic waste including old TVs and computers dumped in open ground. Risk of heavy metal contamination.', category: 'improper-disposal', priority: 'medium', location: 'Whitefield Road', zone: 'Zone D', status: 'open' },
    { title: 'Organic Waste Not Composted', description: 'Organic waste that was supposed to be composted is being mixed with general waste at the facility.', category: 'improper-disposal', priority: 'medium', location: 'Compost Facility, Bommasandra', zone: 'Zone E', status: 'open' },
  ];

  const reports = reportData.map(r => ({
    ...r, reportedBy: users[0]._id, reportedByName: users[0].name, upvotes: Math.floor(Math.random() * 15),
  }));

  await Report.insertMany(reports);
  console.log(`📋 Created ${reports.length} reports`);

  // Update user points based on waste logged
  for (let i = 0; i < 3; i++) {
    const userWasteCount = wasteEntries.filter(w => w.reportedBy.toString() === users[i]._id.toString()).length;
    await User.findByIdAndUpdate(users[i]._id, { points: userWasteCount * 10 + (i === 2 ? 80 : 0) });
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Demo Accounts:');
  console.log('  Citizen:   citizen@demo.com / demo1234');
  console.log('  Collector: collector@demo.com / demo1234');
  console.log('  Authority: authority@demo.com / demo1234\n');

  mongoose.connection.close();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});