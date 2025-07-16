import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def fetch_images_and_title(thread_url):
    """URLから画像、ソースURL、レス番号、レスリンク、スレッドタイトルを取得"""
    try:
        response = requests.get(thread_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        # スレッドタイトルを取得
        title = soup.title.string if soup.title else "タイトルなし"

        images_and_reslinks = []
        for li in soup.find_all("li", class_="list-group-item"):
            # すべての画像のサムネイルURLを取得
            img_tags = li.find_all("img")
            if not img_tags:
                continue

            for img_tag in img_tags:
                thumb_url = urljoin(thread_url, img_tag.get("src"))
                img_url = thumb_url.replace("/thumb_m/", "/img/") if "thumb_m" in thumb_url else thumb_url
                img_url = img_url.replace("/storage", "")
                img_url = img_url.replace("/arc", "") #20250705追加機能

                # レス番号を取得
                res_number_tag = li.find("span", class_="resnumber")
                res_number = res_number_tag.text.strip() if res_number_tag else None

                # レスリンクを生成
                res_link = f"{thread_url}#{li.get('id')}" if li.get('id') else None

                images_and_reslinks.append({
                    "thumb_url": thumb_url,
                    "img_url": img_url,
                    "res_number": res_number,
                    "res_link": res_link
                })

        return title, images_and_reslinks

    except Exception as e:
        return f"エラーが発生しました: {e}", []

