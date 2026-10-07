# Pilot C volt-1 — Human Review Card

判定: **CONDITIONAL PASS**。本文・写真・出典・build/check/testは完了。desktop / iPhone幅の実レンダリングは未確認のためDraft PR。マージ前に実画面確認が必要。

## 開始状態と変更範囲

- Site main: `68930bde460299301fb874174a5ffddd6e4e09ec`
- Vault evidence main: `aee565dd9f95faefb9b89d393e602797c0c0305a`（読み取りのみ）
- Apps Pilot A main: `9b831e8c5750d6180683741db52f71fc7677e20b`（読み取りのみ）
- Route: `/en/builds/volt-1/`
- Branch: `codex/wb05-pilot-c-volt1-20261007`
- Pilot A/BのHTML・写真・テストは変更していない。既存共有checkの対象リストとsitemapにPilot Cだけ追加。
- 現行mainに独立した `/en/index.html` は存在しない。A/Bと同様に `/` をhomeとする。ENトップ新設は対象外。

## 技術情報

壊れたALBA SPOONのケースを5V電圧表示へ転用する話を中心に、2線式自給電、アクリル固定、M2・スペーサー・接着補強、ラグ穴と銅線、配線、失敗、歴史的試験と展示acceptanceを分離した。

表示色はGREEN。型番・電圧範囲・精度・電流の古い内部メタデータは採用しない。ドリル破断原因、時計故障の機構、10/4の詳細電圧、単体電流、効率、突入電流、保護閾値、キャリブレーション、他部品の適合寸法、導体仕様は不明のまま。

## 数値と出典

| 本文の値 | 意味 | 出典・限界 |
|---|---|---|
| W620-4140 | 実際のドナー識別子 | 4/24公開JP記事。発売年・100万個販売との個体モデル同一性は主張しない |
| 2線式 | 電圧計の給電兼測定トポロジー | Owner承認brief / 現行work説明。正確なSKUは未確定 |
| 5 V / 5V MAIN | 初期給電・現在の系統・再現記事の対象電圧 | JP記事、現行work JSON、展示記録。精度・供給能力の定格ではない |
| 約5.1X | 初期USB給電時の表示 | JP記事。Xを特定数値で埋めない。校正結果ではない |
| 2 mm | 実際の黒アクリル厚 | JP記事、4/16 fabrication記録。代替品へ一律要求しない |
| M2 | 使用ビスの呼称 | JP記事、archive。長さ・本数は補完しない |
| 0.6 mm | ケース固定用銅線径 | JP記事。電気的要求・導体定格に転用しない |
| 1 mm → 2 mm | 折れたビットと継続に使用したビット | JP記事。原因・万能な推奨径は未確定 |
| 76 × 100 × 12 mm | 完成作品の現行展示寸法 | junk-yard-2026.json / editorial bundle。ドナー寸法ではない |
| 約2–3時間 | volt-1を含む本番構成の連続運転 | AR-03 10/4 log / acceptance checklist。単体耐久・実験室資格ではない |
| 2026-04-24 / 2026-10-04 / 2026-10-07 | 公開記事 / acceptance / EN適応日 | JP frontmatter / AR-03 log / 今回作業日 |
| PI01–PI06、PDB-1、SPL-2、volt-1 | 要求・作品・接続口の識別子 | brief / 現行work記録。電気定格を表す値ではない |

写真HTMLのintrinsic pixel寸法は、実ファイルから取得。finished 672×896、donor 1920×1547、drilling 1920×1440、mounting 634×476。レイアウトCSSのpxは表示上の制御であり実物測定値ではない。

## Product Resolution

| Intent | 実際に使用 | US再現要件 | US候補 / 検証 / fit |
|---|---|---|---|
| PI01 | ALBA SPOONケース＋小型銀色フレーム | 使用可能な開口・後部空間・加工可能材質 | SKUなし。他の廃小型ケースは設計例のみ、未試験・fit未確認 |
| PI02 | 緑2線式小型DC電圧計 | 自給電、約5V動作・可読表示、実寸適合 | SKUなし。正確な型番を確認できないため同等品主張なし |
| PI03 | 2mm黒アクリル | 絶縁、厚み、剛性、クリアランス | SKUなし。別絶縁板は設計例のみ、未試験・fit未確認 |
| PI04 | M2・スペーサー・ホットグルー補強 | 個体に応じた固定と高さ調整 | SKUなし。重荷重の主固定として一般化しない |
| PI05 | 0.6mm銅線 | 安全な機械的ケース保持 | SKUなし。電気要求ではない |
| PI06 | 初期USB 5V、現在PDB-1経由 | 選択した計器に対応する5V DC | SKUなし。PDB-1不要、代替電源の実機試験なし |

