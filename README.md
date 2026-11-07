# Novel Story ― 壊生カメリア

笹井綾を中心とした物語「壊生カメリア」の、ノベルゲーム形式ポータルサイト。

- 公開URL: https://10-331.github.io/novel/project/
- 本編タイトル: 壊生カメリア

## ストーリーの分類

ストーリーは次の3カテゴリで管理する。

| カテゴリ | 内容 |
|---|---|
| メインストーリー | 「壊生カメリア」本編 |
| ノベル | ノベル形式の読み物（全5話） |
| イベント | 特定キャラクターのフィーチャー回など（落露がフィーチャーされる話はここ） |

全体の見せ方・UIは 18TRIP（エイトリ）を参考にする方針。

## 構成

すべて `project/` フォルダ以下に置く。

- `project/index.html` ― ポータル（入口）
- `project/story.html` ― ストーリー選択
- `project/novel.html` ― ノベル再生画面
- `project/assets/data/stories.json` ― ストーリーの目次（カテゴリ・話の並びはここで管理）
- `project/assets/data/episodes/` ― 各話の本文JSON
- `project/assets/images/` ― 背景（bg）／キャラクター（chars）／UI（ui）
- `project/assets/css`、`project/assets/js` ― スタイルと再生ロジック

## 編集ルール

- 変更はブランチを切ってPR、または main へ直接コミット
- コミットメッセージは「Update ○○」ではなく、変更内容が分かる書き方にする
