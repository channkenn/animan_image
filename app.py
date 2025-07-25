import os
import time
import re  # 正規表現モジュールをインポート
import requests  # requestsモジュールをインポート
from flask import Flask, request, render_template, render_template_string
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
            if not re.match(r"https://bbs.animanch.com/board/\d+/", thread_url):
                # URLチェック失敗時、警告メッセージとともに元のページにリダイレクト
                warning_message = "あにまん掲示板のスレッドURLでおねがいします"
                return render_template("index.html", warning_message=warning_message)
            else:
                # URLが有効か確認（HTTPリクエスト）
                try:
                    response = requests.get(thread_url, allow_redirects=True)
                    # ステータスコードが404、またはリダイレクト後のURLが指定URLの場合
                    if response.status_code == 404 or response.url == "https://bbs.animanch.com/":
                        # スレッドが存在しない場合
                        warning_message = "指定されたスレッドは存在しません"
                        return render_template("index.html", warning_message=warning_message)
                except requests.exceptions.RequestException as e:
                    # ネットワークエラーや接続エラーの場合
                    warning_message = f"URLの確認中にエラーが発生しました: {str(e)}"
                    return render_template("index.html", warning_message=warning_message)
                
                # スレッドタイトルと画像を取得
                thread_title, images = fetch_images_and_title(thread_url)

    return render_template(
        "index.html",
        thread_url=thread_url,
        thread_title=thread_title,
        images=images,
        warning_message=warning_message
    )
@app.route("/favorites", methods=["GET"])
def favorites():
    return render_template("favorite.html")
@app.route("/creative", methods=["GET"])
def creative():
    return render_template("creative.html")
@app.route("/resize", methods=["GET"])
def resize():
    return render_template("resize.html")
@app.route("/resize_with_drawing", methods=["GET"])
def resize_with_drawing():
    return render_template("resize_with_drawing.html")
@app.route("/view-thread", methods=["GET"])
def view_thread():
    thread_url = request.args.get("url")
    if not thread_url:
        return "URLが提供されていません", 400

    # スレッドの情報を取得
    thread_title, images = fetch_images_and_title(thread_url)
    # 現在のタイムスタンプを取得
    return render_template(
        "view_thread.html",
        thread_url=thread_url,
        thread_title=thread_title,
        images=images
    )
@app.route("/favorite-threads", methods=["GET"])
def favorite_threads():
    # フロントエンドでローカルストレージからURLを取得し、表示用に送信
    return render_template("favorite_threads.html")
@app.route("/fetch-thread-info", methods=["GET"])
def fetch_thread_info():
    thread_url = request.args.get("url")
    if not thread_url:
        return {"error": "URLが提供されていません"}, 400

    # スレッド情報を取得
    thread_title, _ = fetch_images_and_title(thread_url)

    if not thread_title:
        return {"error": "スレッドタイトルを取得できませんでした"}, 404

    return {"title": thread_title}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    #app.run(host="0.0.0.0", port=port)
    app.run(debug=True, host="0.0.0.0", port=5000)