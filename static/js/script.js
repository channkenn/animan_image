// お気に入り画像を追加する
function addToFavorites(thumbUrl, imgUrl, resNumber, resLink) {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    // 同じ imgUrl がすでに favorites にあるかチェック 20241213 重複不可対応
    const isDuplicate = favorites.some(fav => fav.imgUrl === imgUrl);
    
    if (isDuplicate) {
        alert("この画像はすでにお気に入りに追加されています");
        return;  // 重複しているので何もせずに終了
    }

    // 重複していない場合は画像を追加
    favorites.push({ thumbUrl, imgUrl, resNumber, resLink });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("画像一覧に追加されました");
}


// お気に入り画像の一覧を表示する
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const favoritesContainer = document.getElementById("favorites-container");
    
    // コンテナが存在しない場合は処理を中断
    if (!favoritesContainer) {
        console.warn("favorites-container 要素が見つかりません");
        return;
    }

    console.log(favorites);
    console.log(favoritesContainer);
    favoritesContainer.innerHTML = ""; // 既存のリストをクリア

    favorites.forEach(fav => {
        console.log(fav);
        const card = document.createElement("div");
        card.classList.add("card");
    
        card.innerHTML = `
        <!-- 2024年12月11日 thumbはcacheに残すようにした -->
        <!-- <img src="${encodeURI(fav.thumbUrl)}?nocache=${new Date().getTime()}" alt="お気に入り画像"> -->
            <!-- 20241213 img_urlが外部リンクかが増加を判定してaltをOutlinkかImageにする -->
            <!-- <img src="${encodeURI(fav.thumbUrl)}" alt="お気に入り画像"  onclick="viewImage('${encodeURI(fav.imgUrl)}')"> -->
            <img src="${encodeURI(fav.thumbUrl)}"
                alt="${fav.imgUrl.includes('/img') ? 'Image' : 'Outlink'}"
                onclick="viewImage('${encodeURI(fav.imgUrl)}')">


            <div class="card-body">
                <div class="res-number-container">
                    <a href="${encodeURI(fav.resLink)}" target="_blank" class="link-res-number" title="スレッドリンク">
                        >>${encodeURI(fav.resNumber)}
                    </a>
                </div>
                <div class="button-container">
                    <!-- コピーボタン（アイコン形式） -->
                    <button class="copy-btn" onclick="copyToClipboard('${encodeURI(fav.imgUrl)}')" title="コピー">
                        <img src="static/icons/copy-icon.png" alt="コピーアイコン" style="width: 24px; height: 24px;">
                    </button>
                    
                    <!-- 削除ボタン（アイコン形式） -->
                    <button class="remove-btn" onclick="removeFavorite('${encodeURI(fav.imgUrl)}')" title="削除">
                        <img src="static/icons/delete-icon.png" alt="削除アイコン" style="width: 24px; height: 24px;">
                    </button>
                </div>
            </div>

        `;
    
        favoritesContainer.appendChild(card);
    });
    
}



// お気に入り画像を削除する
function removeFavorite(imgSrc) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(fav => fav.imgUrl !== imgSrc);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    loadFavorites(); // 削除後にリストを更新
}

// スレッドをお気に入りに追加する
function addThreadToFavorites(threadTitle, threadUrl, threadThumb) {
    const favoriteThreads = JSON.parse(localStorage.getItem("favoriteThreads")) || [];

    // 同じ threadUrl がすでに favoriteThreads にあるかチェック 20241213 重複不可対応
    const isDuplicate = favoriteThreads.some(thread => thread.url === threadUrl);
    
    if (isDuplicate) {
        alert("このスレッドはすでにお気に入りに追加されています");
        return;  // 重複しているので何もせずに終了
    }

    // 重複していない場合はスレッドを追加
    favoriteThreads.push({ title: threadTitle, url: threadUrl, thumb: threadThumb });
    localStorage.setItem("favoriteThreads", JSON.stringify(favoriteThreads));
    alert("スレッド一覧に追加されました");
}


