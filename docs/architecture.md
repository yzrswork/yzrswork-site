# Architecture

## Repository responsibility

`yzrswork/yzrswork-site` は `yzrswork.com` 本体のProduction sourceです。Production branchは `main` です。

担当範囲:

- Top
- Guide
- LP
- About / Privacy
- Analytics
- ads.txt / robots.txt / sitemap.xml
- OGPと本体サイト共通asset
- 本体サイトのbuild/check

`yzrswork/yzrs-times` はYZRS Timesの生成・編集・scheduler・edition生成・publication artifact作成・workflow dispatchを担当します。Timesのprompt、source収集、scheduler、edition生成、AI処理、publish workflowはSiteへ移しません。Production Site sourceは `yzrswork-site` です。

## 周辺システムとの境界

- `yzrswork/yzrswork-site`: `yzrswork.com` の静的なTop、Guide、LP、About、Privacy、SEO、Analytics、assetとbuild/check。
- `yzrswork/yzrs-times`: YZRS Timesの候補収集、編集、edition生成、発行、delivery artifact作成、および `yzrswork-site` へのworkflow dispatch。
- `yzrswork_apps`: 電子工作・自作PC・DIY向けのWebツール群。Siteから外部リンクで参照しますが、今回のCOPY対象でもbuild対象でもありません。
- `obsidian-vault`: Ownerのローカル知識・制作メモ。Repositoryの公開コンテンツやProduction配信のSSoTではなく、今回のMigration対象外です。

SiteとTimesの公開成果物の受け渡しはCross-Repo Delivery D v0.1で実装済みです。AppsやVaultとの同期は今回の対象外です。

## Source and generated output

Guideのsource of truthは `content/guides/*.md` です。`npm run build` により `public/guides/*/index.html` を生成します。生成HTMLを編集してsourceに戻す運用はしません。

本体サイトの固定HTMLは、現在のProductionサイトからCOPYした移行対象です。LP-01は `yzrs-times` の未マージDraft PR #14のheadから取り込みました。

## Times delivery receiver v0.1

Timesのデータ/content ownerは `yzrswork/yzrs-times`、TimesのUI/site ownerは `yzrswork/yzrswork-site` です。Siteが自身のRepositoryへの唯一のwriterであり、TimesへSite contents:write権限を渡しません。

- `public/times/` はcanonicalなTimes UIとしてSiteが所有します。`public/evening.html`は旧夕刊UIを廃止したlegacy compatibility redirectです。
- `.github/workflows/sync-times.yml` は `workflow_dispatch` を受けるreceiverです。`yzrs-times`から自動dispatchされた指定 `source_run_id` の `times-delivery` artifactだけを取得し、latest artifact探索はしません。
- artifactは `delivery-manifest.json`、`data/latest.json`、`data/graph.json`、`data/index-manifest.json`、`data/issues-index-YYYY-MM.json`、および `data/issues/YYYY-MM-DD-{morning|midday}.json` だけを許可します。その他のJSON、HTML、JS、CSS、YAML、workflow、script、package等はFail Closedで拒否します。
- manifestのsource repository、source SHA、run ID、edition、publishedAtとworkflow入力を一致検証し、JSONと既存配信時刻を確認してから `public/data/` と `times-sync-state.json` を更新します。
- `data/times-sync-state.json` はSite管理で、同一runはNO-OP、古いdeliveryは拒否、新しいdeliveryだけを受け入れます。
- `SITE_SYNC_ENABLED=true`です。Issue #80（2026-08-19 Midday Edition）でgenuine automatic Shadow E2Eが成功しました。

Timesの生成・AI処理・scheduler・sender・delivery artifact作成・Site dispatchは `yzrs-times` に残ります。このreceiverはFail ClosedでSite-owned `public/data/`だけを更新します。Production Site deploymentは `yzrswork-site/main` をsourceとするWorkers Buildsが担い、`CUTOVER_READY = false` はreadiness / Owner approval gateです。
