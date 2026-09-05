import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';

export type Heading = { id: string; title: string; depth: number };
export type RenderedNote = { html: string; title: string; headings: Heading[]; readMinutes: number };
export type NoteSummary = FunctionReturnType<typeof api.notes.list>[number];
