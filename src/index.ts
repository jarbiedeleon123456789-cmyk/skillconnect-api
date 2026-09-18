import type { Core } from '@strapi/strapi';

const authenticatedActions = [
  'api::user.user.find',
  'api::user.user.findOne',
  'api::user.user.update',
  'api::request.request.create',
  'api::request.request.find',
  'api::request.request.findOne',
  'api::request.request.update',
  'api::announcement.announcement.find',
  'api::announcement.announcement.findOne',
];

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (!role) return;

    for (const action of authenticatedActions) {
      const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: { action, role: role.id },
      });

      if (!exists) {
        await strapi.db.query('plugin::users-permissions.permission').create({
          data: { action, role: role.id, enabled: true },
        });
      } else if (!exists.enabled) {
        await strapi.db.query('plugin::users-permissions.permission').update({
          where: { id: exists.id },
          data: { enabled: true },
        });
      }
    }
  },
};
