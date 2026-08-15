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
- verify-only GitHub Actions
- Migration / architecture / analytics / deployment / Cloudflare cutover documentation

## Deferred

Timesの公開と自動更新をProductionへ接続する方法は未決定です。候補は `repository_dispatch`、reusable workflow、GitHub API commit、build artifact受け渡し、Timesのsubdomain分離です。いずれもこのShadow Migrationでは実装しません。

## Cutover rule

Cloudflare cutoverは別タスクです。Owner review、Times cross-repo publishing、Cloudflare変更の承認が完了するまで、custom domainを接続しないでください。
