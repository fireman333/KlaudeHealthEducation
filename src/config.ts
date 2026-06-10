export const SITE = {
  title: '康勞德醫普',
  tagline: '來自台大醫學生 WLK 的繁體中文醫學科普文集',
  description:
    '以 Claude Code 與 OpenEvidence 等 AI 工具為輔助，整理具實證基礎的繁體中文醫學科普文章。每篇文章標註資料來源，立場僅供參考，臨床決策仍以個別病人主治醫師判斷為準。',
  author: '康瑋麟（WLK）',
  lang: 'zh-Hant-TW',
  url: 'https://med-study-rpg.com',
  base: '/klaudehealthedu',
  ogImage: 'og-default.png',
} as const;

export const NAV = [
  { href: '/', label: '首頁' },
  { href: '/categories/', label: '主題' },
  { href: '/about/', label: '關於' },
  { href: '/feed.xml', label: 'RSS' },
] as const;

// v2 留言板 settings (read at build time from PUBLIC_* env vars)
// Both default to Cloudflare's "always-passes" test values for local dev,
// so `pnpm dev` and `pnpm build` work without configuration. Real values
// are injected via GH Actions secrets in production.
export const COMMENTS = {
  apiBase: import.meta.env.PUBLIC_COMMENTS_API ?? 'http://localhost:8787',
  turnstileSiteKey:
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
} as const;
