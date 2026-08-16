# Migration Manifest

Production Repositoryは変更せず、以下のsourceをShadow RepositoryへCOPYまたはShadow専用に整備しました。

| Source path | Destination path | Category | Reason | Migration status |
| --- | --- | --- | --- | --- |
| `yzrs-times/public/index.html` | `public/index.html` | COPY | 本体Topを保持 | COMPLETE |
| `yzrs-times/public/about/` | `public/about/` | COPY | Aboutを保持 | COMPLETE |
| `yzrs-times/public/privacy/` | `public/privacy/` | COPY | Privacyを保持 | COMPLETE |
| `yzrs-times/public/analytics.js` | `public/analytics.js` | COPY | 既存GA4契約を維持 | COMPLETE |
| `yzrs-times/public/ads.txt` | `public/ads.txt` | COPY | 既存広告設定を維持 | COMPLETE |
| `yzrs-times/public/robots.txt` | `public/robots.txt` | COPY | 公開サイトのcrawl方針を維持 | COMPLETE |
| `yzrs-times/public/sitemap.xml` | `public/sitemap.xml` | COPY / REGENERATED | LP-01とDEFER対象を除外したSite用sitemapを生成 | COMPLETE |
| `yzrs-times/public/og.png` | `public/og.png` | COPY | 本体OGP assetを保持 | COMPLETE |
| `yzrs-times/content/hajimete-no-denshi-kousaku-starter-guide.md` | `content/guides/hajimete-no-denshi-kousaku-starter-guide.md` | COPY | Guide本文をsourceとして保持 | COMPLETE |
| `yzrs-times/content/hajimete-no-denshi-kousaku-starter-guide.images.yaml` | `content/guides/hajimete-no-denshi-kousaku-starter-guide.images.yaml` | COPY | Guide画像の権利確認manifestを保持 | COMPLETE |
| `yzrs-times/public/guides/hajimete-no-denshi-kousaku-starter-guide/assets/` | `public/guides/hajimete-no-denshi-kousaku-starter-guide/assets/` | COPY | Guideが参照するassetを保持 | COMPLETE |
| `yzrs-times/public/guides/hajimete-no-denshi-kousaku-starter-guide/index.html` | `public/guides/hajimete-no-denshi-kousaku-starter-guide/index.html` | COPY / GENERATED | Guide build結果を独立検証 | COMPLETE |
| `yzrs-times@3a5520c1f987b75dad7626fa07e13653bd5a32dd:public/lp/electronics-starter/index.html` | `public/lp/electronics-starter/index.html` | COPY | PR #14のLP-01 parityを維持 | COMPLETE |
| なし（Shadow専用） | `data/landing-pages.json` | NEW | LP管理SSoTを追加 | COMPLETE |
| `yzrs-times/scripts/build-guide.mjs` | `scripts/build-guide.mjs` | ADAPT | 新しいcontent配置向けにGuide buildを独立化 | COMPLETE |
| なし（Shadow専用） | `scripts/build-site.mjs` | NEW | Site build入口を追加 | COMPLETE |
| なし（Shadow専用） | `scripts/generate-sitemap.mjs` | NEW | Site責務だけのsitemapを生成 | COMPLETE |
| `yzrs-times/scripts/check-public.mjs` | `scripts/check-public.mjs` | ADAPT | Site用required file / link / SEO / LP checkを独立化 | COMPLETE |
| なし（Shadow専用） | `.github/workflows/verify.yml` | NEW | install / build / checkのみのverify-only CI | COMPLETE |
| `yzrs-times/prompts/` | `yzrs-times/prompts/` | KEEP | Times生成・編集 | KEPT IN SOURCE |
| `yzrs-times/scheduler/` | `yzrs-times/scheduler/` | KEEP | Times自動処理 | KEPT IN SOURCE |
| `yzrs-times/editions/` | `yzrs-times/editions/` | KEEP | Times edition定義 | KEPT IN SOURCE |
| `yzrs-times/sources.json` | `yzrs-times/sources.json` | KEEP | source収集定義 | KEPT IN SOURCE |
| `yzrs-times/public/data/` | なし | DEFER | Times成果物のcross-repo publishing未設計 | DEFERRED |
| `yzrs-times/public/times/` | なし | DEFER | Times公開成果物の受け渡し未設計 | DEFERRED |
| `yzrs-times/wrangler.jsonc` | `yzrs-times/wrangler.jsonc` | KEEP | 現行ProductionのCloudflare設定 | KEPT IN SOURCE |
| Cloudflare secrets / tokens | なし | DEFER | Shadowへcredentialを持ち込まない | DEFERRED |

## Copy rule

既存Repositoryのファイルを削除・移動せず、必要な本体サイト資産だけをCOPYします。PR #14はmergeせず、commit `3a5520c1f987b75dad7626fa07e13653bd5a32dd` のLP差分だけを新Repositoryへ取り込みます。

## Gate

Production unchanged: `yzrs-times` のProductionファイル、`wrangler.jsonc`、接続設定は変更していません。

`CUTOVER_READY = false`

理由はTimes cross-repo publishing、Owner review、Cloudflare変更承認が未完了だからです。
