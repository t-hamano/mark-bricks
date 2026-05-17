# 翻訳ファイル

MarkBricks の翻訳ファイルの生成と運用方法を説明します。

以降で参照するファイルはすべて [`languages/`](../../languages/) 配下にあります。

## ファイル構成

| ファイル                             | 役割                                                                                                                    | 生成コマンド     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `mark-bricks.pot`                    | 翻訳テンプレート (どの文字列が存在するかの真の情報源)                                                                   | `i18n:make-pot`  |
| `mark-bricks-<locale>.po`            | ロケール別の翻訳ソース (人が編集)                                                                                       | `i18n:make-po`   |
| `mark-bricks-<locale>.json`          | Jed 形式 JSON。`mark-bricks` ドメイン (`.po` から生成) と `default` ドメイン (Gutenberg、WordPress.org から取得) を同梱 | `i18n:make-json` |
| `mark-bricks-override-<locale>.json` | 任意。`mark-bricks` / `default` どちらのドメインも手動で上書き可能                                                      | 手動編集         |

`*.json` は実行時に `@wordpress/i18n` の `setLocaleData()` から読み込まれる成果物です。

## ワークフロー

### 1. POT を更新する (ソースコード変更後)

```bash
pnpm i18n:make-pot
```

`src/**` を走査し、`@wp-blocks/make-pot` で `mark-bricks.pot` を再生成します。
翻訳対象の文字列を追加または削除したときに実行してください。

### 2. PO を同期する (POT 変更後)

```bash
pnpm i18n:make-po          # デフォルト: ja
pnpm i18n:make-po pt_BR    # 別のロケールを指定する場合
```

POT を基準に `mark-bricks-<locale>.po` を更新します:

-   POT に存在するエントリのみを残します。
-   既存 `.po` の非空 `msgstr` と translator コメントを引き継ぎます。
-   POT から消えたエントリは削除します。

`.po` が存在しなければ新規に作成します。
`Last-Translator` / `Language-Team` ヘッダーは既存値を保持し、`PO-Revision-Date` は現在時刻で上書きします。

### 3. 翻訳する

`.po` の `msgstr` を直接編集するか、Poedit のようなツールを使ってください。

### 4. JSON ファイルを生成する (リリース前 / 翻訳更新後)

```bash
pnpm i18n:make-json          # デフォルト: ja
pnpm i18n:make-json pt_BR    # 別のロケールを指定する場合
```

-   `.po` の存在を確認します (見つからない場合は `i18n:make-po` の実行を促してエラー終了します)。
-   `.po` を `mark-bricks-<locale>.json` の `mark-bricks` ドメインに変換します (Jed 形式、空の `msgstr` エントリは除外)。
-   `translate.wordpress.org` から該当ロケールを取得し、同じ `mark-bricks-<locale>.json` の `default` ドメインに書き出します。

## 翻訳を上書きする

`mark-bricks-<locale>.json` の `default` ドメインは WordPress.org から取得しますが、アプリにバンドルされている `@wordpress/*` パッケージの msgid と必ずしも一致するとは限りません。バージョン差や fork による変更で msgid がズレている場合、その文字列は翻訳が当たらず原文のまま表示されます。`.po` を再ビルドせずに `mark-bricks` ドメインを暫定修正したい場合も同様です。これらを補うには `mark-bricks-override-<locale>.json` を同じディレクトリに配置してください。`i18n:make-json` を再実行しても上書きされません。

ファイル形式は同じ Jed 形式です。上書きしたい msgid だけを書けばよく、それ以外のエントリは元ファイルから継承されます。`mark-bricks` / `default` どちらのドメインも同じファイル内で上書きできます。

```json
{
	"locale_data": {
		"mark-bricks": {
			"some app msgid": [ "アプリ側の正しい翻訳" ]
		},
		"default": {
			"some gutenberg msgid": [ "Gutenberg 側の正しい翻訳" ]
		}
	}
}
```

`""` メタデータ (`domain`, `plural-forms`, `lang`) は `mark-bricks-<locale>.json` のものがメッセージレベルのマージで継承されるため、オーバーライド側に書く必要はありません。

マージはメッセージ単位で、`mark-bricks-<locale>.json` → `mark-bricks-override-<locale>.json` の順で後勝ちです。

このオーバーライドファイルは任意で、自動生成されず、手動で管理します。

## 新しいロケールを追加する

```bash
pnpm i18n:make-po <locale>     # 空の .po を作成
# → mark-bricks-<locale>.po を翻訳
pnpm i18n:make-json <locale>   # JSON ファイルを生成
```

`<locale>` は WordPress のロケールスラッグです (例: `ja`, `pt_BR`, `de_DE`, `zh_CN`)。一覧は [WordPress locale list](https://translate.wordpress.org/locale/) を参照してください。
