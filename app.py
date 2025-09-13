import os
import re
import requests
import sqlite3
import csv
import urllib.parse
from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
from utils.scraper import fetch_images_and_title

app = Flask(__name__)

# -------------------------
# 全 /api/* に対して CORS 許可
# -------------------------
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# -------------------------
# OPTIONS リクエスト対応（preflight）
# -------------------------
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = app.make_default_options_response()
        headers = resp.headers
        headers['Access-Control-Allow-Origin'] = '*'
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return resp

# -------------------------
# 既存ページルート
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

# -------------------------
# ページルート
# -------------------------
@app.route("/favorites")
def favorites(): return render_template("favorite.html")
@app.route("/creative")
def creative(): return render_template("creative.html")
@app.route("/resize")
def resize(): return render_template("resize.html")
@app.route("/resize_with_drawing")
def resize_with_drawing(): return render_template("resize_with_drawing.html")
@app.route("/view-thread")
def view_thread():
    thread_url = request.args.get("url")
    if not thread_url: return "URLが提供されていません", 400
    thread_title, images = fetch_images_and_title(thread_url)
    return render_template("view_thread.html", thread_url=thread_url, thread_title=thread_title, images=images)
@app.route("/favorite-threads")
def favorite_threads(): return render_template("favorite_threads.html")
@app.route("/fetch-thread-info")
def fetch_thread_info():
    thread_url = request.args.get("url")
    if not thread_url: return {"error": "URLが提供されていません"}, 400
    thread_title, _ = fetch_images_and_title(thread_url)
    if not thread_title: return {"error": "スレッドタイトルを取得できませんでした"}, 404
    return {"title": thread_title}

# -------------------------
# DB関連API
# -------------------------
DB_PATH = "db/umamusume_relation.db"
CSV_PATH = "csv/characters.csv"
roles = ["父", "父父", "父母", "母", "母父", "母母"]

@app.route("/images/<path:filename>")
def serve_image(filename):
    filename = urllib.parse.unquote(filename)
    images_dir = os.path.join(app.root_path, "images")
    return send_from_directory(images_dir, filename)

@app.route("/api/characters")
def get_characters():
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    cur = conn.cursor()
    cur.execute("SELECT id, text FROM text_data WHERE category=6")
    rows = cur.fetchall()
    conn.close()
    return jsonify([{"id": r[0], "name": r[1]} for r in rows])

@app.route("/api/character/<int:chara_id>")
def get_character(chara_id):
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str
    cur = conn.cursor()
    cur.execute("SELECT id, text FROM text_data WHERE category=6 AND id=?", (chara_id,))
    row = cur.fetchone()
    conn.close()
    if row: return jsonify({"id": row[0], "name": row[1]})
    return jsonify({"error": "Character not found"}), 404

@app.route("/api/relation")
def get_relation():
    c1 = request.args.get("c1", type=int)
    c2 = request.args.get("c2", type=int)
    if not c1 or not c2: return jsonify({"error": "c1 and c2 are required"}), 400
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
# CSV読み込み
# -------------------------
def load_char_dict():
    char_dict = {}
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            char_dict[row["name"]] = int(row["id"])
    return char_dict

CHAR_DICT = load_char_dict()
EXCLUDE_NAMES = ["テイエムオペラオー","クロノジェネシス","アグネスデジタル",
                 "ダイワスカーレット","ジェンティルドンナ","メジロラモーヌ",
                 "ユキノビジン","シリウスシンボリ","メジロドーベル","ウオッカ"]
EXCLUDE_IDS = [CHAR_DICT[name] for name in EXCLUDE_NAMES if name in CHAR_DICT]

def names_to_fixed_chars(names):
    fixed_chars = []
    for n in names:
        if n not in CHAR_DICT: raise ValueError(f"名前が不正: {n}")
        fixed_chars.append((CHAR_DICT[n], n))
    return fixed_chars

def get_candidate_chars0(current_fixed):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT chara_id FROM succession_relation_member")
    candidates = [row[0] for row in cursor.fetchall()]
    conn.close()
    exclude_ids = [cid for cid,_ in current_fixed] + EXCLUDE_IDS
    return [c for c in candidates if c not in exclude_ids]

def calculate_total(chars0, current_fixed):
    """
    chars0: 候補キャラ1人のID
    current_fixed: 6名固定キャラ [(id, name), ...]
    """
    # 7名の組み合わせ
    chars = [chars0] + [cid for cid,_ in current_fixed]
    print(f"【DEBUG】calculate_total chars: {chars}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    sql = f"""
    WITH chars(id) AS (
        SELECT {chars[0]} UNION SELECT {chars[1]} UNION SELECT {chars[2]} UNION
        SELECT {chars[3]} UNION SELECT {chars[4]} UNION SELECT {chars[5]} UNION SELECT {chars[6]}
    ),
    pairs AS (
        SELECT c1.id AS id1, c2.id AS id2
        FROM chars c1
        JOIN chars c2 ON c1.id < c2.id
    )
    SELECT r.relation_type, SUM(r.relation_point) as total_points
    FROM pairs p
    JOIN succession_relation_member m1 ON p.id1 = m1.chara_id
    JOIN succession_relation_member m2 ON p.id2 = m2.chara_id AND m1.relation_type = m2.relation_type
    JOIN succession_relation r ON m1.relation_type = r.relation_type
    GROUP BY r.relation_type
    """

    cursor.execute(sql)
    rows = cursor.fetchall()
    conn.close()

    total = sum(row[1] for row in rows if row[1] is not None)
    print(f"【DEBUG】calculate_total result rows: {rows}, total: {total}")

    return total or 0

def get_character_name(chara_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT text FROM text_data WHERE category=6 AND id=?", (chara_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        print(f"【DEBUG】get_character_name id={chara_id}, name={row[0]}")
        return (chara_id, row[0])
    else:
        print(f"【DEBUG】get_character_name id={chara_id} → 名前なし")
        return (chara_id, None)

# -------------------------
# 固定キャラAPI（CORS対応済み・デバッグ用ログ追加）
# -------------------------
@app.route("/api/fixed_names", methods=["GET", "POST", "OPTIONS"])
def api_fixed_names():
    if request.method == "OPTIONS":
        # preflight は空応答
        return jsonify({}), 200

    if request.method == "GET":
        return jsonify(list(CHAR_DICT.keys()))

    if request.method == "POST":
        data = request.json
        if not data or "names" not in data:
            return jsonify({"error": "JSON body with 'names' required"}), 400

        names = data["names"]
        if len(names) != 6:
            return jsonify({"error": "6名分の名前を送信してください"}), 400

        try:
            current_fixed = names_to_fixed_chars(names)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        print("【DEBUG】current_fixed:", current_fixed)

        candidates = get_candidate_chars0(current_fixed)
        print("【DEBUG】候補キャラIDs:", candidates)

        best_char = None
        best_total = -1

        for c in candidates:
            total = calculate_total(c, current_fixed)
            _, name = get_character_name(c)
            print(f"【DEBUG】候補ID={c}, 名前={name}, total={total}")
            if total > best_total:
                best_total = total
                best_char = c

        if best_char is None:
            print("【DEBUG】最適キャラが見つかりませんでした")
            return jsonify({"best_character": None, "score": best_total})

        _, name = get_character_name(best_char)
        print(f"【DEBUG】最終 best_char={best_char}, 名前={name}, スコア={best_total}")

        return jsonify({"best_character": name, "score": best_total})


# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
