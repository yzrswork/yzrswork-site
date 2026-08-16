# Migration Manifest

| Path / responsibility | Status | Reason |
| --- | --- | --- |
| `public/index.html` | COPY | 本体Top |
| `public/about/` | COPY | 本体の案内 |
| `public/privacy/` | COPY | 本体のPrivacy |
| `public/analytics.js` | COPY | 既存Analytics契約を維持 |
| `public/ads.txt` | COPY | 既存広告設定を維持 |
| `public/robots.txt` | NEW | 本体サイト用Sitemapを指示 |
| `public/sitemap.xml` | NEW | LPを除外した本体サイト用 |
| `public/og.png` | COPY | 本体OGP asset |
| `content/guides/` | COPY | Guide Markdownをsourceとして保持 |
| `public/guides/` | COPY / GENERATED | build出力とGuide asset |
| `public/lp/electronics-starter/` | COPY | 未マージDraft PR #14のheadから取得 |
| `data/landing-pages.json` | NEW | LP管理のSoT |
| `scripts/build-guide.mjs` | NEW | 新しいcontent配置に合わせたGuide build |
| `scripts/build-site.mjs` | NEW | 本体サイトbuild入口 |
| `scripts/generate-sitemap.mjs` | NEW | 本体サイト用sitemap生成 |
| `scripts/check-public.mjs` | NEW | 本体サイト専用の回帰検証 |
| `prompts/` | KEEP IN YZRS-TIMES | Times生成 |
| `scheduler/` | KEEP IN YZRS-TIMES | Times自動処理 |
| `editions/` | KEEP IN YZRS-TIMES | Times edition |
| `sources.json` | KEEP IN YZRS-TIMES | source収集 |
| `public/times/` | DEFER | cross-repo publishing未設計 |
| `wrangler.jsonc` | KEEP IN YZRS-TIMES | 現行ProductionのCloudflare配信設定 |
| Cloudflare secrets | KEEP IN YZRS-TIMES | Shadowへコピー禁止 |

## Copy rule

既存Repositoryのファイルを削除・移動せず、必要な本体サイト資産だけをCOPYします。PR #14はmergeせず、commit `3a5520c1f987b75dad7626fa07e13653bd5a32dd` のLP差分だけを新Repositoryへ取り込みます。

## Gate

`CUTOVER_READY = false`

理由はTimes cross-repo publishing、Owner review、Cloudflare変更承認が未完了だからです。
