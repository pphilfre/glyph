import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { MAX_NOTE_BYTES, NOTE_EXTENSIONS, validateSource, sourceTitle } from '../src/lib/note-source';

// Requests use explicit bearer tokens, never ambient cookies.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
};
const json = (body: unknown, status: number) => Response.json(body, { status, headers: cors });

export const upload = httpAction(async (ctx, request) => {
  if (!await ctx.auth.getUserIdentity()) return json({ error: 'Sign in before uploading a note.' }, 401);
  const filename = new URL(request.url).searchParams.get('filename') ?? '';
  if (!NOTE_EXTENSIONS.test(filename) || filename.length > 240 || /[/\\\u0000-\u001f]/.test(filename)) {
    return json({ error: 'Choose a .md, .markdown, .mtex or .mathtex file.' }, 400);
  }
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Choose a non-empty note file.' }, 400);
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_NOTE_BYTES) {
      await reader.cancel();
      return json({ error: 'Choose a file up to 2 MB.' }, 413);
    }
    chunks.push(new Uint8Array(value));
  }
  const blob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(await blob.arrayBuffer());
    validateSource(source);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Choose a UTF-8 text note.' }, 400);
  }
  const sourceStorageId = await ctx.storage.store(blob);
  try {
    const id = await ctx.runMutation(internal.notes.create, { sourceStorageId, filename, title: sourceTitle(source, filename) });
    return json({ id }, 201);
  } catch (error) {
    await ctx.storage.delete(sourceStorageId);
    console.error('Note creation failed', error);
    return json({ error: 'Your note could not be saved. Please try again.' }, 503);
  }
});

const http = httpRouter();
http.route({ path: '/notes/upload', method: 'POST', handler: upload });
http.route({ path: '/notes/upload', method: 'OPTIONS', handler: httpAction(async () => new Response(null, { status: 204, headers: cors })) });
export default http;
