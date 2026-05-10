# 新增文章模板

> 把本檔複製到 `_posts/YYYY-MM-DD-slug.md`，填入 front matter 與內容。
> 檔名格式 **必須** 為 `YYYY-MM-DD-英文-連字號-slug.md`，否則 Jekyll 不會 build。

---

```markdown
---
layout: post
title: "文章中文標題（含引號避免冒號出錯）"
date: 2026-05-10
categories: [腫瘤科]                # 主分類（科別）
tags: [肺癌, 標靶治療, NCCN]        # 細分標籤
summary: "一句話 take-home，會出現在文章列表跟 SEO description。"
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

---

> ⚠ 本文為衛教科普，case 為虛構合成。實際治療決策請與您的主治醫師討論。
```

---

## 寫作 checklist（發布前）

- [ ] 檔名為 `YYYY-MM-DD-slug.md`，date 與檔名一致
- [ ] Front matter 五個必填：`layout`, `title`, `date`, `summary`, `sources`
- [ ] 平均句長 15–25 字
- [ ] 開場是 hook，不是總論
- [ ] 至少 1 個生活化類比
- [ ] 醫學專業詞首次出現有「中文（English）」括號補充
- [ ] 結尾有 take-home
- [ ] 至少標明 OE / NCCN / 一個 landmark trial 的來源
- [ ] 通篇繁體中文 + 台灣用語（不可出現「視頻 / 信息 / 軟件 / 網絡」）
- [ ] emoji ≤ 2

## 本地預覽（可選）

```bash
bundle install
bundle exec jekyll serve
# 開 http://127.0.0.1:4000
```

## 發布

```bash
git add _posts/YYYY-MM-DD-slug.md
git commit -m "post: 新增文章 〈標題〉"
git push
# GitHub Pages 約 1–3 分鐘後自動 rebuild
```
