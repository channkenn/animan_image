import os
import time
import re
import requests
import sqlite3
import csv
import urllib.parse
import pandas as pd
import inspect
import numpy as np

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
from utils.scraper import fetch_images_and_title
#from relation import process_fixed_names

#本番にアップする時はFalseにする
DEBUG = True
# DEBUG = False
# -------------------------
# DB関連API
# -------------------------
DB_PATH = "db/umamusume_relation.db"
CSV_PATH = "csv/characters.csv"
roles = ["父", "父父", "父母", "母", "母父", "母母"]
import sqlite3
import pandas as pd

DB_PATH = "db/umamusume_relation.db"

# --- 起動時にロードしてキャッシュ ---
def load_all_masters():
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str

    # キャラ名（succession_relation_member に存在するキャラのみ）
    sql_char = """
        SELECT DISTINCT td."index" AS id, td.text
        FROM text_data td
        INNER JOIN succession_relation_member srm
          ON td."index" = srm.chara_id
        WHERE td.category = 6
        ORDER BY td."index"
    """
    df_char = pd.read_sql(sql_char, conn)
    char_name_dict = dict(zip(df_char["id"], df_char["text"]))

    # 継承関係
    df_srm = pd.read_sql("SELECT * FROM succession_relation_member", conn)
    df_sr = pd.read_sql("SELECT * FROM succession_relation", conn)

    conn.close()

    # relation_type -> point
    relation_point_map = df_sr.set_index("relation_type")["relation_point"].to_dict()

    # chara_id -> {relation_type, ...}
    char_to_types = df_srm.groupby("chara_id")["relation_type"].apply(set).to_dict()

    return char_name_dict, relation_point_map, char_to_types

# 起動時に一度だけロードしてキャッシュ
CHAR_NAME_DICT, RELATION_POINT_MAP, CHAR_TO_TYPES = load_all_masters()

# --- 事前準備 ---
ALL_REL_TYPES = list({t for types in CHAR_TO_TYPES.values() for t in types})
REL_IDX = {t: i for i, t in enumerate(ALL_REL_TYPES)}

# 全キャラID（固定キャラ + 候補キャラ）を使ってマッピング
ALL_CHAR_IDS = list(CHAR_TO_TYPES.keys())  # ここに候補キャラIDも含めてもOK
CHAR_ID_IDX = {cid: i for i, cid in enumerate(ALL_CHAR_IDS)}

NUM_CHARS = len(ALL_CHAR_IDS)
NUM_TYPES = len(ALL_REL_TYPES)

# キャラクター × relation_type のバイナリ行列
CHAR_TYPE_MATRIX = np.zeros((NUM_CHARS, NUM_TYPES), dtype=np.uint8)
for cid, types in CHAR_TO_TYPES.items():
    row = CHAR_ID_IDX[cid]
    for t in types:
        CHAR_TYPE_MATRIX[row, REL_IDX[t]] = 1

REL_POINTS = np.array([RELATION_POINT_MAP[t] for t in ALL_REL_TYPES], dtype=np.int32)

PAIRS = [(0, 1), (0, 4), (1, 4)]
TRIOS = [(0, 1, 2), (0, 1, 3), (0, 4, 5), (0, 4, 6)]


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


@app.route("/images/<path:filename>")
def serve_image(filename):
    filename = urllib.parse.unquote(filename)
    images_dir = os.path.join(app.root_path, "images")
    return send_from_directory(images_dir, filename)

@app.route("/api/characters")
def get_characters():
    # --- ここで直接 SQL を叩す部分を削除 ---
    # conn = sqlite3.connect(DB_PATH)
    # conn.text_factory = str
    # cur = conn.cursor()
    #
    # sql = """
    #     SELECT DISTINCT td."index" AS id, td.text
    #     FROM text_data td
    #     INNER JOIN succession_relation_member srm
    #       ON td."index" = srm.chara_id
    #     WHERE td.category = 6
    #     ORDER BY td."index"
    # """
    # cur.execute(sql)
    # rows = cur.fetchall()
    # conn.close()

    # --- キャッシュ済み辞書 CHAR_NAME_DICT を使う ---
    rows = [{"id": cid, "name": name} for cid, name in CHAR_NAME_DICT.items()]
    # 必要に応じて id 順にソート
    rows.sort(key=lambda x: x["id"])

    return jsonify(rows)



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

