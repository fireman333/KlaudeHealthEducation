import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '@/config';

export async function GET(_context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const siteRoot = `${SITE.url}${SITE.base}/`.replace(/([^:])\/\/+/g, '$1/');

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: siteRoot,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `posts/${post.slug}/`,
      categories: post.data.categories,
    })),
    customData: `<language>zh-Hant-TW</language>`,
    trailingSlash: true,
  });
}
