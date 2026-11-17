import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(process.env.DATA_DIR || 'data');
let queue = Promise.resolve();
export async function readStore() {
  try { return JSON.parse(await readFile(resolve(root, 'store.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { subscriptions: {}, returns: {}, events: [] }; throw error; }
}
export function mutateStore(fn) {
  const task = queue.then(async () => {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const db = await readStore();
    const result = await fn(db);
    const tmp = resolve(root, 'store.tmp');
    await writeFile(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
    await rename(tmp, resolve(root, 'store.json'));
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
