# 新增文章模板

> 把本檔複製到 `src/content/posts/YYYY-MM-DD-slug.md`，填入 frontmatter 與內容。
> 檔名格式 **必須** 為 `YYYY-MM-DD-英文-連字號-slug.md`。URL 1:1 從檔名推（含日期前綴），所以這個檔名也是部署後的 URL slug。

---

```markdown
---
title: "文章中文標題（含引號避免冒號出錯）"
date: 2026-05-10
categories: [腫瘤科]                # 主分類（科別）
tags: [肺癌, 標靶治療, NCCN]        # 細分標籤
summary: "一句話 take-home，會出現在文章列表、OG description、SEO description。"
sources:
  - title: "NCCN Guidelines: NSCLC v3.2026"
    url: "https://www.nccn.org/"
    note: "可選的補充說明"
  - title: "FLAURA — Osimertinib OS, NEJM"
    url: "https://www.nejm.org/doi/full/10.1056/NEJMoa1913662"
---

文章開場（hook：個人場景 / 設問 / 反直覺事實），不要用「淺談 X」「初探 X」。

---

## 小標 1

短句為主（15–25 字）。
專業詞首次出現用「中文（English）」格式。
例：肺腺癌（lung adenocarcinoma）。

---

## 小標 2

至少配 1 個生活化類比。
數據要轉成可感的單位。

---

## Take-home

1. 條列式重點 1
2. 條列式重點 2
3. 條列式重點 3
```

> 不必再手寫文末 `⚠ 本文為衛教科普⋯` disclaimer — 由 `PostLayout.astro` 自動 render 在每篇文 header（包含作者 byline + 醫學生身分聲明）。

---

## Frontmatter schema 規則

由 `src/content/config.ts` zod 驗證，build time 強制檢查：

| Field | 必填 | 說明 |
|---|---|---|
| `title` | ✅ | string |
| `date` | ✅ | YYYY-MM-DD |
| `summary` | ✅ | 一句話 take-home（同時用作 OG description） |
| `sources` | ✅ | array, ≥ 1 筆，每筆需 `title` + `url`（合法 URL），`note` 可選 |
| `categories` | optional | string array，預設 `[]` |
| `tags` | optional | string array |
| `description` | optional | 只在想覆寫 OG description 才填 |
| `disease` | optional | 保留給未來 schema 收緊（v2） |
| `treatment` | optional | 同上 |
| `draft` | optional | `true` 不會被 build 成靜態頁 |

❌ 不要寫 `layout: post`（Astro 5 不支援；舊 Jekyll 殘留），會印 ERROR log 但不 fail build。

## 寫作 checklist（發布前）

- [ ] 檔名為 `YYYY-MM-DD-slug.md`，date 與檔名一致
- [ ] Frontmatter 必填：`title`, `date`, `summary`, `sources`
- [ ] `sources` 至少 1 筆，每筆有 `title` + 合法 `url`
- [ ] 平均句長 15–25 字
- [ ] 開場是 hook，不是總論
- [ ] 至少 1 個生活化類比
- [ ] 醫學專業詞首次出現有「中文（English）」括號補充
- [ ] 結尾有 take-home
- [ ] 至少標明 OE / NCCN / 一個 landmark trial 的來源
- [ ] 通篇繁體中文 + 台灣用語（不可出現「視頻 / 信息 / 軟件 / 網絡」）
- [ ] emoji ≤ 2

## 本地預覽

```bash
pnpm dev
# 開 http://localhost:4321/KlaudeHealthEducation/
```

熱更新：存檔後瀏覽器自動 refresh。

## 本地 build 驗證（建議 push 前跑）

```bash
pnpm build
```

= `astro check && astro build`。會跑 zod schema 驗證 + TypeScript check。frontmatter 缺欄位會直接 error。

## 發布

```bash
git add src/content/posts/YYYY-MM-DD-slug.md
git commit -m "post: 新增文章 〈標題〉"
git push
# GitHub Actions 約 2–3 分鐘 build + deploy 完成
```
