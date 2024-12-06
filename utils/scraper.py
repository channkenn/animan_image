import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def fetch_images_and_title(thread_url):
    """URLから画像、ソースURL、スレッドタイトルを取得"""
    try:
        response = requests.get(thread_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        title = soup.title.string if soup.title else "タイトルなし"

        images = []
        for img in soup.find_all("img"):
            src = img.get("src")
            if src:
                # 完全なURLを構築
                thumb_url = urljoin(thread_url, src)  # 元のURL (/thumb_m/)

                # thumb_mをimgに変換
                img_url = thumb_url
                if "thumb_m" in thumb_url:
                    img_url = thumb_url.replace("/thumb_m/", "/img/")

                # /storage/ を削除
                if "/storage/" in img_url:
                    img_url = img_url.replace("/storage", "")

                # 元のURL (thumb_url) と変換後のURL (img_url) をリストに格納
                images.append((thumb_url, img_url))
        return title, images
    except Exception as e:
        return f"エラーが発生しました: {e}", []
