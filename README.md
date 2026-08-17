# yzrswork-site

`yzrswork.com` 本体サイトを管理するためのShadow Repositoryです。

## Status

**SHADOW / NOT PRODUCTION**

現在のProduction配信元は `yzrswork/yzrs-times` です。`yzrswork.com` のcustom domain、DNS、Route、Cloudflare設定は、このRepositoryには接続しません。

本Repositoryの目的は、Top・Guide・LP・About・Privacy・SEO・Analyticsなど、本体サイトの責務を `yzrs-times` から分離し、ローカルとCIで独立検証できる状態にすることです。

## Production safety

- Productionは現在も `yzrswork/yzrs-times` が配信します。
- `yzrs-times` のファイルは削除・移動せず、COPYで扱います。
- `yzrs-times` のTimes生成、AI編集、scheduler、publish workflowは本Repositoryに移しません。
- `public/times/` はcross-repo publishing設計が未確定のためDEFERです。
- `wrangler.jsonc`、Cloudflare deploy script、Cloudflare deploy workflow、Secretsは含めません。
- Cutover条件は `CUTOVER_READY = false` です。

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

Times data/contentのownerは `yzrswork/yzrs-times`、Times UI/siteのownerは本Repositoryです。`sync-times.yml` は指定runのJSON-only artifactを受け取るSite receiverですが、senderは未実装です。入力・manifest・path/type・JSON・orderingをFail Closedで検証し、Siteだけが自身のmainへ直接commitします。

受信に使う `TIMES_ARTIFACT_READ_TOKEN` の実値は保存しません。Cloudflare操作・deploy・Production変更は行わず、`CUTOVER_READY = false` のままです。

## Cutover rule

Cloudflare cutoverは別タスクです。Owner review、Times cross-repo publishing、Cloudflare変更の承認が完了するまで、custom domainを接続しないでください。