// お気に入りスレッドの一覧を表示する
function displayFavoriteThreads() {
    try {
        const favoriteThreads = JSON.parse(localStorage.getItem("favoriteThreads")) || [];
        const container = document.getElementById("threads-container");

        if (!container) {
            console.warn("threads-container 要素が見つかりません");
            return;
        }

        if (favoriteThreads.length === 0) {
            container.innerHTML = "<p>お気に入りスレッドがありません</p>";
        } else {
            container.innerHTML = ""; // 既存の内容をクリア
            favoriteThreads.forEach(thread => {
                const card = document.createElement("div");
                card.classList.add("card");
                card.innerHTML = `
                    <!-- 2024年12月11日 thumbはcacheに残すようにした -->
                    <!-- <img src="${encodeURI(thread.thumb)}?nocache=${new Date().getTime()}" alt="${thread.title}" class="thread-thumb"> -->
                    <img src="${encodeURI(thread.thumb)}" alt="${thread.title}" class="thread-thumb">
                    <div class="card-body">
                        <a href="${thread.url}" target="_blank">${thread.title}</a>
                        <div class="button-container">
                            <!-- スレッド画像一覧ボタン（アイコン形式） -->
                            <button onclick="viewThread('${thread.url}')" title="スレッド画像一覧">
                                <img src="static/icons/image-icon.png" alt="スレッド画像一覧アイコン" style="width: 24px; height: 24px;">
                            </button>
                            
                            <!-- 削除ボタン（アイコン形式） -->
                            <button class="remove-btn" onclick="removeThread('${thread.url}')" title="削除">
                                <img src="static/icons/delete-icon.png" alt="削除アイコン" style="width: 24px; height: 24px;">
                            </button>                        </div>
                    </div>
                        `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
}



// お気に入りスレッドを削除する
function removeThread(url) {
    const favoriteThreads = JSON.parse(localStorage.getItem("favoriteThreads")) || [];
    const updatedThreads = favoriteThreads.filter(thread => thread.url !== url);
    localStorage.setItem("favoriteThreads", JSON.stringify(updatedThreads));
    displayFavoriteThreads(); // リストを再描画
}

// お気に入りスレッドを表示する
function viewThread(url) {
    window.location.href = `/view-thread?url=${encodeURIComponent(url)}`;
}

// URLをクリップボードにコピーする
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("URLをコピーしました: " + text);
    }).catch(err => {
        alert("コピーに失敗しました: " + err);
    });
}
// 20241212 <img> タグをクリックしたときに image.img_url をブラウザで表示する
function viewImage(imageUrl) {
    console.log("Image URL: " + imageUrl); // ここでURLを確認
    // `a`要素を動的に作成
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank'; // 新しいタブで開く

    // `a`要素をDOMに追加し、クリックイベントをトリガーする
    document.body.appendChild(link);
    link.click();

    // 使用後に`a`要素を削除
    document.body.removeChild(link);
}
// 絞り込み機能
function filterCards(filterType, clickedButton) {
    const cards = document.querySelectorAll('.card');
    const buttons = document.querySelectorAll('.filter-button');

    // カードの表示/非表示
    cards.forEach(card => {
        const imgElement = card.querySelector('img');
        const altText = imgElement.getAttribute('alt');

        if (filterType === 'all' || altText === filterType) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // ボタンの状態を更新
    buttons.forEach(button => button.classList.remove('active'));
    clickedButton.classList.add('active');
}

// 20241214 ブックマークレット対応
// URLパラメータを取得
const urlParams = new URLSearchParams(window.location.search);

// 'autofill' パラメータが 'true' の場合に処理を実行
if (urlParams.get('autofill') === 'true') {
  // 'source' パラメータの値を取得
  const source = urlParams.get('source');
  
  // 'source' パラメータが存在するかつ、信頼できるドメインかを確認
  if (source) {
    const allowedDomains = ['linguistic-sherilyn-animanimage-50068fef.koyeb.app', 'bbs.animanch.com'];
    try {
      const urlObj = new URL(source);
      if (allowedDomains.includes(urlObj.hostname)) {
        // サニタイズしてから、inputフィールドに値を設定
        document.querySelector('input[name="url"][id="url"]').value = decodeURIComponent(source);
      } else {
        console.error('不正なリダイレクト先');
      }
    } catch (e) {
      console.error('無効なURL');
    }
  }
}



// DOM読み込み後に各関数を実行
document.addEventListener("DOMContentLoaded", function () {
    const addThreadButton = document.getElementById("add-thread-btn");
    if (addThreadButton) {
        addThreadButton.addEventListener("click", function () {
            // ボタンのデータ属性から情報を取得
            const threadUrl = addThreadButton.getAttribute("data-thread-url");
            const threadTitle = addThreadButton.getAttribute("data-thread-title");
            const threadThumb = addThreadButton.getAttribute("data-thread-thumb");
            // 取得した情報を使用
            addThreadToFavorites(threadTitle, threadUrl, threadThumb);
        });
    }

    // お気に入り画像とスレッドの一覧を表示
    loadFavorites();
    displayFavoriteThreads();
});
