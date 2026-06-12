'use strict';

/**
 * Game search uses ILIKE '%term%' which seq-scans the whole catalog on every
 * keystroke. pg_trgm + a GIN trigram index makes those lookups index-backed.
 * Supabase ships pg_trgm; CREATE EXTENSION IF NOT EXISTS is a no-op if present.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_games_name_trgm ON games USING GIN (name gin_trgm_ops);'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_games_name_trgm;');
  }
};
