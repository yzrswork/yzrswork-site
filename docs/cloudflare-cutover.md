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
- status: `SHADOW / NOT DEPLOYED`
- 本体サイト資産、Guide source/build、LP-01、verify-only CIを保持
- `wrangler.jsonc`、Cloudflare deploy script、Cloudflare workflow、Secretsは保持しない

## 3. 本番切替前の承認条件

次の全てが完了するまで `CUTOVER_READY = false` とします。

- Owner review完了
- URL parityとaccessibility確認完了
- Times cross-repo publishing方式の選定・検証完了
- Preview相当の安全な検証方法の承認
- rollback担当・時間枠・監視項目の合意
- Cloudflare変更の明示承認

## 4. Timesの未解決事項

現在 `/times/` は `yzrs-times` から配信されています。新RepositoryにTimesの自動生成・AI処理・schedulerをコピーしていません。

未解決候補:

- `repository_dispatch`
- reusable workflow
- GitHub APIによるcommit
- build artifactの受け渡し
- Timesのsubdomain分離

この文書では候補を決定しません。

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

- [ ] `yzrs-times` のgit status、PR #14状態、既存main SHAを記録
- [ ] Shadowの`npm ci`が成功
- [ ] `npm run build`が成功
- [ ] `npm run check`が成功
- [ ] `git diff --check`が成功
- [ ] `/`、`/about/`、`/privacy/`、Guide、LP-01をローカルHTTPで確認
- [ ] LPを390 / 430 / 768 / 1440pxで確認
- [ ] LPが`noindex,follow`でsitemapに入っていないことを確認
- [ ] secret scanが成功
- [ ] verify-only CIにDeploy / Cloudflare / scheduled publishingがないことを確認
- [ ] Times cross-repo publishing方式がOwner承認済み
- [ ] Cloudflare変更がOwner承認済み

## Gate

`CUTOVER_READY = false`

Owner review、Times cross-repo publishing、Cloudflare変更承認が未完了のためです。
