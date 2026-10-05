# YZRS Site Renovation 2026 — Wave 0 / UI Contract v0.1

2026-10-05 JST。状態: **Wave 0 Owner承認済み。PR #46をmergeし、Wave 1 Global Foundationへ移行。**

結論: 現行の静的HTML / CSS / Vanilla JSを維持し、小さな共通Visual Languageを明示的に導入する。本体SiteとAppsは別Repository・別build・別配信であり、DEALS / NavigatorをSiteへ移管しない。まずSiteのGlobal Foundationを整え、次にAppsのDEALSで表示規則を検証する。Times、出版物、AR/game、入力・計算ロジックはDomainとして保護する。

## Audit basis

| 対象 | 確認したAuthority / revision |
| --- | --- |
| Site | `yzrswork/yzrswork-site`, `main = c0275557e7ab87d71f8fc0b141401a91da487cee` |
| Apps | `yzrswork/yzrswork_apps`, `main = 84aae04a72a01206ab17c7f3c11fe0b0ea053fe0` |
| Site作業 | `codex/site-renovation-wave0-20261005`。作成時 `HEAD == origin/main`、cleanを確認 |
| Apps作業 | 最新mainの隔離archiveで監査・check/test。既存checkoutのbranch / 作業ファイルは変更なし |
| Production補助確認 | 公開 `/deals/`, `/kit/` をread-onlyでrender。配信HTMLとGit revisionの同一性は未証明 |
| 限界 | iPhone Safari実機、installed PWA、実Amazon取得、KV/Cron、全29ページの視覚検証は未実施 |

Site checkoutのfetch refspecが過去のfeature branch限定だったため、`refs/heads/main:refs/remotes/origin/main` を明示して取得した。古いtracking refだけを最新mainと扱っていない。以後のWave開始時にも最新main・clean・ancestry・基点一致を確認する。

