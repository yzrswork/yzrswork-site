# Architecture

## Repository responsibility

`yzrswork/yzrswork-site` は `yzrswork.com` 本体の静的サイトだけを扱うShadow Repositoryです。

担当範囲:

- Top
- Guide
- LP
- About / Privacy
- Analytics
- ads.txt / robots.txt / sitemap.xml
- OGPと本体サイト共通asset
- 本体サイトのbuild/check

`yzrswork/yzrs-times` は、引き続きProduction配信元であり、YZRS Times生成エンジンです。Timesのprompt、source収集、scheduler、edition生成、AI処理、publish workflowは移しません。

## Source and generated output

Guideのsource of truthは `content/guides/*.md` です。`npm run build` により `public/guides/*/index.html` を生成します。生成HTMLを編集してsourceに戻す運用はしません。

本体サイトの固定HTMLは、現在のProductionサイトからCOPYした移行対象です。LP-01は `yzrs-times` の未マージDraft PR #14のheadから取り込みました。

## Deferred Times dependency

現在 `/times/` は `yzrs-times` 側のProduction資産です。本Repositoryには `public/times/` を含めません。新RepositoryをProductionに昇格するには、Timesの生成結果をこのRepositoryへ渡すcross-repo publishing設計が必要です。

候補は次のとおりです。

1. `repository_dispatch`
2. reusable workflow
3. GitHub APIによるcommit
4. build artifactの受け渡し
5. Timesを別subdomainへ分離

このタスクでは候補の選定・実装を行わず、`CUTOVER_READY = false` とします。