import csv

# -------------------------
# CSV読み込み
# -------------------------
def load_char_dict():
    char_dict = {}
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # name をキー、id を値にする辞書を作成
            char_dict[row["name"]] = int(row["id"])
    return char_dict


CHAR_DICT = load_char_dict()

# -------------------------
# 除外キャラ設定
# -------------------------
EXCLUDE_NAMES = ["モンジュー",
                 ]
EXCLUDE_IDS = [CHAR_DICT[name] for name in EXCLUDE_NAMES if name in CHAR_DICT]

# -------------------------
# 対象キャラ設定
# -------------------------
# INCLUDE_NAMES = ["ゴールドシップ",
#                  "ウオッカ",
#                  "ダイワスカーレット",
#                  "メジロマックイーン",
#                  "マヤノトップガン",
#                  "メジロライアン",
#                  "マチカネフクキタル",
#                  "ツインターボ",
#                  "ハルウララ",
#                  "エスポワールシチー",
#                  "アグネスタキオン",
#                  "ウイニングチケット",
#                  "サクラバクシンオー",
#                  ]
INCLUDE_NAMES = []
INCLUDE_IDS = [CHAR_DICT[name] for name in INCLUDE_NAMES if name in CHAR_DICT]

# -------------------------
# 判定関数
# -------------------------
def is_target(char_id: int) -> bool:
    """
    char_id が処理対象かどうか判定する
    - INCLUDE_IDS が空なら「全員対象」
    - INCLUDE_IDS が指定されている場合、その中に含まれるかを確認
    - EXCLUDE_IDS に入っている場合は対象外
    優先度: EXCLUDE > INCLUDE
    """
    if char_id in EXCLUDE_IDS:
        return False
    if INCLUDE_IDS and char_id not in INCLUDE_IDS:
        return False
    return True

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

    # すでに選ばれているIDと除外IDを外す
    # exclude_ids = [cid for cid, _ in current_fixed] + EXCLUDE_IDS
    indices = [0, 3]  # 抜きたい位置
    exclude_ids = [current_fixed[i][0] for i in indices] + EXCLUDE_IDS
    result = []
    for c in candidates:
        # 除外IDに含まれる場合はスキップ
        if c in exclude_ids:
            continue
        # INCLUDE_IDS が指定されている場合は、その中にないキャラをスキップ
        if INCLUDE_IDS and c not in INCLUDE_IDS:
            continue
        # ここまで残ったら候補に追加
        result.append(c)

    return result


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
                if DEBUG:
                    print(f"【DEBUG】候補ID={c}, 名前={name}, total={total}")
                if total > best_total:
                    best_total = total
                    best_char = c
            except Exception as e:
                if DEBUG:
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
            if DEBUG:
                print(f"【DEBUG】候補ID={c}, 名前={name}, total={total}")
            
            if total > best_total:
                best_total = total
                best_char = c
        except Exception as e:
            if DEBUG:
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
def find_best_candidate_pandas_vectorized(current_fixed, candidates):
    """
    current_fixed: [(chara_id, name), ...]
    candidates: [id1, id2, id3, ...]
    """
    conn = sqlite3.connect(DB_PATH)
    df_srm = pd.read_sql("SELECT * FROM succession_relation_member", conn)
    df_sr = pd.read_sql("SELECT * FROM succession_relation", conn)
    conn.close()

    # relation_point を dict にしておく（lookup 高速化）
    relation_point_map = df_sr.set_index("relation_type")["relation_point"].to_dict()

    # 各キャラごとに relation_type のセットを作る
    char_to_types = (
        df_srm.groupby("chara_id")["relation_type"]
        .apply(set)
        .to_dict()
    )

    fixed_ids = [cid for cid, _ in current_fixed]

    best_char = None
    best_score = -1

    # 固定キャラの relation_type をまとめて取得
    fixed_types = {cid: char_to_types.get(cid, set()) for cid in fixed_ids}

    # ペア・トリオのパターン（インデックス指定）
    pairs = [(0, 1), (0, 4), (1, 4)]
    trios = [(0, 1, 2), (0, 1, 3), (0, 4, 5), (0, 4, 6)]

    # DataFrame を使わずセット演算＋dict lookup で計算
    for candidate in candidates:
        chars = [candidate] + fixed_ids
        total = 0

        # candidate の relation_type セット
        cand_types = char_to_types.get(candidate, set())

        # --- ペア計算 ---
        for i, j in pairs:
            if chars[i] == chars[j]:
                continue
            types_i = cand_types if i == 0 else fixed_types[chars[i]]
            types_j = cand_types if j == 0 else fixed_types[chars[j]]
            common_types = types_i & types_j
            total += sum(relation_point_map[t] for t in common_types)

        # --- トリオ計算 ---
        for i, j, k in trios:
            if len({chars[i], chars[j], chars[k]}) < 3:
                continue
            types_i = cand_types if i == 0 else fixed_types[chars[i]]
            types_j = cand_types if j == 0 else fixed_types[chars[j]]
            types_k = cand_types if k == 0 else fixed_types[chars[k]]
            common_types = types_i & types_j & types_k
            total += sum(relation_point_map[t] for t in common_types)
        if DEBUG:
            print("【DEBUG】候補キャラIDs:", get_character_name(candidate),"相性値",total)
        if total > best_score:
            best_score = total
            best_char = candidate

    return best_char, int(best_score)
