画像一覧ダウンロードスクリプト

このzipには、画像一覧のCSVを元に画像ファイルを一括ダウンロードするためのスクリプトが入っています。

---

【内容物】
1. download_images.bat
   - ダブルクリックで実行可能なバッチファイル
   - PowerShellスクリプトを呼び出して実行します

2. download_images.ps1
   - 実際に画像をダウンロードするPowerShellスクリプト
   - .batファイルから呼び出されます

---

【使い方】
1. このzipファイルを任意のフォルダに展開してください。
2. ダブルクリックで `download_images.bat` を実行します。
3. 「CSVファイルを選択する」ダイアログが表示されるので、画像URLが記載されたCSVファイルを選びます。
4. 選択後、スクリプトが自動で「abbsimg」というフォルダを作成し、画像をダウンロードします。

---

【前提条件】
- Windows 10/11
- インターネット接続
- PowerShell実行ポリシーが `RemoteSigned` 以上に設定されていること
  （エラーが出る場合は管理者権限で次を実行してください）

Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

---

【備考】
- CSVファイルはUTF-8形式で保存してください。
- 画像ファイルは `ani_<スレ番号>_<レス番号>.png` の形式で保存されます。

---

作者: channkenn
GitHub: https://github.com/channkenn/animan_image
