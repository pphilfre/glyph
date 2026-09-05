'use client';
import dynamic from 'next/dynamic';
import type { NoteSummary } from '@/lib/note-types';

export type NoteEditorProps = { note?: NoteSummary; source?: string; blocks?: string };
const Editor = dynamic(() => import('./note-editor-client'), { ssr: false, loading: () => <p className="state-message" role="status">Opening your editor…</p> });
export function NoteEditor(props: NoteEditorProps) { return <Editor {...props} />; }
