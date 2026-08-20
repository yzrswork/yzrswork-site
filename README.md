# yzrswork-site

`yzrswork.com` 本体サイトのProduction sourceを管理するRepositoryです。

## Status

**PRODUCTION / CURRENT**

現在のProduction sourceは `yzrswork/yzrswork-site` の `main` です。既存Worker名 `yzrs-times`、custom domain、DNS、Routeは維持し、Workers Buildsのsource repositoryのみ切り替えています。

本Repositoryの目的は、Top・Guide・LP・About・Privacy・SEO・Analyticsなど、本体サイトの責務を `yzrs-times` から分離し、ローカルとCIで独立検証できる状態にすることです。

## Production safety

- Production Siteは `yzrswork/yzrswork-site` の `main` から配信されます。
- `yzrs-times` のファイルは削除・移動せず、COPYで扱います。
- `yzrs-times` のTimes生成、AI編集、scheduler、publish workflowは本Repositoryに移しません。
- `public/times/` と `public/evening.html` はSite-owned UIです。Site CIでcanonical、必要なTimes data参照、戻り導線、Times UIのinline JavaScriptを検証します。
- `wrangler.jsonc` はrepository-side設定として保持し、通常のProduction deployはWorkers Buildsが担います。Cloudflare deploy script、Cloudflare deploy workflow、SecretsはこのRepositoryに含めません。
- `CUTOVER_READY = false` はProduction ownershipではなく、readiness / Owner approval gateです。

## Local verification

```sh
npm ci
npm run build
npm run check
git diff --check
```

`npm run build` はGuide HTMLと本体サイト用sitemapだけを生成します。`npm run check` はrequired files、canonical、内部リンク、画像、Analytics、robots、sitemap、LP policy、Manus runtime不在、secret patternを検証します。

## Included

- 本体Top、About、Privacy、Guide
- LP-01 `electronics-starter`（`noindex,follow`）
- Guide Markdown sourceとbuild script
- 本体サイト用Analytics、robots、sitemap、OGP asset
- Site所有のTimes UI (`/times/`、`/evening.html`)
- JSON-only Times delivery receiverと冪等性state
- verify-only GitHub Actions
- Migration / architecture / analytics / deployment / Cloudflare cutover documentation

## Deferred

Times data/contentのownerは `yzrswork/yzrs-times`、Times UI/siteのownerは本Repositoryです。`sync-times.yml` は指定runのJSON-only artifactを受け取るSite receiverです。入力・manifest・provenance・path/type・Times snapshot・orderingをFail Closedで検証し、Siteだけが自身のmainへ直接commitします。

受信に使う `TIMES_ARTIFACT_READ_TOKEN` の実値は保存しません。このRepositoryのworkflowはCloudflare設定を直接変更しません。Production sourceは `yzrswork/yzrswork-site/main` とし、`CUTOVER_READY = false` はreadiness / Owner approval gateとして維持します。

## Cross-repo permission model

- `TIMES_ARTIFACT_READ_TOKEN`: repository accessは `yzrswork/yzrs-times` のみに制限し、Actions: Read と Contents: Readだけを付与します。write権限は不要です。
- `SITE_SYNC_TOKEN`: repository accessは `yzrswork/yzrswork-site` のみに制限し、Actions: Writeだけを付与します。Site Contents: Writeは付与しません。
- Site receiverの `GITHUB_TOKEN`: Site workflowの `contents: write` で、Site自身の `public/data/` を受け入れたときだけcommit/pushします。Times senderにはSite Contents: Write権限を与えません。

## `public/data/` ownership

`yzrswork-site/public/data/` は、Times delivery snapshotとSite-ownedの `times-sync-state.json` 専用です。無関係なSiteアプリケーションデータを置きません。receiverは受け入れたTimes snapshotを単位として意図的に置き換えます。

## Post-cutover rule

2026-08-19にProduction sourceを `yzrswork-site` へ切替済みです。今後のProduction変更はOwner reviewと明示承認の下で行います。`yzrs-times` からSiteへの配送はartifactとworkflow dispatchを経由します。