US候補製品は未掲載。確認できないSKUを弱くマッチさせるより、再現仕様を維持するbriefの選択肢を採用。製品候補の外部性能情報は導入していない。アフィリエイトなし。

## Visual Evidence

全写真の公開元: https://note.com/yzrswork/n/nf4fd6d490cdb 。ローカル基準: `public/en/builds/volt-1/assets/`。

| 元URL（assets.st-note.com/img/以下） | 保存名 | 配置・目的 | 加工 / 限界 |
|---|---|---|---|
| 1777005105-s3djINk71yeQZt8OoxbMmwD5.png | finished.png | Opening、完成・緑の動作表示 | byte-for-byte。既存文字入り原画像のまま。校正証拠ではない |
| 1777004245-XLElrjMA56BxueZOWg7nD8cw.jpg | donor.jpg | Donor、分解した腕時計・残した丸窓 | byte-for-byte。モデル識別は本文の記録による |
| 1777004276-yl9O8eaNB21rX6zS5YJgFKkP.jpg | drilling.jpg | Lug retention、加工箇所 | byte-for-byte。折れたビットや原因は写真で立証しない |
| 1777004296-DvpdMbAr08BPnleV17J3oQCH.png | mounting.png | Display mounting、非通電時の表示配置 | byte-for-byte。背面M2・スペーサーを直接見せない。淡色の非点灯セグメントを別表示色と扱わない |

全画像に英語alt、caption、実ピクセル寸法。PNG圧縮変換は不要（約185/206KB）なので原本維持。画像来歴READMEに元URL・SHA-256・寸法・境界を記録。現在展示構成の写真は採用しておらず、旧写真を10/4 acceptance証拠と扱わない。

## Safety

5V DCのみ、mains/AC禁止、選択計器の動作範囲確認・超過禁止、極性確認、加工・配線時の給電停止、時計電池・不要基板の撤去、クランプ・保護眼鏡、細径ビットの破断、5V/GND短絡防止・必要箇所の絶縁を追加。原作業で全項実施したという事実主張にはしていない。

## Interpretation / 不確実性

- 他の廃ケース・絶縁材・固定方法で再現できる可能性は設計提案。実際の適合・動作確認はない。
- 「openingを保ち、測る役割を変更」は公開コンセプトをUS maker向けに再構成した説明。
- 不点灯時の範囲・極性・位置合わせ確認は編集上の切り分け提案。volt-1で発生した追加故障ではない。
- 時計修理の難度・部品調達の負担は公開ownerの判断。技術的修理不能の原因へ拡張しない。

## ソース確認

Vaultは上記SHAで固定して読み取り。参照したパス:

- `note-workspace/articles/2026-04-24_【e-photoframe】_volt-1_—_腕時_計_が電圧_計_になった話.md`
- `series/2026-HW-06_e-photoframe/works/archive/volt-1.md`
- `daily/private/2026-04-16_private.md`
- `daily/private/2026-04-17_private.md`
- `PlayGuide_HTML/yzrsnote_A5_pages/data/junk-yard-2026.json`
- `web-zine/works/volt-1.json`
- `web-zine/YZRS_eZINE_EDITORIAL_BUNDLE.md`
- `projects/2026-AR-03_junk-yard-2026/logs/2026-10-04.md`
- `projects/2026-AR-03_junk-yard-2026/LAUNCH_ACCEPTANCE_CHECKLIST.md`

私的日報の関連制作箇所のみ技術判断に利用し、無関係な内容は公開しない。旧技術メタデータはownerの今回briefによる境界を優先して除外。

## 検証・マージ条件

- `npm run build`: PASS
- `npm run check`: PASS（新routeを共有検査に追加。内部リンク・画像・metadata等）
- `npm test`: 33/33 PASS（Pilot C 5件、Pilot B既存6件を含む）
- `git diff --check`: PASS
- PNG/JPEG原画像を目視: 緑表示、ドナー、加工、非通電取付を確認。
- 実ブラウザ: ローカルChromiumなし。Playwright browser取得が不正ZIPで失敗。desktop / iPhone幅の描画・overflowは**未検証**。CSS検査をvisual PASSとして扱わない。
- A/B、Guide、homeの既存ファイルとリンクをcheckで確認。独立EN homeは開始mainから存在しない。
- マージ前にdesktop / iPhone幅、画像、caption、表スクロール、page overflowを確認し、PR CIを確認。

No unsupported technical facts were added.

Pilot A and Pilot B were not broadened.
