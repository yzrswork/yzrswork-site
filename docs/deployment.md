# Deployment

## Current state

Productionは `yzrswork/yzrs-times` からCloudflare経由で配信されています。このRepositoryはShadow / Not Productionです。

## Local verification

```sh
npm ci
npm run build
npm run check
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

`.github/workflows/verify.yml` はcheckout、`npm ci`、build、check、`git diff --check`だけを実行します。Deploy、Cloudflare、Repository write、scheduled publishingはありません。

## Prohibited in this Shadow phase

このRepositoryに対して `wrangler deploy`、`wrangler pages deploy`、Production Deploy、Preview Deploy、Cloudflare API操作、custom domain操作を実行しません。Cloudflare cutoverは `docs/cloudflare-cutover.md` の承認済み別タスクです。
