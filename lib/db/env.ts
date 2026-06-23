export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL);
}
