import { ClientSession, Connection } from 'mongoose';

/**
 * Runs `fn` inside the caller's transaction when given one, otherwise in a
 * new transaction. Lets a service method be used on its own or as one step
 * of a bigger operation (e.g. reserve copy + create rental + claim slot).
 *
 * Mongoose retries the whole function on transient errors such as two
 * transactions writing the same document, so `fn` must not have side effects
 * outside MongoDB (no emails or gateway calls inside it).
 */
export function inTransaction<T>(
  connection: Connection,
  session: ClientSession | undefined,
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  return session ? fn(session) : connection.transaction(fn);
}
