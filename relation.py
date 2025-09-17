# relation.py
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from app import DB_PATH, CHAR_DICT, EXCLUDE_IDS, INCLUDE_IDS, DEBUG
from app import names_to_fixed_chars, get_candidate_chars0, find_best_candidate_pandas_vectorized, get_character_name

# -------------------------------------------------
# 固定キャラ処理用関数
# -------------------------------------------------
def process_fixed_names(data):
    """
    data: dict, {"names": [6名の名前]}
    戻り値: (json_dict, http_status)
    """
    # OPTIONS は app.py で処理
    if not data or "names" not in data:
        return {"error": "JSON body with 'names' required"}, 400

    names = data["names"]
    if len(names) != 6:
        return {"error": "6名分の名前を送信してください"}, 400

    try:
        current_fixed = names_to_fixed_chars(names)
    except ValueError as e:
        return {"error": str(e)}, 400

    if DEBUG:
        print("【DEBUG】current_fixed:", current_fixed)

    candidates = get_candidate_chars0(current_fixed)
    if DEBUG:
        print("【DEBUG】候補キャラIDs:", candidates)

    best_char, best_total = find_best_candidate_pandas_vectorized(current_fixed, candidates)
    if best_char is None:
        return {"best_character": None, "score": best_total}, 200

    _, name = get_character_name(best_char)
    if DEBUG:
        print(f"【DEBUG】最終 best_char={best_char}, 名前={name}, スコア={best_total}")

    return {"best_character": name, "score": int(best_total)}, 200