def score_candidates_vectorized(current_fixed, candidates):
    fixed_ids = [cid for cid, _ in current_fixed]
    fixed_types = {cid: CHAR_TO_TYPES.get(cid, set()) for cid in fixed_ids}

    pairs = [(0, 1), (0, 4), (1, 4)]
    trios = [(0, 1, 2), (0, 1, 3), (0, 4, 5), (0, 4, 6)]

    results = []

    for candidate in candidates:
        chars = [candidate] + fixed_ids
        total = 0
        cand_types = CHAR_TO_TYPES.get(candidate, set())

        # ペア計算
        for i, j in pairs:
            if chars[i] == chars[j]:
                continue
            types_i = cand_types if i == 0 else fixed_types[chars[i]]
            types_j = cand_types if j == 0 else fixed_types[chars[j]]
            total += sum(RELATION_POINT_MAP[t] for t in types_i & types_j)

        # トリオ計算
        for i, j, k in trios:
            if len({chars[i], chars[j], chars[k]}) < 3:
                continue
            types_i = cand_types if i == 0 else fixed_types[chars[i]]
            types_j = cand_types if j == 0 else fixed_types[chars[j]]
            types_k = cand_types if k == 0 else fixed_types[chars[k]]
            total += sum(RELATION_POINT_MAP[t] for t in types_i & types_j & types_k)

        _, name = get_character_name(candidate)
        results.append((name, int(total)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
def score_candidates_vectorized_numpy(current_fixed, candidates):
    fixed_ids = [cid for cid, _ in current_fixed]
    fixed_matrix = CHAR_TYPE_MATRIX[fixed_ids]  # 固定キャラの行列
    results = []

    for candidate in candidates:
        total = 0
        cand_matrix = CHAR_TYPE_MATRIX[candidate][None, :]  # 1×NUM_TYPES

        chars = [candidate] + fixed_ids
        matrices = [cand_matrix] + [CHAR_TYPE_MATRIX[cid][None, :] for cid in fixed_ids]

        # ペア計算
        for i, j in PAIRS:
            if chars[i] == chars[j]:
                continue
            types_i = matrices[i]
            types_j = matrices[j]
            inter = types_i & types_j  # AND演算で共通relation
            total += (inter * REL_POINTS).sum()

        # トリオ計算
        for i, j, k in TRIOS:
            if len({chars[i], chars[j], chars[k]}) < 3:
                continue
            types_i = matrices[i]
            types_j = matrices[j]
            types_k = matrices[k]
            inter = types_i & types_j & types_k  # AND演算
            total += (inter * REL_POINTS).sum()

        _, name = get_character_name(candidate)
        results.append((name, int(total)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
# --- 安全版ベクトル化関数 ---
def score_candidates_vectorized_safe(current_fixed, candidates):
    # 存在するIDだけ取り出す
    fixed_rows = []
    valid_fixed_ids = []
    for cid in [cid for cid, _ in current_fixed]:
        if cid in CHAR_ID_IDX:
            fixed_rows.append(CHAR_ID_IDX[cid])
            valid_fixed_ids.append(cid)
        else:
            print(f"[WARNING] fixed_id {cid} が CHAR_ID_IDX に存在しません。スキップします。")

    fixed_matrices = [CHAR_TYPE_MATRIX[r][None, :] for r in fixed_rows]

    results = []

    for candidate in candidates:
        if candidate not in CHAR_ID_IDX:
            # ID がマッピングにない場合はスコア0で名前はID文字列
            results.append((f"ID_{candidate}", 0))
            print(f"[WARNING] candidate {candidate} が CHAR_ID_IDX に存在しません。スコア0にします。")
            continue

        cand_row = CHAR_ID_IDX[candidate]
        cand_matrix = CHAR_TYPE_MATRIX[cand_row][None, :]

        chars = [candidate] + valid_fixed_ids
        matrices = [cand_matrix] + fixed_matrices

        total = 0

        # ペア計算
        for i, j in PAIRS:
            if i >= len(chars) or j >= len(chars) or chars[i] == chars[j]:
                continue
            types_i = matrices[i]
            types_j = matrices[j]
            inter = types_i & types_j
            total += (inter * REL_POINTS).sum()

        # トリオ計算
        for i, j, k in TRIOS:
            if i >= len(chars) or j >= len(chars) or k >= len(chars):
                continue
            if len({chars[i], chars[j], chars[k]}) < 3:
                continue
            types_i = matrices[i]
            types_j = matrices[j]
            types_k = matrices[k]
            inter = types_i & types_j & types_k
            total += (inter * REL_POINTS).sum()

        _, name = get_character_name(candidate)
        results.append((name, int(total)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
def score_candidates_vectorized_full(current_fixed, candidates):
    # --- 固定キャラの有効IDだけ抽出 ---
    fixed_rows = []
    valid_fixed_ids = []
    for cid, _ in current_fixed:
        if cid in CHAR_ID_IDX:
            fixed_rows.append(CHAR_ID_IDX[cid])
            valid_fixed_ids.append(cid)
        else:
            print(f"[WARNING] fixed_id {cid} が CHAR_ID_IDX に存在しません。スキップします。")

    if not valid_fixed_ids:
        print("[WARNING] 有効な固定キャラが存在しません。")

    fixed_matrix = CHAR_TYPE_MATRIX[fixed_rows]  # shape: F x T

    # --- 候補キャラ行列 ---
    valid_candidates = [cid for cid in candidates if cid in CHAR_ID_IDX]
    invalid_candidates = [cid for cid in candidates if cid not in CHAR_ID_IDX]

    cand_rows = [CHAR_ID_IDX[cid] for cid in valid_candidates]
    cand_matrix = CHAR_TYPE_MATRIX[cand_rows]  # shape: C x T

    C = cand_matrix.shape[0]
    F = fixed_matrix.shape[0]

    # --- ペア計算（C x F） ---
    # broadcastして AND → REL_POINTS * sum
    pair_scores = np.zeros(C, dtype=np.int32)
    for i, j in PAIRS:
        # i=0 は候補キャラ行列、j>0 は固定キャラ行列
        # 固定キャラとの組み合わせのみ考慮（ここでは候補-固定のみ）
        if j-1 >= F:
            continue  # fixedが少なくて無効な場合スキップ

        types_i = cand_matrix  # C x T
        types_j = fixed_matrix[j-1][None, :]  # 1 x T
        inter = types_i & types_j  # broadcast C x T
        pair_scores += (inter * REL_POINTS).sum(axis=1)

       # --- 固定キャラの有効IDだけ抽出 ---
    fixed_rows = []
    valid_fixed_ids = []
    for cid, _ in current_fixed:
        if cid in CHAR_ID_IDX:
            fixed_rows.append(CHAR_ID_IDX[cid])
            valid_fixed_ids.append(cid)
    fixed_matrix = CHAR_TYPE_MATRIX[fixed_rows]  # F x T

    # --- 候補キャラ行列 ---
    valid_candidates = [cid for cid in candidates if cid in CHAR_ID_IDX]
    invalid_candidates = [cid for cid in candidates if cid not in CHAR_ID_IDX]
    cand_rows = [CHAR_ID_IDX[cid] for cid in valid_candidates]
    cand_matrix = CHAR_TYPE_MATRIX[cand_rows]  # C x T
    cand_ids = np.array(valid_candidates)

    C = cand_matrix.shape[0]
    F = fixed_matrix.shape[0]

    # --- トリオ計算（ベクトル化） ---
    trio_scores = np.zeros(C, dtype=np.int32)

    # TRIOS: 候補インデックス、固定1インデックス、固定2インデックス
    for i_cand, j_fixed, k_fixed in TRIOS:
        if j_fixed-1 >= F or k_fixed-1 >= F:
            continue

        # 候補行列
        types_i = cand_matrix  # C x T
        types_j = fixed_matrix[j_fixed-1][None, :]  # 1 x T
        types_k = fixed_matrix[k_fixed-1][None, :]  # 1 x T
        inter = types_i & types_j & types_k  # C x T

        # 候補IDが固定IDと同じなら無効化
        fixed_id_j = valid_fixed_ids[j_fixed-1]
        fixed_id_k = valid_fixed_ids[k_fixed-1]
        invalid_mask = (cand_ids == fixed_id_j) | (cand_ids == fixed_id_k)  # C
        inter_masked = np.where(invalid_mask[:, None], 0, inter)  # C x T

        # スコア加算
        trio_scores += (inter_masked * REL_POINTS).sum(axis=1)

    total_scores = pair_scores + trio_scores

    # --- 結果作成 ---
    results = []
    for idx, cid in enumerate(valid_candidates):
        _, name = get_character_name(cid)
        results.append((name, int(total_scores[idx])))

    # 無効候補はスコア0
    for cid in invalid_candidates:
        results.append((f"ID_{cid}", 0))

    results.sort(key=lambda x: x[1], reverse=True)
    return results

def get_character_name(chara_id):
    """辞書からキャラ名を取得"""
    return (chara_id, CHAR_NAME_DICT.get(chara_id, f"ID_{chara_id}"))

# -------------------------
# 固定キャラAPI（CORS対応済み・デバッグ用ログ追加）
# -------------------------
@app.route("/api/fixed_names", methods=["GET", "POST", "OPTIONS"])
def api_fixed_names():
    if DEBUG:
        start = time.time()  # 開始時間
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
    if DEBUG:
        print("【DEBUG】current_fixed:", current_fixed)

    candidates = get_candidate_chars0(current_fixed)
    if DEBUG:
        print("【DEBUG】候補キャラIDs:", candidates)
    # 複数キャラクターのスコアをまとめる
    best_chars = []
    best_totals = []
    results = score_candidates_vectorized_full(current_fixed, candidates)
    # results = score_candidates_vectorized_safe(current_fixed, candidates)
    # results = score_candidates_vectorized_numpy(current_fixed, candidates)
    #results = score_candidates_vectorized(current_fixed, candidates)
    #best_char, best_total = find_best_candidate_pandas_vectorized(current_fixed, candidates)
    #best_char, best_total = find_best_candidate_pandas(current_fixed, candidates)
    #best_char, best_total = find_best_candidate_parallel(current_fixed, candidates)
    #best_char, best_total = find_best_candidate(current_fixed, candidates)

    # if best_char is None:
    #     return jsonify({"best_character": None, "score": best_total})

    # _, name = get_character_name(best_char)
    # if DEBUG:
    #     print(f"【DEBUG】最終 best_char={best_char}, 名前={name}, スコア={best_total}")

    # #return jsonify({"best_character": name, "score": best_total})
    # return jsonify({"best_character": name, "score": int(best_total)})
    best_chars, best_totals = zip(*results) if results else ([], [])
    if DEBUG:
        end = time.time()  # 終了時間
    if DEBUG:
        print(f"[INFO] /api/fixed_names 処理時間: {end - start:.4f} 秒")
    return jsonify({
    "characters": list(best_chars),
    "scores": list(best_totals)
})

# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
