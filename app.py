import os
import re
import requests
import sqlite3
import csv
import urllib.parse
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
from utils.scraper import fetch_images_and_title

app = Flask(__name__)

# -------------------------
# 全 /api/* に対して CORS 許可
# -------------------------
#CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
EXCLUDE_NAMES = ["モンジュー"]
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

def calculate_total(chars0, current_fixed, cursor):
    chars = [chars0] + [cid for cid,_ in current_fixed]

    sql = f"""
    WITH chars AS (
        SELECT {chars[0]} AS id, 0 AS idx UNION ALL
        SELECT {chars[1]}, 1 UNION ALL
        SELECT {chars[2]}, 2 UNION ALL
        SELECT {chars[3]}, 3 UNION ALL
        SELECT {chars[4]}, 4 UNION ALL
        SELECT {chars[5]}, 5 UNION ALL
        SELECT {chars[6]}, 6
    ),
    combination_points AS (
        -- 1と2
        SELECT CASE WHEN (SELECT id FROM chars WHERE idx=0) = (SELECT id FROM chars WHERE idx=1) THEN 0
                    ELSE COALESCE(SUM(sr.relation_point),0) END AS total
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT srm1.relation_type
            FROM succession_relation_member srm1
            JOIN succession_relation_member srm2
              ON srm1.relation_type = srm2.relation_type
            WHERE srm1.chara_id = (SELECT id FROM chars WHERE idx=0)
              AND srm2.chara_id = (SELECT id FROM chars WHERE idx=1)
        )
        UNION ALL
        -- 1と5
        SELECT CASE WHEN (SELECT id FROM chars WHERE idx=0) = (SELECT id FROM chars WHERE idx=4) THEN 0
                    ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT srm1.relation_type
            FROM succession_relation_member srm1
            JOIN succession_relation_member srm2
              ON srm1.relation_type = srm2.relation_type
            WHERE srm1.chara_id = (SELECT id FROM chars WHERE idx=0)
              AND srm2.chara_id = (SELECT id FROM chars WHERE idx=4)
        )
        UNION ALL
        -- 2と5
        SELECT CASE WHEN (SELECT id FROM chars WHERE idx=1) = (SELECT id FROM chars WHERE idx=4) THEN 0
                    ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT srm1.relation_type
            FROM succession_relation_member srm1
            JOIN succession_relation_member srm2
              ON srm1.relation_type = srm2.relation_type
            WHERE srm1.chara_id = (SELECT id FROM chars WHERE idx=1)
              AND srm2.chara_id = (SELECT id FROM chars WHERE idx=4)
        )
        UNION ALL
        -- 1,2,3
        SELECT CASE WHEN (
            (SELECT COUNT(DISTINCT id) FROM chars WHERE idx IN (0,1,2)) < 3
        ) THEN 0 ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT relation_type
            FROM succession_relation_member
            WHERE chara_id IN (SELECT id FROM chars WHERE idx IN (0,1,2))
            GROUP BY relation_type
            HAVING COUNT(DISTINCT chara_id) = 3
        )
        UNION ALL
        -- 1,2,4
        SELECT CASE WHEN (
            (SELECT COUNT(DISTINCT id) FROM chars WHERE idx IN (0,1,3)) < 3
        ) THEN 0 ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT relation_type
            FROM succession_relation_member
            WHERE chara_id IN (SELECT id FROM chars WHERE idx IN (0,1,3))
            GROUP BY relation_type
            HAVING COUNT(DISTINCT chara_id) = 3
        )
        UNION ALL
        -- 1,5,6
        SELECT CASE WHEN (
            (SELECT COUNT(DISTINCT id) FROM chars WHERE idx IN (0,4,5)) < 3
        ) THEN 0 ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT relation_type
            FROM succession_relation_member
            WHERE chara_id IN (SELECT id FROM chars WHERE idx IN (0,4,5))
            GROUP BY relation_type
            HAVING COUNT(DISTINCT chara_id) = 3
        )
        UNION ALL
        -- 1,5,7
        SELECT CASE WHEN (
            (SELECT COUNT(DISTINCT id) FROM chars WHERE idx IN (0,4,6)) < 3
        ) THEN 0 ELSE COALESCE(SUM(sr.relation_point),0) END
        FROM succession_relation sr
        WHERE sr.relation_type IN (
            SELECT relation_type
            FROM succession_relation_member
            WHERE chara_id IN (SELECT id FROM chars WHERE idx IN (0,4,6))
            GROUP BY relation_type
            HAVING COUNT(DISTINCT chara_id) = 3
        )
    )
    SELECT SUM(total) FROM combination_points;
    """

    #conn = sqlite3.connect(DB_PATH)
    #cursor = conn.cursor()
    cursor.execute(sql)
    result = cursor.fetchone()[0]
    #conn.close()
    return result
import pandas as pd
import sqlite3

