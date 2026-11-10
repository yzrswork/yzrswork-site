---
schema_version: 1
slug: aux-no-sound
title: "Bluetoothは鳴るのにAUXだけ無音 — 3.5mmジャックの挿入検出DETをテスターで切り分ける"
description: "Bluetoothは鳴るのに3.5mm AUX入力だけ無音のとき、純正AUX INでは鳴るのに外部ジャックでは鳴らないなら、挿入検出DETの配線が抜けている可能性があります。テスターでDET-GND間の導通をプラグの有無で確かめる切り分け手順をまとめました。"
article_type: troubleshooting-guide
difficulty: basic
domains: ["電子工作", "オーディオ", "トラブルシューティング"]
purposes: ["基板上のAUXジャックを外部ジャックへ延長したい", "3.5mmジャックの挿入検出が何をしているのか実物で確認したい"]
symptoms: ["Bluetoothは鳴るのにAUXだけ鳴らない", "純正AUX INでは鳴るのに外部AUXジャックでは鳴らない"]
source_files:
  - "note-workspace/articles/2026-09-17_Bluetoothは鳴るのにAUXは無音。YS-AP50Lの挿入検出DETを追った話.md"
source_note_urls:
  - "https://note.com/yzrswork/n/n4ca2e1ba5b8e"
estimated_minutes: 6
has_measurements: true
has_failure_examples: true
status: editorial-draft
---

# Bluetoothは鳴るのにAUXだけ無音 — 3.5mmジャックの挿入検出DETをテスターで切り分ける

Bluetoothスピーカーを作っているとき、Bluetoothでは普通に鳴るのに、外部のAUX入力からだけ音が出ないという症状にぶつかりました。

原因は3.5mmジャックの挿入検出DETでした。アンプ基板の純正AUXジャックにはプラグが挿さったことを知らせる端子があり、外部へ引き出すときにそれを持ってこなかったのです。

このページは、note記事「[Bluetoothは鳴るのにAUXは無音。YS-AP50Lの挿入検出DETを追った話](https://note.com/yzrswork/n/n4ca2e1ba5b8e)」を、切り分け手順の型で組み直した版です。経緯は元記事にあります。

## 症状

Bluetoothで再生すると音は出ます。一方、外部に引き出したAUX入力へプラグを挿しても音が出ません。

切り分けの結果は次のとおりでした。

- 信号源（MO-1）：正常
- ケーブル：正常
- 基板の純正AUX INへプラグを直接挿す：正常に再生する
- 外部化したAUXジャックへプラグを挿す：鳴らない

信号源もケーブルも、基板のAUX入力そのものも生きています。純正AUX INでは鳴るのに外部ジャックでは鳴らないので、問題は基板のAUX INから外部ジャックへ延長した部分に絞られます。

## 原因候補

症状から、次の3つを順番に疑いました。

- 信号源とケーブル：最初に確認した場所です。MO-1もケーブルも正常だったので、候補から外れました。
- 外部化した配線：純正AUXジャックから外部ジャックへ、L / R / GNDだけをつないでいました。音声を入れるだけならこれで足りそうに見えます。
- ジャックの挿入検出接点：純正ジャックは、プラグを挿すとDETという端子がGNDへつながります。アンプ基板はこの接点の状態も見てAUXへ切り替えていて、外部化したときにDETを持ってこなかったことが原因でした。

ここで紛らわしいのが、前回の記事で扱ったSW端子です。HLA-3501D1Iというスイッチ付きジャックのTIP-SW端子は、機械的なスイッチ接点で、プラグ未挿入で導通、挿入で非導通になります。

一方のDETは、プラグなしでDET-GND非導通、プラグありで導通です。どちらもプラグの挿抜で接点が動きますが、大事なのはその接点を回路側が何のために使っているかです。

L / R / GNDが正しくつながっていても、機器側がDETを見て入力を切り替えているなら、それだけでは純正ジャックと同じ動作にはなりません。

## 何を測るか

テスターの導通チェックで、DETとGNDの間をプラグの有無で測ります。今回の測定結果は次のとおりです。

- プラグなし：DET-GND 導通なし
- プラグあり：DET-GND 導通あり

プラグの有無で導通が変わるなら、その端子は挿抜で動く接点です。

切り分けは次の順番で進めます。

- 1. 信号源：信号源が正常に出力しているかを確認する。
- 2. ケーブル：ケーブルに問題がないかを確認する。
- 3. 純正入力：基板の純正AUX INへプラグを直接挿し、鳴るかを確認する。ここで鳴れば、基板側は生きています。
- 4. 外部化した配線：純正ジャックから外部ジャックまでのL / R / GNDを確認する。
- 5. プラグ有無で変化する接点：純正ジャックのDET-GNDを、プラグの有無で導通チェックする。

純正入力では鳴るのに外部ジャックでは鳴らないなら、4と5を重点的に見てください。

直し方としては、DETを自動検出のまま外部ジャックへ複製する方法があります。用途によっては自動検出を再現せず、トグルスイッチで手動切り替えにする方法もあります。今回の展示機では後者を選び、DET --- トグル --- GNDという単純な配線にしました。トグルOFFでDET-GND非導通（Bluetooth）、ONでDET-GND導通（AUX）になります。

## 使う道具

今回の切り分けで一番働いたのは導通チェックでした。必要な道具はテスターで、2点がつながっているかを確かめる導通チェックが主役です。

テスターの選び方は[はじめての電子工作 スターターガイド](/guides/hajimete-no-denshi-kousaku-starter-guide/)で扱っています。

切り分けを順番に絞り込みたいときは、[Fix-it の「AUXだけ鳴らない」ツリーで切り分けを進める](https://apps.yzrswork.com/fixit/?yzrs_ref=auxguide-fixit#aux-no-sound)のが使えます。

## 関連する実測

- [Bluetoothは鳴るのにAUXは無音。YS-AP50Lの挿入検出DETを追った話（note）](https://note.com/yzrswork/n/n4ca2e1ba5b8e)：このページの元になった記事。プラグの有無によるDET-GNDの導通変化と、DETを外部へ持ってこなかったことによる無音の経緯を書いています。
- [3.5mmモノラルジャックの配線記録（note）](https://note.com/yzrswork/n/ne871f1c34dd9)：前段の記事。SW端子をGNDだと思い込んで配線し、プラグを挿した瞬間に回路を切断してしまった話です。

## 次に読む

- [Fix-it の「AUXだけ鳴らない」ツリー](https://apps.yzrswork.com/fixit/?yzrs_ref=auxguide-fixit#aux-no-sound)：切り分けの手順を順番に進められます。
- [はじめての電子工作 スターターガイド](/guides/hajimete-no-denshi-kousaku-starter-guide/)：テスターの選び方はこちら。
- [Bluetoothは鳴るのにAUXは無音。YS-AP50Lの挿入検出DETを追った話（note）](https://note.com/yzrswork/n/n4ca2e1ba5b8e)：DETを追った元の記事。