以下の実装根拠は固定revisionのファイルを指す。[Site tree](https://github.com/yzrswork/yzrswork-site/tree/c0275557e7ab87d71f8fc0b141401a91da487cee)、[Apps tree](https://github.com/yzrswork/yzrswork_apps/tree/84aae04a72a01206ab17c7f3c11fe0b0ea053fe0)。`Site:` / `Apps:` のpathはそれぞれのRepository相対。

## 1. Current Architecture

### Site

- Cloudflare Workers BuildsがSite `main`を配信。Worker名は引き続き `yzrs-times`。名称からTimes生成Repositoryと誤認しない。根拠: `README.md:21–34`, `.github/yzrs-repository.yml:5–11`, `wrangler.jsonc:3–12`。
- `public/`の静的HTMLが中心。framework、shared layout / header / footer partial、CSS bundler、component libraryはない。
- `npm run build`はGuide HTMLとsitemapだけを生成する。Guideは現時点では1つのslugを固定した専用generatorであり、汎用記事CMSではない。`scripts/build-site.mjs:7–9`, `scripts/build-guide.mjs:6–9`。
- GuideのAuthorityは `content/guides/hajimete-no-denshi-kousaku-starter-guide.md` と画像manifest。出力HTMLは手編集しない。header / footer / stylesもgenerator内にある（`scripts/build-guide.mjs:240–251`）。現在のMarkdown parserはraw HTML / detailsを解釈しないため、Markdownへタグを追加するだけではdisclosureにならない。
- TimesのUIはSite-owned、生成・編集・canonical issue contentは `yzrs-times` owned。`public/data/`は受信snapshotとsync state専用。174 issue JSON、全182 JSONを確認。
- Times receiverはJSON-only、provenance / ordering / archive preservationをFail Closedで検証する。UI改修にreceiverやTimesデータを混ぜない。
- `docs/migration.md` / `docs/cloudflare-cutover.md` の旧Shadow記述は歴史記録。現在のProduction ownershipはREADMEとRepository Stateを優先する。

### Apps / Commerce

- Tools / Navigator / DEALSは `yzrswork_apps` 管理。Siteから外部リンクで接続する。Site buildの対象ではない（`Site:docs/architecture.md:22–27`）。
- 公開Toolsは13: `kit`, `bench`, `handa`, `pinout`, `haisen`, `mem`, `hdd`, `build`, `usbc`, `fixit`, `glue`, `nurerukun`, `neji`。root、about、privacy、DEALS、および旧URL relocation stubもある。
- Appsはcommit済み静的出力を公開。`app.json`, `site/catalog.json`, `scripts/build.mjs` とhandwritten CSS/body/JS、生成marked regionを区別する。
- 推薦Authorityは `site/catalog.json → site.affiliate.products`。六つのapproved productとeditorial orderを維持。`affiliate.js`, `shared/commerce-config.js`, `workers/commerce-api/generated-products.js`は生成projection。
- Commerce Workerは実稼働設定。現在の取得resourceはOffersのみで、画像resource / normalized image field / browser image表示は存在しない。画像はCSS追加だけで済まない。
- 本体Site、Apps、Times sender、VaultのAuthorityをまとめ直す工事は行わない。

### Current shared styles / duplication map

| Family | Existing source / duplication |
| --- | --- |
| Site Top / Guide / LP | `public/index.html:52–810` / `scripts/build-guide.mjs:240` / `public/lp/electronics-starter/index.html:19–192` の独立inline CSS。Top shell1240/inner1120px・breakpoint920/680、Guide shell1240/TOC250px・840/540、LP850/560。palette・header・CTAの共通partialなし |
| Site About / Privacy | 各HTML `:12–21` のほぼ重複した720px serif reading rules |
| Site Times | `public/times/index.html:17–564` の独立newspaper CSS、720px container・600px/print対応 |
| Public work sheets | 8ページのinline CSS。7ページは画像ratio以外ほぼ同一、IM-1はcontainを追加。generated source境界を先に確認 |
| Secret e-ZINE | `public/secret/jy26-k7m4q9/style.css` を11ページで共有。44px以上のlinks、focus、native detailsを既に持つ |
| Labs | multi-target / pdb-1の各 `style.css`、vault-inspectionの `style.css` / `visual.css`、計4 local CSS。各app/visual JSで固有状態を制御 |
| Apps | `shared/tokens.css:4–22` のpaper/ink/rust/type token＋`:24–79` のrelated-links。各Toolのlayout/buttons/warnings/headerは主にinlineで重複。`shared/commerce.css`はDEALS専用 |

## 2. Current UI Problems

| Finding | 現在の根拠 | 提案Wave |
| --- | --- | --- |
| 共通Visual Languageが未成立 | Top、Guide、LP、About/Privacy、Timesでpalette/type/nav/button vocabularyが別。Site-wide CSSなし | 1、5 |
| Guide 320pxで横はみ出し | Chromium実測 `scrollWidth=337px` / viewport 320px。本文とTOCが353px幅に拡張し左へもはみ出す。`scripts/build-guide.mjs:240` のmobile `1fr`とmin-content / 長いURLが関係 | 1 |
| 主要tap targetが不足 | Top mobile nav 36px高、Guide header links 25px高、Times Heat summary 19px高・保存26px高を実測。本文内inline linkは別扱い | 1、5 |
| Topの初見導線が長い | 5つのmobile nav枠、Hero、INDEX、説明を経て主な作業へ進む。INDEXの項目自体はリンクではない。Hero前のheaderが大きい | 3 |
| 情報の視覚的重要度が近い | Topの多いsection罫線 / mono label、DEALSの長い根拠と仕様を全展開。gridが全文字領域に続く | 2、3 |
| Provenanceがtitleから離れる | DEALSはtitle→use→長いreason→provenance、memはprovenance→Evidence説明→title→recommendationReason。`Apps:scripts/build.mjs:877`, `mem/index.html:366` | 2、4 |
| DEALS導入文と個別Authorityが矛盾 | 導入文は「実使用・実測は未確認」、FX600A / PAW-01 / SD-83は「実使用」。`Apps:deals/index.html:62` | 2 |
| DEALSの案内語が不正確 | kitを「PC装備ナビ」と表示。kitは電子工作・工具。`Apps:deals/index.html:63` | 2 |
| SD-83のSafetyがspecと混在 | DEALSには全注意が既に常時表示されるが仕様段落に混在。kitの独立ITEMSには同じ注意が伝播しない | 2、4 |
| Evidenceの入口が不統一 | DEALSはmanufacturerのみをrenderし、canonicalのrelatedArticlesを未表示。mem resultはcatalog evidence URLを未表示 | 2、4 |
| Focusが局所的 | Top / Guide / About / Privacyに共通focusなし。Apps related-linksはoutlineを外しcolor/borderで表示 | 1、2、5 |
| 適用前のcoverageに穴 | Site static checkのfull HTML対象は9ページ＋Times/Evening専用check。全work/secret/labの同等チェックではない | 各Wave |

Guideの原因切り分けでは、ブラウザ内だけに `minmax(0,1fr)`, child `min-width:0`, URL `overflow-wrap:anywhere` を追加すると `337→320px`になった。これは原因を絞る一時probeであり、Repositoryへ修正は保存していない。実装時は375px以上のTOC / desktop sticky挙動も回帰確認する。

## 3. What Must Stay

- Brand: **「思いつきを形にして、次に使える形で残す。」** / 作る。直す。仕組みにする。記録する。
- warm paper、dark ink、rust-orange、図面・工房・技術記録の人格。gridはHero / 図面領域等へ必要に応じて限定できる。
- URL、canonical、title / description / OGP、robots、sitemap対象、structured data、redirect、analytics、affiliate tag / approved URL、既存Tool logic / public API / Evidence / recommendation data。
- Top `?issue=` → `/times/` redirectのquery/hash保持。`Site:public/index.html:36–44`。
- `yzrs_ref` route、delegated `tool_link_click`とpayload。Guideのaffiliate `sponsored nofollow noopener`と開示。LP `hero/middle/final` CTA event位置。
- Times issue fetch / clipping / print / storage keys / editorial HeatはDomainとして維持。
- Appsのno-buy、候補決定後のAmazon導線、item IDs、`kit:owned`, `kit:cart`, `kit:hideOwned`。全Navigatorがcatalogを読むと仮定しない。
- 六つのapproved recommendation / editorial order。安さによる推薦変更、SearchItems推薦、自動商品追加、historical low、price ranking、countdownを導入しない。
- **SALE = Active Deal OR (Savings ≥10% AND Savings ≥¥500)**。既存のfreshness / valid-offer / approved-product条件も維持する。既知のfuture/expired DealをSavings経由で復活させない。
- Commerce取得不能時もrecommendationとapproved通常CTAを維持。stale/expiredの価格とSALEは非表示。Recommendationの可否をAPI / KV / 価格で決めない。

JUNK YARDの8 public work sheetsはVault snapshot由来の `GENERATED DERIVATIVE`。11 secret e-ZINEは出版物の派生artifactで、SiteのGit history `1decf4f`にもVault Authority SHAからのsyncを明記している。UI統一のためにSite出力の本文を編集しない。後続Waveでもsource ownership / Freezeを先に確認する。

## 4. Global Primitives

共通化するのは**見た目と情報の役割**。`yzrs-` prefix等でopt-inし、既存 `.card`, `.button`, `.warning`, global `h1/a/button/details`へ無差別に上書きしない。

| Primitive | UI contract |
| --- | --- |
| Typography | 本文は読みやすいsans、技術値/短いcodeはmono、serifは工房signature / Times editorial用途。monoを長い日本語本文へ使わない |
| Spacing / container | 4px系の小さなtoken、responsive gutter、読み物68–72ch / utility最大1120pxの別幅 |
| Separator / surface | groupの境界だけに罫線。通常itemは下separator、surfaceは注意・補足など意味のある領域へ限定 |
| Button / CTA | 各判断groupでprimaryは原則1つ。secondaryはink outlineかtext。主要controlはmin-height 44px、labelをwrap |
| Text link | 本文linkを識別できるunderline。下線をhover時だけに限定しない。inline linkへ一律44px blockを強制しない |
| Status / metadata | statusは意味のある状態のみ短く表示。specはplain text、日付等はsubdued metadata |
| Provenance | title直下に「実使用」「仕様から選定」等の短いlabel＋必要なら根拠入口。日付より認識しやすく、巨大badgeにしない |
| Warning / critical | textで危険を特定し、必要な即時行動を常時表示。色＋文言＋境界で示す。details内だけに危険を隠さない |
| Native details | summaryは内容を表す「詳細・選定根拠を見る」等、44px以上。keyboard / visible focus / open stateを維持 |
| Empty / unavailable | 理由と次の行動を短く示す。commerce unavailableとrecommendation unavailableを別に扱う |
| Page / section header | 何か→対象/用途→次の行動。titleをline-clampしない。section headingは読み順と階層を一致させる |
| Responsive / focus | mobile基本single column、長い英語・型番は自然wrap。子要素 `min-width:0`、必要なURL break。focus ringとreduced-motionを定義 |

全primitiveを汎用JS component化しない。contractはWave 1で定義し、必要な小さなCSS classを実ページへの採用と合わせて用意する。独自accordion JSは原則不要。

## 5. Domain-specific Primitives

| Domain | 共通表示へ寄せるもの | 固有のまま残すもの |
| --- | --- | --- |
| DEALS | Item Row、provenance、warning、details、CTAのgrammar | offers、freshness、SALE、ASIN照合、通常Amazon CTA、commerce unavailable |
| Navigator | 結果title / use / spec / match / warning / Evidence | input、選択順、計算、compatibility判定、no-buy、候補承認、storage / PWA |
| Guide / Article | page header、reading width、link、metadata、warning | TOC、本文/画像Authority、article context、source/evidence構造 |
| Times | focus、control hit target、必要なbase color/spacing | newspaper serif、edition、Heat、clipping、print、data fetch / reader state |
| Projects / Parts / Downloads | status、metadata、用途、補足のdisclosure | project状態の意味、quantity/purpose、format/version、安全・license条件 |
| Exhibition / secret / Lab | 必要に応じたaccessibilityのgrammarのみ | 出版構成、Freeze、AR/camera/game layout、state、操作 / performance |

`YZRS Item Row`は構造の共通契約であり万能componentではない。Navigatorのmatch、DEALSのcommerce、Partsのquantity、Articleのused-inを単一巨大schemaへ統合しない。kit `used/article/spec` とcommerce `used/article/specification` も表示時に解釈し、enumを一括変更しない。

## 6. Proposed Visual Language v0.1

**Modern Maker / Tool UI**: 紙の温度、黒い活字、錆色の判断点。薄い罫線でgroupを区切り、余白とtypeの階層で情報を整理する。角丸は控えめ、card wall / badge farm / 全面gridを増やさない。

提案token（未実装。採用時に実際のbackgroundとのcontrastを確認）:

| Role | v0.1 candidate |
| --- | --- |
| paper / raised surface / desk | `#f0ebe3` / `#f6f1e8` / `#e6dfd0` |
| ink / muted / separator | `#1c1a16` / `#6f675b` / `#c8bfae` |
| accent | `#b5451b`。Topのrust-orangeを基準。warning severityは文言と構造でも識別 |
| body / small / heading | 16px、補助14pxを基本。短いcode等は必要に応じ12px。H1 `clamp(28px,4vw,44px)`、line-height 1.3–1.5、本文1.7–1.85 |
| space | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px。意味の近さに沿って選ぶ |
| gutter / widths | mobile16–20px、desktop24–40px。reading68–72ch、utility1120px、shell1240px |
| focus / controls | 2–3px outline＋offset、通常文字4.5:1 / WCAGの大きな文字3:1を確認。主なcontrolは44px以上 |

### Information depth

1. **First**: 何か / 自分に合うか / compatibleか / critical hazardと即時行動 / provenance / 次の行動。
2. **Second**: 理由、secondary precautions、full spec、選定条件。native details等で開く。
3. **Deep**: Evidence、manufacturer、元記事、full source。既存リンクを保持し、現在データにある入口は必要に応じ表示する。

DEALS desktopの構造案:

```text
optional thumbnail | Product title              | Commerce
                   | Provenance → Use → Spec    | fresh price / gated SALE
                   | Compatibility / Safety     | approved Amazon CTA
------------------------------------------------------------
詳細・選定根拠を見る ▼ （開いた内容はrow全幅）
```

mobileではthumbnail＋title/provenanceを上段に置けるが、spec / warning / commerceは下にstack。thumbnailがなくても同じ判断順を維持する。商品名と型番をclampせず、画像にAuthorityを担わせない。

SD-83: first layerに **「鉛を含みます。換気して使用してください。」** のようなhazard＋immediate action。second layerに既存の「作業中に飲食しない / 作業後は石けんで手を洗う / 高温の溶融はんだに注意」。catalogの内容を保持して適切な位置にrenderする。危険の唯一の表示をdetailsへ移さない。

### Creators API Primary Image: conditional design only

公式公開資料で確認したresourceは `images.primary.small/medium/large`、responseは `url/height/width`。[Images](https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/api-reference/resources/images)。現在のpipelineでは未取得。

- 画像本体を保存/cacheしない。画像URLは最長24時間という公開条件がある。repo / R2 / 自サイトCDNへ画像を保存する設計は採用しない。[日本向けAPIライセンス §4(n)](https://affiliate.amazon.co.jp/help/operating/paapilicenseagreement)
- resourceの1日TTLは画像byte保存の許可でも、URLの技術的な失効時刻でもない。設計上は独立した取得時刻を持ち、許容保存期間超過後は非表示、更新失敗時にstaleを延命しない。また利用不可通知を受けた場合、またはAmazonで表示されなくなった場合は速やかに削除・非表示にする。[公式運用資料](https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/concepts/best-programming-practices)、[APIライセンス §4(g),(n)](https://affiliate.amazon.co.jp/help/operating/paapilicenseagreement)
- 公開licenseはAmazonへの送客目的と関連商品へのlink条件を持つ。「認識補助だけでAmazonへ結び付けない」利用はこの条件と整合しない。画像の利用箇所は当該商品のAmazon詳細ページ等にのみリンクさせ、推薦判断には用いない。[IPライセンス](https://affiliate.amazon.co.jp/help/operating/policies/)
- 縦横比を保つresizeは確認できるが、crop/加工の包括的許可は確認できない。`object-fit:contain`相当を候補にし、既存のアソシエイト開示を維持。[APIライセンス §4(f),(g)](https://affiliate.amazon.co.jp/help/operating/paapilicenseagreement)、[参加開示](https://affiliate.amazon.co.jp/help/node/topic/GPXFHVYZMTGPUMPE)
- 日本のCreators API license案内は旧PA-API名のURLを案内している。一部公式URLの閲覧ではUS英語本文になる挙動があった。日本語公式検索本文と24時間規則は照合したが、**適用版の完全取得、対象account / marketplace / 登録Siteへの個別適用は未確認**。[locale別案内](https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/license-agreement)

従ってWave 2の最初のUI PRは画像なしで成立させる。画像を追加する場合は、日本の適用契約を確定し、resource→normalization→snapshot→public payload→expiry→displayまでを別の明示scopeでreviewする。画像の「利用可能」をPASSにせず、no-image pathを先に検証する。既存offerの60分freshnessとimageの保存上限を混同しない。

## 7. Page Migration Map

Siteの実inventoryは**29 HTML、14 inline style、5 external CSS、5 external JS**。実在しないindexやParts/Downloadsを既存ページとして扱わない。

| 実在route / family | Count | Source / ownership | Migration |
| --- | ---: | --- | --- |
| `/` | 1 | `public/index.html` handwritten | Wave1 style/header foundation、Wave3 IA |
| `/about/`, `/privacy/` | 2 | 各 `public/*/index.html` handwritten | Wave1 base adoption、Wave5 footer/nav refinement |
| `/guides/hajimete-no-denshi-kousaku-starter-guide/` | 1 | Markdown＋`scripts/build-guide.mjs`→generated HTML | Wave1 foundation / overflow、後続は必要な箇所のみ |
| `/lp/electronics-starter/` | 1 | handwritten、`noindex,follow` | Wave1 style/focusのみ。CTA実験flowは保護 |
| `/times/` | 1 | Site UI、受信JSONからrender | Wave5 readability / controls。editorial layout/behavior維持 |
| `/evening.html` | 1 | compatibility redirect、canonical Times | 見た目の移行不要。全Waveでredirect保持 |
| `/junkyard/works/{compo-1,im-1,mo-1,pdb-1,spev-1,string-1,volt-1,yzrs-neon}/` | 8 | Vault snapshots由来generated derivative | Wave1–4除外。必要ならWave5でsource/Freeze確認から |
| `/junkyard/lab/{multi-target,pdb-1,vault-inspection}/` | 3 | 各local CSS/JS、AR/camera/game Domain | blanket適用なし。必要な個別accessibility review |
| `/secret/jy26-k7m4q9/`, `.../thanks/`, `.../works/{mo-1,compo-1,pdb-1,im-1,volt-1,string-1,yzrs-neon,spev-1,tiny-cafe-neon}/` | 11 | frozen-source e-ZINE derivative / shared local CSS | 除外。secret導線を公開Topへ追加しない |
| Apps `/deals/` | 1 | `scripts/build.mjs`＋handwritten外側＋commerce CSS | Wave2。別Apps PR |
| Apps `/kit/`, `/mem/`, `/handa/`, `/hdd/`, `/build/` | 5 | 各handwritten result renderer＋generated head/SW | Wave4。1–2 routeずつ検証 |
| Appsのその他8 published tools | 8 | 各app固有logic/PWA | 効果が確認できた箇所だけ後続適用 |
| Apps `/soubi-navi/`等legacy / retired stubs | 別管理 | relocation / cache cleanup | UI統一のために移動・削除しない |

独立した `/guides/` index、article index、Evidence/Parts/Downloads/dashboardの一般ページはSiteに現在存在しない。GuideはTop `#guides`、記事はTimes / 外部noteにある。将来の増設は本工事の必須deliverableに含めない。

現在のsitemapは固定9 URL（5 main indexed pages＋4 public works）。LP、secret、他work/lab等のindexing差異は現行契約として保護する。renovationを理由に自動discoverへ変更しない。

## 8. Wave 1–5 Plan

各Wave: 最新mainの現状確認 → allowlist内の最小実装 → validation → regression → diff review → PR → **Owner review / approval**。次Waveの大規模実装とmergeは明示承認前に進めない。

| Wave | Scope / deliverable | Acceptance / gate |
| --- | --- | --- |
| 1 Global Foundation | Siteの小さなCSS token / primitive、Top style-only、About/Privacy、Guide template、LP style-only。Guide320px改善、focus/controlサイズ | URLs/content/SEO/events unchanged、generated idempotence、6 viewport baseline比較。Appsへruntime CSSをcross-origin配信しない |
| 2 DEALS pilot | 別Apps PR。六商品保持、3指定商品でspec/use/safety検証。Structured Utility Row、title直下provenance、critical warning、native details、intro/nav矛盾修正 | SALE / Fail Closed / CTA / Evidence保持。価格なし経路から開始。image pipelineは条件確定後の別scope |
| 3 Top | Hero→Primary paths→Current/Featured→Workshop/About。INDEXの役割を整理、反復説明/罫線を減らす | 初心者が何のサイト・何ができる・次の行動を数秒で把握。既存深いTool/Guide/note/Timesへの到達維持 |
| 4 Navigators | 初回kit/mem等1–2 routeの結果表示のみ。学習したrow grammar、warning / evidence入口 | input/logic/state/no-buy/PWA保持。owned/cart復元、選択後Amazon、generated SW整合、compatibility判断不変 |
| 5 Remaining | Times controls、footer/secondary nav、既存Guide/read surfaces等に有効なprimitiveだけ適用 | publication/AR/secretは独自review。存在しないindexを統一目的で増設しない |

Top Primary paths候補は現行導線に合わせ **「作業に使う / 道具を選ぶ / ガイド・記事を読む / 制作・修理を見る」**。電子工作 / 自作PC / DIY・模型はsecondary filter/contextに残す。これはIA案であり、新URLや推薦入口、analytics routeの追加を既に承認済みと扱わない。

### Wave 2 / 4 exact Apps source boundaries

Wave2候補: `shared/commerce.css`, 必要な限定拡張の `shared/tokens.css`, `scripts/build.mjs:871–880`, `deals/index.html`の生成region外、`tests/commerce/catalog.test.mjs`, `tests/commerce/regression.test.mjs`。生成regionはbuildで更新する。UI-onlyでは `shared/commerce-policy.js`, Worker / auth / KV / normalized offer / catalog recommendationを変更しない。

Wave4の主なrenderer: `kit/index.html:547–583,623–639`, `mem/index.html:318–370`, `handa/index.html:596–629,656–705`, `hdd/index.html:381–407,438–481`, `build/index.html:363–413`。各CSSもそのroute内で限定する。PWAのasset/cacheを変える場合はsource `app.json`のassets/swVersionからhead / manifest / SWを再生成し、直接編集しない。SD-83のkit safety不足はcatalogが自動解決しないため、そのWaveで独立ITEMSと既存Authorityを照合して取り扱う。

## 9. Regression Risks

| Risk | Control |
| --- | --- |
| global resetによるTimes/Lab/出版物破壊 | namespaced opt-in。Wave1除外pathをdiffで確認 |
| Guide手編集/非決定的build | generatorだけ編集、2回buildで意味のあるdiffが増えないこと。receiver workflowは `public/data/`以外のbuild差分も監視 |
| overflowをhiddenで隠す | scrollWidthに加えてchild bounds / clippingを確認。`.site overflow:hidden`、LP body overflow-x:hiddenをPASS根拠にしない |
| 手動CSS parityのdrift / cross-origin依存 | 小さな共通contractと同値tokenを各repoが所有。CDN CSS依存・新packageは初回に導入しない |
| Appsの既存freeze test | `tests/commerce/regression.test.mjs:15–21`はtokensと全non-mem app HTML等をorigin/mainとbyte比較。意図した変更pathだけ狭く更新し、無関係pathのfreezeを維持 |
| statusとprovenance / safetyの混同 | provenance title直下、spec plain text、safety専用text block、SALEはgate後のみ |
| detailsで重要条件を隠す | hazard＋即時行動、主要compatibility、provenanceは常時。根拠/二次注意を開く |
| 単一商品pilotで他商品を失う | six products / ASIN / approved URL / editorial orderを比較。pilot三商品だけへcatalogを縮めない |
| price/image障害が推薦を巻き込む | economic/image slotだけ無効化。recommendation / ordinary CTA保持。imageは独立期限 |
| PWA stale asset / browser state破壊 | app.json→再生成、install/update/offline、owned/cart/no-buyを確認。DEALSをPWA/cache対象へ加えない |
| SEO/analytics / LP experiment変更 | before/after抽出比較。新route/refが必要ならmigration impactを先に報告 |
| 既存依存のaudit警告 | Site `npm ci`でhigh 4件。dev dependency Wrangler/miniflare/sharp/undici系。既存結果として記録、UI Waveへ更新を混ぜない |

## 10. Exact Files Expected to Change in Wave 1

提案allowlist（Owner review前の見込み。増やす必要があれば理由と影響を先に報告）:

| Exact Site path | Purpose |
| --- | --- |
| `public/styles/yzrs-ui.css` **NEW** | 小さなtoken、opt-in base/primitives、focus / responsive grammar |
| `public/index.html` | stylesheet接続、token alias、type/focus/header target。IA/本文の並べ替えはWave3 |
| `public/about/index.html` | base adoption、読み幅/type/focus、必要なskip導線 |
| `public/privacy/index.html` | 同上。本文 / 改定日 / title維持 |
| `public/lp/electronics-starter/index.html` | style/focus/token接続のみ。CTA/実験event/flow維持 |
| `scripts/build-guide.mjs` | templateのstylesheet/token接続、Guide shrink/wrap/target対処。本文parserの機能追加は含めない |
| `public/guides/hajimete-no-denshi-kousaku-starter-guide/index.html` | 上記から再生成のみ |
| `scripts/check-public.mjs` | foundation asset/link存在checkと対象routeの契約維持。既存checkを弱めない |
| `docs/site-renovation-2026-wave0.md` | approved contract / 実測validationの追記 |

禁止側: content Markdown / image manifest、recommendation/catalog、Times JSON/UI logic/receiver/workflows、analytics.js、wrangler/package files、robots/sitemap、public works、secret、labの変更。buildで同一sitemapのline endingだけ変わる場合はcommitしない。

## 11. Validation Plan

### Executed Wave 0 baseline

| Check | Actual result / scope |
| --- | --- |
| Site npm ci | completed。依存audit high 4件は上記既存finding |
| Site build / check | PASS。required files / SEO / links / assets / analytics / policyの既存scope |
| Site npm test | PASS **22/22**。fixture-based Times delivery receiverのみ |
| Site build diff | Guide/sitemapのWindows line-ending statusのみ。`git diff` / `--numstat`に意味のある差分なし。自分のbuild出力のみrestore |
| Apps npm run check | PASS。13 published / 12 managed / 11 retired / 51 SW、generated driftなし（isolated latest-main snapshot） |
| Apps npm test | PASS **97/97**。SALE/freshness/outage/offline/BFCache/public scope/allowlist/KV等の既存commerce suite |
| Site Chromium | Top / Guide / About / Privacy / LP / Times ×320/375/390/430/960/1200 = **36 render samples**。Guide320のみ17px horizontal overflow。その他sampleはdocument overflowなし |
| Apps Chromium | latest-main snapshot DEALS / kit ×同6幅 = **12 samples**。document overflowなし。local originではCommerceが無効、economic slot非表示。価格表示なしの静的推薦・通常CTAを確認したもので、障害時fallbackの視覚検証ではない |
| Production補助render | 公開DEALS / kit ×同6幅 = **12 samples**。document overflowなし。実API lifecycle / Git一致の証明ではない |
| Keyboard smoke | Guide最初のTabでskip-linkとfocus-visible確認。Times native Heat summaryは初期open→Enterでclose→Spaceでopenを実測 |
| English stress probe | Top 320pxのvisible nav5項目を長い英語へブラウザ内のみ置換。document320px維持、label wrap、control57–79px。全page英語対応の証明ではない |
| Screenshot review | 実内容のTop390 / Guide320 / LP320 / DEALS390等を視認。Lorem ipsum不使用。派生画像・JSONはlocal `.tmp/visual-baseline/`に保持、commit対象外 |

renderはChromium desktop viewport、reduced motion有効、analytics/ads通信をblockして測定。WebKit/iPhone Safari実機と同一ではない。全29HTMLへのa11y auditやfull-commerce-state visual acceptanceをPASSにしていない。小さいinputのbounding boxだけではlabel全体のtap領域は判定できないため、kit checkboxをそれだけでFAILとはしない。

### Required for implementation Waves

- 最新mainを再取得し、承認scopeと差分を照合。Siteは `npm ci`, `npm run build`, `npm run check`, `npm test`, `git diff --check`。Appsは該当build/check/testを実行。生成を2回行い追加driftなし。
- 320 / 375 / 390 / 430 / 960 / 1200pxを実ページでrender。document/child overflow、title全文、long English/型番、primary/secondary control≥44px、warning/provenance、読み順、visible focus、Tab/Enter/Space、details open/closeを確認。
- heading / landmark / meaningful links、contrast、reduced motion、critical safetyがinteractionなしで読めることを確認。active-targetサイズとinline linkを区別する。
- changed pageのURLs、canonical、title/description/OGP/JSON-LD、robots、analytics route/イベント、approved Amazon URL/tag、Evidence/related sourceリンク、recommendation order、Tool/stateをbaseと比較。
- Site receiver build idempotence、Times query redirect/print/storage、LP3 CTA位置をscopeに応じ確認。変更していないものを全面PASSと表現しない。
- iPhone Safari実機とinstalled-PWAのgateは独立して記録。利用できない場合は未確認と明示し、Owner reviewへ残す。

### Wave 2 acceptance matrix

6 approved productsを保持し、Crucial DDR4 32GB（仕様/QVL）、HAKKO FX600A（実使用）、goot SD-83（実使用/鉛Safety）を重点確認する。

| Axis | Cases |
| --- | --- |
| Width | mandatory320 / 390 / 430 / 960 / 1200、補助375 |
| Commerce | Fresh+SALE、Fresh normal、Stale/expired、No offer/unavailable |
| Disclosure | Collapsed、Expanded（row全幅） |
| Image | unavailable（初回UI PRの必須）、available（契約・pipeline review後のみ） |

既存97テストの緑だけでこのvisual matrixをPASSにしない。fixtureのcommerceは通常web制約を尊重したテスト環境で再現し、画像available列が未実装なら明示して未完了とする。manufacturer/Evidence / relatedArticles、critical warning、no title clamp、keyboard、approved CTA、recommendation persistence、SALE境界を同時に確認する。

## 12. Recommended First Implementation PR

このWave 0は**docs-only PR**とし、上記contract / scopeをOwnerがreviewできる状態にする。

次の実装PR案: **`feat(ui): add scoped YZRS foundation and fix Guide mobile overflow`**（Site、Wave1、§10の9 paths）。全体IAを動かさず、既存Topのpaletteを基準にtoken / focus / target / readable typeを整え、Guide320pxの実測欠陥をgenerator側で直す。Site-wide利用可能な小さなprimitiveを用意し、除外Domainへ漏れないことを実証する。

Wave1承認後、DEALS UI pilotは別Apps PRへ進める。推薦・SALE・offer契約を維持したrow / disclosure / Safety / provenance改善を先にreviewし、Creators API画像は適用契約とpipeline/public-contractの別reviewを経る。

各変更の採用条件は二つ: **初心者が次の行動を前より早く判断できること。技術的に詳しい人が必要な情報へ辿れること。** 片方を満たさない変更は採用しない。


## Owner approval / Wave 1 gate

2026-10-05: Wave 0をOwner承認。PR #46をmergeし、Wave 1を開始する。

Wave 1は§10の9 path allowlistを維持する。TopのIA再編はWave 3、DEALS / Navigatorの表示変更はApps側のWave 2 / 4へ分離し、Wave 1ではSiteのscoped foundation、focus / tap target、reading base、Guide 320px overflow修正に限定する。想定外にdiffが広がる場合は同一PRへ詰め込まず、scopeを再確認する。
