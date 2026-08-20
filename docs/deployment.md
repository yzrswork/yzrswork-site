# Deployment

## Current state

ProductionはCloudflare Workers Buildsにより、`yzrswork/yzrswork-site` の `main` から配信されています。既存Worker名 `yzrs-times`、DNS、custom domain、Routeは維持されています。`CUTOVER_READY=false` はreadiness / Owner approval gateです。

Cross-Repo Delivery D v0.1は実装・検証済みです。Issue #80（2026-08-19 Midday Edition）でgenuine automatic Shadow E2Eが成功し、`SITE_SYNC_ENABLED=true`です。`/times/`がcanonicalな通常Times UIで、`/evening.html`は`/times/`へのlegacy compatibility redirectです。

## Local verification

```sh
npm ci
npm run build
npm run check
npm test
git diff --check
```

ローカルHTTPサーバーで確認する場合は、build後に `public` をrootとして配信します。

```sh
python3 -m http.server 8000 -d public
```

確認対象:

- `/`
- `/about/`
- `/privacy/`
- `/guides/hajimete-no-denshi-kousaku-starter-guide/`
- `/lp/electronics-starter/`

LPは390 / 430 / 768 / 1440pxで表示確認します。

## CI

`.github/workflows/verify.yml` はcheckout、`npm ci`、build、check、test、`git diff --check`だけを実行します。Deploy、Cloudflare、Repository write、scheduled publishingはありません。

Cross-Repo Deliveryは、`yzrs-times` → `times-delivery` artifact → workflow dispatch → `yzrswork-site` receiver → Fail Closed validation → Site-owned `public/data/` の経路で自動実行されます。`.github/workflows/sync-times.yml` は指定された `source_run_id` のartifactだけを `TIMES_ARTIFACT_READ_TOKEN` で読み、検証済みのJSONだけをSite mainへcommitします。受信処理はSite自身の `contents: write` を使います。secretの実値はRepositoryへ書きません。その後のProduction deploymentはCloudflare Workers Buildsが `yzrswork-site/main` をsourceとして行います。

受信に失敗した場合はSite commitを作らず、現在受理済みのTimes dataを保持します。branch protectionやworkflow pushが拒否した場合も、保護を弱めず、受信の再実行またはOwner確認で解決します。

## Direct deployment boundary

このRepositoryのGitHub Actionsから `wrangler deploy`、`wrangler pages deploy`、Cloudflare API、custom domain変更を直接実行しません。これはSiteが非Productionであることを意味しません。Production sourceは `yzrswork-site/main` であり、Cloudflare cutover後のWorkers BuildsがProduction deploymentを担います。
