'use strict';

const workers = [
  {
    email: 'ramon@skillconnect.ph',
    password: 'worker123',
    name: 'Ramon Dela Cruz',
    phone: '0918 442 1190',
    barangay: 'Guinobatan',
    role: 'worker',
    skillCategory: 'Electronics',
    bio: 'TV, karaoke, and small appliance repair. 12 years experience.',
    initials: 'RD',
    verified: true,
    rating: 4.9,
    jobs: 32,
    availability: 'available',
    lat: 13.4262,
    lng: 121.1734,
  },
  {
    email: 'fe@skillconnect.ph',
    password: 'worker123',
    name: 'Fe Santos',
    phone: '0918 220 4471',
    barangay: 'Camansihan',
    role: 'worker',
    skillCategory: 'Electrical',
    bio: 'Household wiring, breaker issues, and outlet installs.',
    initials: 'FS',
    verified: true,
    rating: 4.8,
    jobs: 27,
    availability: 'available',
    lat: 13.3947,
    lng: 121.1624,
  },
  {
    email: 'jun@skillconnect.ph',
    password: 'worker123',
    name: 'Jun Marasigan',
    phone: '0917 903 2201',
    barangay: 'Bayanan I',
    role: 'worker',
    skillCategory: 'Welding',
    bio: 'Gate repair, metal fabrication, and welding jobs.',
    initials: 'JM',
    verified: true,
    rating: 5,
    jobs: 19,
    availability: 'busy',
    lat: 13.3865,
    lng: 121.1902,
  },
];

const residents = [
  {
    email: 'maria@gmail.com',
    password: 'customer123',
    name: 'Marites Aquino',
    phone: '0917 200 1122',
    barangay: 'Guinobatan',
    role: 'customer',
    initials: 'MA',
    lat: 13.4262,
    lng: 121.1734,
  },
];

const admins = [
  {
    email: 'admin@skillconnect.ph',
    password: 'admin123',
    name: 'Kagawad Elena Torres',
    phone: '0917 000 0000',
    barangay: 'Guinobatan',
    role: 'admin',
    initials: 'KE',
  },
];

const requests = [
  {
    ticketId: 'SC-2481',
    customerName: 'Marites Aquino',
    barangay: 'Guinobatan',
    contactNumber: '0917 200 1122',
    skillNeeded: 'Electronics',
    description: 'TV turns on but has no picture. Please inspect the power board.',
    preferredDate: '2026-09-22',
    workerName: 'Ramon Dela Cruz',
    rating: null,
    lat: 13.4262,
    lng: 121.1734,
  },
  {
    ticketId: 'SC-2482',
    customerName: 'Danilo Reyes',
    barangay: 'Camansihan',
    contactNumber: '0917 555 8890',
    skillNeeded: 'Electrical',
    description: 'Breaker keeps tripping when the washing machine is running.',
    preferredDate: '2026-09-24',
    workerName: null,
    rating: null,
    lat: 13.3947,
    lng: 121.1624,
  },
];

const announcements = [
  {
    category: 'Program',
    date: '2026-09-02',
    title: 'SkillConnect pilot opens in Barangay Guinobatan',
    body: 'Residents can now submit repair requests directly at the barangay hall or through this site.',
  },
  {
    category: 'Registration',
    date: '2026-08-26',
    title: 'Worker registration now open for electricians and welders',
    body: 'Bring a valid ID to the PESO desk to begin verification. Registration is free.',
  },
  {
    category: 'Office hours',
    date: '2026-08-18',
    title: 'Saturday hours extended for worker verification',
    body: 'The barangay office will process worker applications until 12 PM on Saturdays this month.',
  },
];

async function findByEmail(email) {
  return strapi.documents('api::user.user').findFirst({ filters: { email } });
}

async function seedCustomUsers() {
  for (const user of [...workers, ...residents, ...admins]) {
    if (!(await findByEmail(user.email))) {
      await strapi.documents('api::user.user').create({ data: user, status: 'published' });
      console.log(`Created profile: ${user.email}`);
    }
  }
}

async function seedAuthUsers() {
  const authService = strapi.plugin('users-permissions').service('user');
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });

  for (const user of [...workers, ...residents, ...admins]) {
    const existing = await strapi.query('plugin::users-permissions.user').findOne({ where: { email: user.email } });
    if (!existing) {
      await authService.add({
        username: user.email,
        email: user.email,
        provider: 'local',
        password: user.password,
        confirmed: true,
        blocked: false,
        role: role.id,
      });
      console.log(`Created login: ${user.email} / ${user.password}`);
    } else if (existing.provider !== 'local') {
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: existing.id },
        data: { provider: 'local' },
      });
      console.log(`Fixed login provider: ${user.email}`);
    }
  }
}

async function seedCollection(model, entries, uniqueField) {
  for (const entry of entries) {
    const existing = await strapi.documents(`api::${model}.${model}`).findFirst({
      filters: { [uniqueField]: entry[uniqueField] },
    });
    if (!existing) {
      const data = { ...entry };
      if (model === 'request' && entry.workerName) {
        const worker = await strapi.query('plugin::users-permissions.user').findOne({
          where: { email: 'ramon@skillconnect.ph' },
        });
        if (worker) data.workerId = String(worker.id);
        data.status = 'accepted';
      }
      await strapi.documents(`api::${model}.${model}`).create({ data, status: 'published' });
      console.log(`Created ${model}: ${entry[uniqueField]}`);
    } else if (model === 'request' && entry.workerName && !existing.workerId) {
      const worker = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'ramon@skillconnect.ph' },
      });
      if (worker) {
        await strapi.documents(`api::${model}.${model}`).update(existing.documentId, {
          data: { workerId: String(worker.id), status: 'accepted' },
          status: 'published',
        });
        console.log(`Assigned ${model}: ${entry[uniqueField]}`);
      }
    }
  }
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  await seedCustomUsers();
  await seedAuthUsers();
  await seedCollection('request', requests, 'ticketId');
  await seedCollection('announcement', announcements, 'title');

  await app.destroy();
  console.log('SkillConnect default data is ready.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
