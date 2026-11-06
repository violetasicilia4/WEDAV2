// Base de datos: toda la persistencia pasa por acá y por service.ts, a través de un adaptador asincrónico (`Db`). El motor es PostgreSQL de
// Supabase (pg.ts, OPS-08, D-07); sus migraciones son ordenadas y corren una sola vez (PG_MIGRATIONS).

export type Row = Record<string, unknown>;

/**
 * Acceso a la base. Las consultas usan `?` como marcador. `tx(clave, fn)` corre `fn` en una transacción y la serializa con las demás
 * transacciones de la misma clave (un candado de Postgres por casamiento o por usuario). Dentro de `fn`, las consultas
 * hechas con este mismo objeto van a la transacción en curso.
 */
export interface Db {
  get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  tx<T>(key: string, fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
