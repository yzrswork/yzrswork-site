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
| `yzrs-times/public/sitemap.xml` | `public/sitemap.xml` | COPY / REGENERATED | LP-01とnoindex対象を除外し、canonical Times URLを含むSite用sitemapを生成 | COMPLETE |
| `yzrs-times/public/og.png` | `public/og.png` | COPY | 本体OGP assetを保持 | COMPLETE |
| `yzrs-times/public/times/index.html` | `public/times/index.html` | COPY | Times UIをSite所有へ移管 | COMPLETE |
| `yzrs-times/public/evening.html` | `public/evening.html` | RETIRED / REDIRECT | 夕刊UIを廃止し、legacy訪問を`/times/`へ転送 | COMPLETE |
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
| なし（Shadow専用） | `.github/workflows/sync-times.yml` | NEW | 指定runのTimes artifactを検証してSiteだけへ受信 | COMPLETE |
| なし（Shadow専用） | `scripts/times-delivery.mjs` | NEW | JSON/path/manifest/orderのFail Closed検証とstate更新 | COMPLETE |
| なし（Shadow専用） | `test/times-delivery.test.mjs` | NEW | 受信、NO-OP、ordering、異常系の決定的テスト | COMPLETE |
| `yzrs-times/prompts/` | `yzrs-times/prompts/` | KEEP | Times生成・編集 | KEPT IN SOURCE |
| `yzrs-times/scheduler/` | `yzrs-times/scheduler/` | KEEP | Times自動処理 | KEPT IN SOURCE |
| `yzrs-times/editions/` | `yzrs-times/editions/` | KEEP | Times edition定義 | KEPT IN SOURCE |
| `yzrs-times/sources.json` | `yzrs-times/sources.json` | KEEP | source収集定義 | KEPT IN SOURCE |
| `yzrs-times/public/data/` | `public/data/`（workflow受信時） | RECEIVER | JSON-only artifactをSite側で検証後に更新 | COMPLETE |
| `yzrs-times/public/times/` | `public/times/` | COPY | Times UIをSite所有へ移管 | COMPLETE |
| `yzrs-times/wrangler.jsonc` | `yzrs-times/wrangler.jsonc` | KEEP | 現行ProductionのCloudflare設定 | KEPT IN SOURCE |
| Cloudflare secrets / tokens | なし | DEFER | Shadowへcredentialを持ち込まない | DEFERRED |

## Copy rule

既存Repositoryのファイルを削除・移動せず、必要な本体サイト資産だけをCOPYします。PR #14はmergeせず、commit `3a5520c1f987b75dad7626fa07e13653bd5a32dd` のLP差分だけを新Repositoryへ取り込みます。

Cross-Repo Delivery D v0.1は実装・検証済みです。Issue #80（2026-08-19 Midday Edition）でgenuine automatic Shadow E2Eが成功し、`yzrs-times` → `times-delivery` artifact → workflow dispatch → `yzrswork-site` receiver → Fail Closed validation → Site-owned `public/data/` の経路が確認されています。`SITE_SYNC_ENABLED=true`です。

## Gate

Production unchanged: `yzrs-times` のProductionファイル、`wrangler.jsonc`、接続設定は変更していません。Times data/contentは `yzrs-times` がowner、Times UI/siteと受信後のSite dataは `yzrswork-site` がownerです。ArtifactはJSON-only、receiverはFail Closed、Siteが唯一のwriterです。

`CUTOVER_READY = false`

理由はOwner review、Preview相当の安全な検証方法、rollback条件、Cloudflare変更承認が未完了だからです。Productionは引き続き`yzrswork/yzrs-times`です。
