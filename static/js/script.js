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
            <div class="image-container">
                <img src="${encodeURI(fav.thumbUrl)}"
                    alt="${fav.imgUrl.includes('/img') ? 'Image' : 'Outlink'}"
                    onclick="viewImage('${encodeURI(fav.imgUrl)}')">
                <div class="overlay" onclick="viewImage('${encodeURI(fav.imgUrl)}')">
                    元img表示
                </div>
            </div>

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
                    <!-- 画像クリックでスレッド画像一覧にジャンプ -->
                    <div class="image-container">
                        <!-- 画像クリックでスレッド画像一覧にジャンプ -->
                        <img src="${encodeURI(thread.thumb)}" alt="${thread.title}" class="thread-thumb" onclick="viewThread('${thread.url}')">
                        <div class="overlay" onclick="viewThread('${thread.url}')">
                            スレッド内画像一覧
                        </div>
                    </div>
                    <div class="card-body">
                        <a href="${encodeURI(thread.url)}" target="_blank">${thread.title}</a>
                        <div class="button-container">
                            <!-- クリップボードにURLをコピーするボタン -->
                            <!-- ボタンのonclickで正確にURLを渡す -->
                            <button class="copy-btn" onclick="copyToClipboard('${encodeURI(thread.url)}')" title="コピー">
                                <img src="static/icons/copy-icon.png" alt="コピーアイコン" style="width: 24px; height: 24px;">
                            </button>

                            <!-- 削除ボタン（アイコン形式） -->
                            <button class="remove-btn" onclick="removeThread('${thread.url}')" title="削除">
                                <img src="static/icons/delete-icon.png" alt="削除アイコン" style="width: 24px; height: 24px;">
                            </button>
                        </div>
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
    if (navigator.clipboard && window.isSecureContext) {
        // クリップボードAPIが使える場合
        navigator.clipboard.writeText(text).then(() => {
            alert("URLをコピーしました: " + text);
        }).catch(err => {
            alert("コピーに失敗しました: " + err);
        });
    } else {
        // クリップボードAPIが使えない場合
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select(); // textareaの内容を選択

        try {
            // クリップボードへのコピーを試みる
            document.execCommand("copy");
            alert("URLをコピーしました: " + text);
        } catch (err) {
            alert("コピーに失敗しました: " + err);
            console.error("execCommandによるコピーエラー:", err);
        }

        document.body.removeChild(textArea);
    }
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
// ボタンをクリックしたときにブックマークレットリンクを表示
function addBookmarklet() {
    const bookmarkletLink = `javascript:(function(){window.location.href='https://linguistic-sherilyn-animanimage-50068fef.koyeb.app/?autofill=true&source='+encodeURIComponent(window.location.href);})();`;

    // ブックマークレットリンクを表示する
    const bookmarkLinkElement = document.getElementById('bookmarkLink');
    if (bookmarkLinkElement) {
        // リンクの内容を更新
        bookmarkLinkElement.querySelector('a').href = bookmarkletLink;

        // リンクを表示する
        bookmarkLinkElement.style.display = 'block';
    }

    // アラートでリンクを表示
   // alert("ブックマークレットリンクが作成されました: " + bookmarkletLink);
}


// ハンバーガーメニューのクリックイベント
document.querySelector('.hamburger-menu').addEventListener('click', function() {
    const leftSidebar = document.querySelector('.left-column');
    const rightSidebar = document.querySelector('.right-column');
    // サイドバーの表示・非表示を切り替える
    leftSidebar.style.display = (leftSidebar.style.display === 'none' || leftSidebar.style.display === '') ? 'block' : 'none';
    rightSidebar.style.display = (rightSidebar.style.display === 'none' || rightSidebar.style.display === '') ? 'block' : 'none';
});

// UTF-8文字列をBase64エンコードする関数
function utf8ToBase64(str) {
    const encoder = new TextEncoder();  // UTF-8エンコードを行う
    const bytes = encoder.encode(str); // Uint8Arrayに変換
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary); // btoaでBase64エンコード
}

// ローカルストレージからfavoritesデータを取得
function exportFavoritesData() {
    const favorites = localStorage.getItem('favorites');

    if (!favorites) {
        alert("必要なデータがローカルストレージにありません (Favorites)");
        return;
    }

    // データをJSON形式に変換
    const data = { favorites: JSON.parse(favorites) };

    // データを圧縮 (LZStringを使用)
    const compressedData = LZString.compressToUTF16(JSON.stringify(data));

    // 圧縮されたデータをUTF-8 → Base64エンコード
    const base64Data = utf8ToBase64(compressedData);

    // Base64エンコードされたデータをクリップボードにコピー
    navigator.clipboard.writeText(base64Data)
    .then(() => {
        alert("画像一覧がクリップボードにエクスポートされました！");
    })
    .catch((error) => {
        alert("クリップボードへのエクスポートに失敗しました: " + error);
    });
}

