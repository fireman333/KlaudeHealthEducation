# 康勞德醫普 — Klaude Health Education

繁體中文醫學科普文集，由台大醫學生 WLK 撰寫，以 Claude Code + OpenEvidence + NCCN guideline 等實證為基礎。

🌐 線上閱讀：https://fireman333.github.io/KlaudeHealthEducation/

## 結構

```
.
├── _config.yml          # Jekyll 設定（站名、URL、plugins）
├── _layouts/            # HTML 模板
│   ├── default.html     # 全站共用 layout（header / footer）
│   └── post.html        # 單篇文章 layout（meta / sources / 返回鈕）
├── _posts/              # 所有文章（檔名 YYYY-MM-DD-slug.md）
├── assets/css/style.css # 站內 CSS（深色模式、繁中字型 stack、行動裝置 first）
├── index.md             # 首頁（自動列出所有 _posts）
├── about.md             # 關於頁
├── TEMPLATE.md          # 新文章模板與 checklist
├── Gemfile              # Ruby gem 依賴（GitHub Pages stack）
└── .gitignore
```

## 新增文章

詳見 [TEMPLATE.md](./TEMPLATE.md)。簡版：

1. 複製 TEMPLATE.md 內的 markdown 區塊
2. 存為 `_posts/YYYY-MM-DD-slug.md`（檔名 date 必須與 front matter 一致）
3. `git commit && git push`
4. 等 1–3 分鐘 GitHub Pages 自動 rebuild

## 本地預覽（可選）

```bash
bundle install
bundle exec jekyll serve
```

開啟 http://127.0.0.1:4000

## 寫作風格

- 繁體中文 + 台灣用語
- 短句為主（15–25 字）
- 開場用 hook（個人場景 / 設問 / 反直覺事實），禁用「淺談 X」「初探 X」
- 至少 1 個生活化類比
- 醫學專業詞首次出現用「中文（English）」格式
- 通篇 emoji ≤ 2
- 每篇必標明資料來源（OE / NCCN / landmark trial）

完整風格規範參考 [Claude Code skill `wlk-public-writing-style`](https://github.com/fireman333/.claude)（私有 skill，未公開）。

## 自訂網域（未來）

若要綁定自訂網域：

1. 把 `CNAME.example` 改名為 `CNAME`，內容改成你的網域
2. 在網域 DNS 加 CNAME 紀錄指向 `fireman333.github.io`
3. 在 GitHub repo Settings → Pages 啟用 HTTPS

## 授權

- **內容**（_posts/、index.md、about.md）：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hant)
- **程式碼**（layouts/、CSS、_config.yml）：MIT

## 重要聲明

⚠ 本站文章為衛教科普目的，**不構成個別醫療建議**。實際治療決策請與您的主治醫師討論。
