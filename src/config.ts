export const SITE = {
  title: '康勞德醫普',
  tagline: '來自台大醫學生 WLK 的繁體中文醫學科普文集',
  description:
    '以 Claude Code 與 OpenEvidence 等 AI 工具為輔助，整理具實證基礎的繁體中文醫學科普文章。每篇文章標註資料來源，立場僅供參考，臨床決策仍以個別病人主治醫師判斷為準。',
  author: '康瑋麟（WLK）',
  lang: 'zh-Hant-TW',
  url: 'https://fireman333.github.io',
  base: '/KlaudeHealthEducation',
  ogImage: 'og-default.png',
} as const;

export const NAV = [
  { href: '/', label: '首頁' },
  { href: '/categories/', label: '主題' },
  { href: '/about/', label: '關於' },
  { href: '/feed.xml', label: 'RSS' },
] as const;