// ローカルストレージからfavoriteThreadsデータを取得
function exportFavoriteThreadsData() {
    const favoriteThreads = localStorage.getItem('favoriteThreads');

    if (!favoriteThreads) {
        alert("必要なデータがローカルストレージにありません (Favorite Threads)");
        return;
    }

    // データをJSON形式に変換
    const data = { favoriteThreads: JSON.parse(favoriteThreads) };

    // データを圧縮 (LZStringを使用)
    const compressedData = LZString.compressToUTF16(JSON.stringify(data));

    // 圧縮されたデータをUTF-8 → Base64エンコード
    const base64Data = utf8ToBase64(compressedData);

    // Base64エンコードされたデータをクリップボードにコピー
    navigator.clipboard.writeText(base64Data)
        .then(() => {
            alert("スレッド一覧がクリップボードにエクスポートされました！");
        })
        .catch((error) => {
            alert("クリップボードへのエクスポートに失敗しました: " + error);
        });
}

// エクスポートボタンをクリックで呼び出す
//document.getElementById('exportFavoritesButton').addEventListener('click', exportFavoritesData);
//document.getElementById('exportFavoriteThreadsButton').addEventListener('click', exportFavoriteThreadsData);

// Base64データをインポートする関数（共通）
function importData(dataType) {
    let inputData;
    let storageKey;

    // favoritesまたはfavoriteThreadsに応じたデータ取得
    if (dataType === 'favorites') {
        inputData = document.getElementById('importFavorites').value;
        storageKey = 'favorites';
    } else if (dataType === 'favoriteThreads') {
        inputData = document.getElementById('importFavoriteThreads').value;
        storageKey = 'favoriteThreads';
    }

    // 入力されたデータがない場合はアラートを出す
    if (!inputData) {
        alert(`データを入力してください`);
        return;
    }

    try {
        // Base64 → 圧縮解除 → JSON
        const decodedData = base64ToUtf8(inputData); // Base64デコード
        const decompressedData = LZString.decompressFromUTF16(decodedData); // 圧縮解除
        const jsonData = JSON.parse(decompressedData); // JSONに変換

        // ローカルストレージから既存データを取得
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // jsonDataが配列の場合にのみ処理を行う
        if (Array.isArray(jsonData)) {
            // 重複を除外するためのセットを作成
            const dataSet = new Set(existingData.map(item => item.img_url || item.thread_url)); // URLで重複チェック

            // データから重複を除外して追加
            const uniqueData = jsonData.filter(item => !dataSet.has(item.img_url || item.thread_url));

            // 既存データに新しいデータを追加
            existingData.push(...uniqueData);
        } else if (jsonData.hasOwnProperty(storageKey)) {
            // jsonDataがオブジェクトで特定のキーが存在する場合
            const newData = jsonData[storageKey];
            const dataSet = new Set(existingData.map(item => item.img_url || item.thread_url));

            // 重複を除外して新しいデータを追加
            const uniqueData = newData.filter(item => !dataSet.has(item.img_url || item.thread_url));
            existingData.push(...uniqueData);
        } else {
            throw new Error('Invalid data structure');
        }

        // 更新したデータをローカルストレージに保存
        localStorage.setItem(storageKey, JSON.stringify(existingData));

        alert(`${storageKey} のデータインポートが完了しました`);
    } catch (e) {
        alert("インポート中にエラーが発生しました: " + e.message);
    }
}

// インポートボタンのクリックイベント
//document.getElementById('importFavoritesButton').addEventListener('click', () => importData('favorites'));
//document.getElementById('importFavoriteThreadsButton').addEventListener('click', () => importData('favoriteThreads'));

// Base64をUTF-8にデコードする関数
function base64ToUtf8(base64) {
    const decodedString = atob(base64); // Base64をデコード
    const byteArray = new Uint8Array(decodedString.length);
    for (let i = 0; i < decodedString.length; i++) {
        byteArray[i] = decodedString.charCodeAt(i);
    }
    return new TextDecoder().decode(byteArray); // UTF-8に変換
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
    // エクスポートボタンの要素を取得
    const exportFavoritesButton = document.getElementById('exportFavoritesButton');
    
    // ボタンが存在する場合のみイベントリスナーを追加
    if (exportFavoritesButton) {
        exportFavoritesButton.addEventListener('click', exportFavoritesData);
    }
    
    const exportFavoriteThreadsButton = document.getElementById('exportFavoriteThreadsButton');
    if (exportFavoriteThreadsButton) {
        exportFavoriteThreadsButton.addEventListener('click', exportFavoriteThreadsData);
    }
    const importFavoritesButton = document.getElementById('importFavoritesButton');
    
    if (importFavoritesButton) {
        importFavoritesButton.addEventListener('click', () => importData('favorites'));
    }
    
    const importFavoriteThreadsButton = document.getElementById('importFavoriteThreadsButton');
    if (importFavoriteThreadsButton) {
        importFavoriteThreadsButton.addEventListener('click', () => importData('favoriteThreads'));
    }
    // お気に入り画像とスレッドの一覧を表示
    loadFavorites();
    displayFavoriteThreads();
});
