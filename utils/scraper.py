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
                img_url = urljoin(thread_url, src)

                # thumb_mをimgに変換
                if "thumb_m" in img_url:
                    img_url = img_url.replace("/thumb_m/", "/img/")

                # /storage/ を削除
                if "/storage/" in img_url:
                    img_url = img_url.replace("/storage", "")

                images.append((img, img_url))
        return title, images
    except Exception as e:
        return f"エラーが発生しました: {e}", []
