import os
from flask import Flask, request, render_template
from utils.scraper import fetch_images_and_title

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    thread_url = None
    thread_title = None
    images = []
    warning_message = None  # 警告メッセージを格納する変数

    if request.method == "POST":
        # ユーザー入力URL
        thread_url = request.form.get("url")
        if thread_url:
            # URLがあにまん掲示板か確認
            if "https://bbs.animanch.com/" not in thread_url:
                warning_message = "あにまん掲示板でおねがいします"
                thread_url = "https://bbs.animanch.com/"
            else:
                # スレッドタイトルと画像を取得
                thread_title, images = fetch_images_and_title(thread_url)

    return render_template(
        "index.html",
        thread_url=thread_url,
        thread_title=thread_title,
        images=images,
        warning_message=warning_message,
    )
@app.route("/favorites", methods=["GET"])
def favorites():
    return render_template_string("""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>お気に入り</title>
        <style>
            .table-container { display: table; width: 100%; }
            .row { display: table-row; }
            .cell { display: table-cell; padding: 10px; vertical-align: top; border-bottom: 1px solid #ddd; }
            img { max-width: 200px; height: auto; }
        </style>
    </head>
    <body>
        <h1>お気に入り一覧</h1>
        <div id="favorites-container" class="table-container"></div>
        <script>
            // 上記の loadFavorites() 関数を呼び出す
            loadFavorites();
        </script>
    </body>
    </html>
    """)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
