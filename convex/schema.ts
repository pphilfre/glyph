import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  preferences: defineTable({ ownerId: v.string(), theme: v.string() }).index('by_owner', ['ownerId']),
  notes: defineTable({
    ownerId: v.string(),
    title: v.string(),
    slug: v.string(),
    filename: v.string(),
    sourceStorageId: v.id('_storage'),
    editorStorageId: v.optional(v.id('_storage')),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_owner', ['ownerId']).index('by_slug', ['slug']),
});