def calculate_total_pandas(candidate_id, current_fixed):
    """
    candidate_id: int, 候補キャラクターID
    current_fixed: [(id, name), ...]  # current_fixed[0]は父など
    """
    # chars0 を先頭にしたIDリスト
    chars = [candidate_id] + [cid for cid, _ in current_fixed]  # 0〜6まで

    # SQLiteから必要なテーブルを読み込む
    conn = sqlite3.connect(DB_PATH)
    srm_df = pd.read_sql("SELECT chara_id, relation_type FROM succession_relation_member", conn)
    sr_df = pd.read_sql("SELECT relation_type, relation_point FROM succession_relation", conn)
    conn.close()

    total_score = 0

    # ペアの組み合わせ
    pair_indices = [(0,1), (0,4), (1,4)]
    for i,j in pair_indices:
        if chars[i] == chars[j]:
            continue  # 同じキャラなら0
        df1 = srm_df[srm_df['chara_id']==chars[i]]
        df2 = srm_df[srm_df['chara_id']==chars[j]]
        merged = pd.merge(df1, df2, on='relation_type')
        merged = pd.merge(merged, sr_df, left_on='relation_type', right_on='relation_type')
        total_score += merged['relation_point'].sum()

    # トリオの組み合わせ
    trio_indices = [(0,1,2), (0,1,3), (0,4,5), (0,4,6)]
    for i,j,k in trio_indices:
        if len({chars[i], chars[j], chars[k]}) < 3:
            continue
        df1 = srm_df[srm_df['chara_id']==chars[i]]
        df2 = srm_df[srm_df['chara_id']==chars[j]]
        df3 = srm_df[srm_df['chara_id']==chars[k]]
        merged = pd.merge(df1, df2, on='relation_type')
        merged = pd.merge(merged, df3, on='relation_type')
        merged = pd.merge(merged, sr_df, left_on='relation_type', right_on='relation_type')
        total_score += merged['relation_point'].sum()

    return total_score

# -------------------------
# 並列計算ヘルパー
# -------------------------
def find_best_candidate_parallel(current_fixed, candidates, max_workers=8):
    best_char = None
    best_total = -1

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_c = {executor.submit(calculate_total_pandas, c, current_fixed): c for c in candidates}

        for future in as_completed(future_to_c):
            c = future_to_c[future]
            try:
                total = future.result()
                _, name = get_character_name(c)
                print(f"【DEBUG】候補ID={c}, 名前={name}, total={total}")
                if total > best_total:
                    best_total = total
                    best_char = c
            except Exception as e:
                print(f"【ERROR】候補ID={c} 計算失敗: {e}")

    return best_char, best_total

# -------------------------
def find_best_candidate(current_fixed, candidates):
    best_char = None
    best_total = -1

    # DB接続とカーソル作成をループ外に
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for c in candidates:
        try:
            #total = calculate_total(c, current_fixed, cursor)  # cursorを渡すように修正
            total = calculate_total_pandas(c, current_fixed)
            _, name = get_character_name(c)
            print(f"【DEBUG】候補ID={c}, 名前={name}, total={total}")
            
            if total > best_total:
                best_total = total
                best_char = c
        except Exception as e:
            print(f"【ERROR】候補ID={c} 計算失敗: {e}")

    conn.close()
    return best_char, best_total

def find_best_candidate_pandas(current_fixed, candidates):
    """
    current_fixed: [(chara_id, name), ...] 例: [(1024,'マヤノトップガン'), ...]
    candidates: [id1, id2, id3, ...]  # 候補キャラIDのリスト
    """
    conn = sqlite3.connect(DB_PATH)

    # 必要なテーブルを pandas に読み込む
    df_srm = pd.read_sql("SELECT * FROM succession_relation_member", conn)
    df_sr = pd.read_sql("SELECT * FROM succession_relation", conn)

    conn.close()

    fixed_ids = [cid for cid, _ in current_fixed]

    best_char = None
    best_score = -1

    for candidate in candidates:
        # chars0 = candidate, chars1..6 = current_fixed IDs
        chars = [candidate] + fixed_ids

        total = 0

        # ペア計算
        pairs = [(0, 1), (0, 4), (1, 4)]
        for i, j in pairs:
            if chars[i] == chars[j]:
                continue
            # 該当 relation_type を抽出
            types_i = df_srm[df_srm['chara_id'] == chars[i]]['relation_type']
            types_j = df_srm[df_srm['chara_id'] == chars[j]]['relation_type']
            common_types = pd.Series(list(set(types_i) & set(types_j)))
            # スコア合計
            total += df_sr[df_sr['relation_type'].isin(common_types)]['relation_point'].sum()

        # トリオ計算
        trios = [(0, 1, 2), (0, 1, 3), (0, 4, 5), (0, 4, 6)]
        for i, j, k in trios:
            if len({chars[i], chars[j], chars[k]}) < 3:
                continue
            # relation_type に含まれるキャラが3人ともいるもの
            types_i = df_srm[df_srm['chara_id'] == chars[i]]['relation_type']
            types_j = df_srm[df_srm['chara_id'] == chars[j]]['relation_type']
            types_k = df_srm[df_srm['chara_id'] == chars[k]]['relation_type']
            common_types = set(types_i) & set(types_j) & set(types_k)
            total += df_sr[df_sr['relation_type'].isin(common_types)]['relation_point'].sum()

        if total > best_score:
            best_score = total
            best_char = candidate

    return best_char, int(best_score)

def get_character_name(chara_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT `index`, text FROM text_data WHERE category=6 AND `index`=?",
        (chara_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return (chara_id, row[1])  # row[1] が text（名前）
    return (chara_id, f"ID_{chara_id}")  # 名前がなければID文字列で返す

# -------------------------
# 固定キャラAPI（CORS対応済み・デバッグ用ログ追加）
# -------------------------
@app.route("/api/fixed_names", methods=["GET", "POST", "OPTIONS"])
def api_fixed_names():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if request.method == "GET":
        return jsonify(list(CHAR_DICT.keys()))

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

    best_char, best_total = find_best_candidate_pandas(current_fixed, candidates)
    #best_char, best_total = find_best_candidate_parallel(current_fixed, candidates)
    #best_char, best_total = find_best_candidate(current_fixed, candidates)

    if best_char is None:
        return jsonify({"best_character": None, "score": best_total})

    _, name = get_character_name(best_char)
    print(f"【DEBUG】最終 best_char={best_char}, 名前={name}, スコア={best_total}")

    #return jsonify({"best_character": name, "score": best_total})
    return jsonify({"best_character": name, "score": int(best_total)})


# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
