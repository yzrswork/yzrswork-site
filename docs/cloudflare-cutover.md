# Cloudflare Cutover Document

この文書は将来のcutover手順を記録するためのものです。Shadow Migration中にCloudflare操作を実行する手順ではありません。

## 1. Current Production構成

- Repository: `yzrswork/yzrs-times`
- 配信: Cloudflare Workers assets
- assets directory: `./public`
- custom domain: `yzrswork.com`
- 現行ProductionのCloudflare設定は `yzrs-times/wrangler.jsonc` が保持します

現行Productionは変更せず、既存Repositoryをrollback可能な状態で保持します。

## 2. Shadow Repository構成

- Repository: `yzrswork/yzrswork-site`
- default branch: `main`
- status: `SHADOW / NOT PRODUCTION`
- 本体サイト資産、Guide source/build、LP-01、verify-only CIを保持
- Cross-Repo Delivery D v0.1: `IMPLEMENTED / VERIFIED`
- `SITE_SYNC_ENABLED=true`
- `/times/` がcanonicalなTimes UIで、`/evening.html` は `/times/` へのlegacy compatibility redirect
- `wrangler.jsonc` は既存Worker `yzrs-times` のrepository-side dry-run用設定だけを保持し、Cloudflare deploy script、Cloudflare workflow、Secretsは保持しない

## 3. 本番切替前の承認条件

Cloudflare変更とProduction切替にはOwner explicit approval requiredです。文書化だけでは承認とはみなしません。

次の全てが完了するまで `CUTOVER_READY = false` とします。

- Owner review完了
- URL parityとaccessibility確認完了
- Times cross-repo publishing方式の実装・検証完了（Cross-Repo Delivery D v0.1）
- Preview相当の安全な検証方法の承認
- rollback担当・時間枠・監視項目の合意
- Cloudflare変更の明示承認
- Cloudflare変更前の最終diff確認

## 4. Times deliveryの現状

Productionの配信元は引き続き `yzrswork/yzrs-times` です。Cross-Repo Delivery D v0.1は実装済みで、Issue #80（2026-08-19 Midday Edition）でgenuine automatic Shadow E2Eが成功しました。Times publication SHAは`33d3fe245f9a608cd937d56061e7391768ac8423`、Times runは`32209846895`、Site automatic sync commitは`901d7185c04468db369df9dae96e6c2cac527c3e`です。

Times dataは次の経路で自動配信されます。

`yzrs-times` → `times-delivery` artifact → workflow dispatch → `yzrswork-site` receiver → Fail Closed validation → Site-owned `public/data/`

`SITE_SYNC_ENABLED=true`です。`/times/`が唯一の通常Times UIかつcanonical URLで、`/evening.html`は`/times/`へ転送するlegacy compatibility pageです。Timesの生成、AI処理、scheduler、Production publishingは`yzrs-times`に残します。

## 5. Cloudflareで最終的に変更が必要な項目

承認済みの別タスクでのみ、対象を明示して確認します。

- Project / Worker / Pagesの採用方式
- assets directory
- custom domain binding
- DNS / Route / Worker Route
- ProductionとPreviewの分離
- rollback先と確認時間

本Repositoryには上記を自動実行する設定を置きません。`wrangler deploy`、`wrangler pages deploy`、Cloudflare API、Token、Account ID、Secretsの利用はこのタスクの範囲外です。

## 6. DNS / custom domainの注意

`yzrswork.com` は現行Productionのcustom domainです。Shadow Repositoryへcustom domainを追加せず、DNSやRouteも変更しません。現行 `yzrs-times/wrangler.jsonc` の `routes` を新Repositoryへコピーしないでください。

## 7. Rollback procedure

本番切替タスクで問題が発生した場合は、新site側の変更を止め、既存 `yzrs-times` を配信元として再確認します。現行Repositoryを削除・移動しないことがrollback可能性の前提です。

Shadow Migration自体のrollbackは「何もしない」です。現行Productionに変更を加えていないため、既存配信元へ戻す操作は不要です。

## 8. Verification checklist

- [x] Cross-Repo Delivery D v0.1の実装とIssue #80のgenuine automatic Shadow E2Eを確認
- [ ] Shadowの`npm ci`が成功
- [ ] `npm run build`が成功
- [ ] `npm run check`が成功
- [ ] `git diff --check`が成功
- [ ] `/`、`/about/`、`/privacy/`、Guide、LP-01をローカルHTTPで確認
- [ ] LPを390 / 430 / 768 / 1440pxで確認
- [ ] LPが`noindex,follow`でsitemapに入っていないことを確認
- [ ] secret scanが成功
- [ ] verify-only CIにDeploy / Cloudflare / scheduled publishingがないことを確認
- [x] `/times/`をcanonical UI、`/evening.html`をlegacy compatibility redirectとして確認
- [ ] Cloudflare変更がOwner承認済み

## Gate

`CUTOVER_READY = false`

Owner review、Preview相当の安全な検証方法、rollback条件、Cloudflare変更承認が未完了のためです。
