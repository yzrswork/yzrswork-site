# Analytics

## Shared analytics

`public/analytics.js` は既存Productionサイトと同じGA4 measurement IDを利用する共有scriptです。各ページは `/analytics.js` を読み込みます。

このMigrationでAnalytics基盤自体は変更しません。PII、cookie、localStorage、sessionStorage、個人識別用のevent parameterは追加しません。

## LP-01 events

LP-01は次の2イベントだけを送信します。

- `lp_view`: `lp_name=electronics_starter`
- `lp_guide_click`: `lp_name=electronics_starter` と `cta_position=hero|middle|final`

LPは `noindex,follow` であり、初期sitemapには含めません。実環境でのGA4受信確認はDeploy後のOwner Actionです。Shadow段階ではローカルHTMLとcheckでイベント名・導線・PII不在を確認します。
