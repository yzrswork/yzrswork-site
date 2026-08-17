# Deployment

## Current state

Productionは `yzrswork/yzrs-times` からCloudflare経由で配信されています。このRepositoryはShadow / Not Productionです。

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

Times receiverは `.github/workflows/sync-times.yml` の手動実行だけです。`TIMES_ARTIFACT_READ_TOKEN` で `yzrswork/yzrs-times` の指定runから `times-delivery` artifactを読み、検証済みのJSONだけをSite mainへcommitします。受信処理はSite自身の `contents: write` を使います。secretの実値はRepositoryへ書きません。

受信に失敗した場合はSite commitを作らず、現在受理済みのTimes dataを保持します。branch protectionやworkflow pushが拒否した場合も、保護を弱めずShadow実行で解決します。

## Prohibited in this Shadow phase

このRepositoryに対して `wrangler deploy`、`wrangler pages deploy`、Production Deploy、Preview Deploy、Cloudflare API操作、custom domain操作を実行しません。Cloudflare cutoverは `docs/cloudflare-cutover.md` の承認済み別タスクです。
