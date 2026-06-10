import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    description: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          note: z.string().optional(),
        }),
      )
      .min(1),
    carousel: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
          caption: z.string().optional(),
          threads_text: z.string().max(500).optional(),
        }),
      )
      .optional(),
    disease: z.string().optional(),
    treatment: z.string().optional(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
  }),
});

export const collections = { posts };
