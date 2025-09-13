import os
import time
import re
import requests
import sqlite3
import urllib.parse
from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
from utils.scraper import fetch_images_and_title

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
# -------------------------
# 既存のページルート
# -------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    thread_url = None
    thread_title = None
    images = []
    warning_message = None

    if request.method == "POST":
        thread_url = request.form.get("url")
        if thread_url:
            if not re.match(r"https://bbs.animanch.com/board/\d+/", thread_url):
                warning_message = "あにまん掲示板のスレッドURLでおねがいします"
                return render_template("index.html", warning_message=warning_message)
            else:
                try:
                    response = requests.get(thread_url, allow_redirects=True)
                    if response.status_code == 404 or response.url == "https://bbs.animanch.com/":
                        warning_message = "指定されたスレッドは存在しません"
                        return render_template("index.html", warning_message=warning_message)
                except requests.exceptions.RequestException as e:
                    warning_message = f"URLの確認中にエラーが発生しました: {str(e)}"
                    return render_template("index.html", warning_message=warning_message)

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
    thread_title, images = fetch_images_and_title(thread_url)
    return render_template(
        "view_thread.html",
        thread_url=thread_url,
        thread_title=thread_title,
        images=images
    )

@app.route("/favorite-threads", methods=["GET"])
def favorite_threads():
    return render_template("favorite_threads.html")

@app.route("/fetch-thread-info", methods=["GET"])
def fetch_thread_info():
    thread_url = request.args.get("url")
    if not thread_url:
        return {"error": "URLが提供されていません"}, 400

    thread_title, _ = fetch_images_and_title(thread_url)
    if not thread_title:
        return {"error": "スレッドタイトルを取得できませんでした"}, 404

    return {"title": thread_title}

# -------------------------
# DB関連API
# -------------------------
DB_PATH = "db/umamusume_relation.db"

@app.route("/images/<path:filename>")
def serve_image(filename):
    filename = urllib.parse.unquote(filename)
    images_dir = os.path.join(app.root_path, "images")
    return send_from_directory(images_dir, filename)

@app.route("/api/characters", methods=["GET"])
def get_characters():
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    cur = conn.cursor()
    cur.execute("SELECT id, text FROM text_data WHERE category=6")
    rows = cur.fetchall()
    conn.close()
    return jsonify([{"id": r[0], "name": r[1]} for r in rows])

@app.route("/api/character/<int:chara_id>", methods=["GET"])
def get_character(chara_id):
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    cur = conn.cursor()
    cur.execute("SELECT id, text FROM text_data WHERE category=6 AND id=?", (chara_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return jsonify({"id": row[0], "name": row[1]})
    else:
        return jsonify({"error": "Character not found"}), 404

@app.route("/api/relation", methods=["GET"])
def get_relation():
    c1 = request.args.get("c1", type=int)
    c2 = request.args.get("c2", type=int)
    if not c1 or not c2:
        return jsonify({"error": "c1 and c2 are required"}), 400

    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    cur = conn.cursor()
    cur.execute("""
        SELECT SUM(r.relation_point)
        FROM succession_relation r
        JOIN succession_relation_member m1 ON r.relation_type = m1.relation_type
        JOIN succession_relation_member m2 ON r.relation_type = m2.relation_type
        WHERE m1.chara_id = ? AND m2.chara_id = ?
    """, (c1, c2))
    total = cur.fetchone()[0]
    conn.close()

    return jsonify({"c1": c1, "c2": c2, "total": total or 0})

# -------------------------
# 新機能: フロントから選択キャラを受け取る
# -------------------------
@app.route("/api/fixed", methods=["POST"])
def api_fixed():
    """
    フロントから選択されたキャラを受け取り、確認用に返す。
    例:
    {
      "left": "エルコンドルパサー",
      "right": "シンボリルドルフ",
      "leftGrandfather": "ナリタブライアン",
      "leftGrandmother": "ナイスネイチャ",
      "rightGrandfather": "エルコンドルパサー",
      "rightGrandmother": "シンボリルドルフ"
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    return jsonify({
        "fixed": data,
        "count": len([v for v in data.values() if v])  # 選択された数
    })

# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
