import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import type { Id } from '../convex/_generated/dataModel';

export function backend() {
  return convexTest({ schema, transactionLimits: true, modules: {
    '../convex/notes.ts': () => import('../convex/notes'),
    '../convex/http.ts': () => import('../convex/http'),
    '../convex/_generated/server.js': () => import('../convex/_generated/server'),
  } });
}

export async function uploadNote(t: Pick<ReturnType<typeof backend>, 'fetch'>, source = '# Mechanics\n\nEnergy is $E=mc^2$.', filename = 'mechanics.md') {
  const response = await t.fetch('/notes/upload?filename=' + encodeURIComponent(filename), { method: 'POST', body: source });
  if (response.status !== 201) throw new Error(await response.text());
  return (await response.json()).id as Id<'notes'>;
}
