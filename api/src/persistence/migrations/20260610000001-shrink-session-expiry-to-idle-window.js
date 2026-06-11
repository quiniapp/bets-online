'use strict';

/**
 * Sessions now use a 30-minute sliding inactivity window (expires_at is
 * extended on every authenticated request / refresh / activity ping).
 * Pre-existing rows were created with a fixed 7-day expiry; clamp them so an
 * idle session can't outlive the new window after deploy.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE sessions
      SET expires_at = LEAST(expires_at, NOW() + INTERVAL '30 minutes')
    `);
  },

  async down() {
    // Irreversible by design: original 7-day expiries are not preserved.
  },
};
