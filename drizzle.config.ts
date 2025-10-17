import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/gestell-crsqlite.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
