// マイグレーションコード localstrage.favoriteThreadsにdate情報を追加する
(function migrateFavoriteThreads() {
  let favoriteThreads = JSON.parse(
    localStorage.getItem("favoriteThreads") || "[]"
  );

  // マイグレーション処理: date, register, count プロパティがない場合にデフォルト値を追加
  favoriteThreads = favoriteThreads.map((thread) => {
    if (!thread.date) {
      thread.date = "1970-01-01T00:00:00.000Z"; // デフォルト値
    }
    if (!thread.register) {
      thread.register = "1970-01-01T00:00:00.000Z"; // デフォルト値
    }
    if (!thread.count) {
      thread.count = "0"; // デフォルト値
    }
    return thread;
  });

  // ローカルストレージを更新
  localStorage.setItem("favoriteThreads", JSON.stringify(favoriteThreads));
})();
// マイグレーションコード localstrage.favoritesにdate情報を追加する
(function migrateFavorites() {
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  // マイグレーション処理: date, register, count プロパティがない場合にデフォルト値を追加
  favorites = favorites.map((favorite) => {
    if (!favorite.date) {
      favorite.date = "1970-01-01T00:00:00.000Z"; // デフォルト値
    }
    if (!favorite.register) {
      favorite.register = "1970-01-01T00:00:00.000Z"; // デフォルト値
    }
    if (!favorite.count) {
      favorite.count = "0"; // デフォルト値
    }
    return favorite;
  });

  // ローカルストレージを更新
  localStorage.setItem("favorites", JSON.stringify(favorites));
})();

// #region 画像一覧のfunction群 ここから
// お気に入り画像を追加する
function addToFavorites(thumbUrl, imgUrl, resNumber, resLink) {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  // 同じ imgUrl がすでに favorites にあるかチェック 20241213 重複不可対応
  const isDuplicate = favorites.some((fav) => fav.imgUrl === imgUrl);

  if (isDuplicate) {
    alert("この画像はすでにお気に入りに追加されています");
    return; // 重複しているので何もせずに終了
  }
  const nowtime = new Date().toISOString();
  // 重複していない場合は画像を追加
  favorites.push({
    thumbUrl,
    imgUrl,
    resNumber,
    resLink,
    date: nowtime, // 現在時刻を追加
    register: nowtime,
    count: "0",
  });
  localStorage.setItem("favorites", JSON.stringify(favorites));
  alert("画像一覧に追加されました");
}
// お気に入り画像の一覧を表示する
function loadFavorites() {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const favoritesContainer = document.getElementById("favorites-container");

  // コンテナが存在しない場合は処理を中断
  if (!favoritesContainer) {
    console.warn("favorites-container 要素が見つかりません");
    return;
  }
  if (favorites.length === 0) {
    container.innerHTML = "<p>お気に入り画像がありません</p>";
  } else {
    // ソート
    favorites = sortThreads(favorites, currentSortCriteria, currentSortOrder);
  }
  favoritesContainer.innerHTML = ""; // 既存のリストをクリア

  favorites.forEach((fav) => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
        <!-- 2024年12月11日 thumbはcacheに残すようにした -->
        <!-- <img src="${encodeURI(
          fav.thumbUrl
        )}?nocache=${new Date().getTime()}" alt="お気に入り画像"> -->
            <!-- 20241213 img_urlが外部リンクかが増加を判定してaltをOutlinkかImageにする -->
            <!-- <img src="${encodeURI(
              fav.thumbUrl
            )}" alt="お気に入り画像"  onclick="viewImage('${encodeURI(
      fav.imgUrl
    )}')"> -->
            <div class="image-container">
                <img src="${encodeURI(fav.thumbUrl)}"
                    alt="${fav.imgUrl.includes("/img") ? "Image" : "Outlink"}"
                    onclick="viewImage('${encodeURI(
                      fav.imgUrl
                    )}'); updateFavoriteDate('${fav.imgUrl}')">
                <div class="overlay" onclick="viewImage('${encodeURI(
                  fav.imgUrl
                )}'); updateFavoriteDate('${fav.imgUrl}')">
                    元img表示
                </div>
            </div>

            <div class="card-body">
                <div class="res-number-container">
                    <a href="${encodeURI(
                      fav.resLink
                    )}" target="_blank" class="link-res-number" title="スレッドリンク" onclick="updateFavoriteDate('${
      fav.imgUrl
    }')">
                        >>${encodeURI(fav.resNumber)}
                    </a>
                </div>
                <div class="button-container">
                    <!-- コピーボタン（アイコン形式） -->
                    <button class="copy-btn" onclick="copyToClipboard('${encodeURI(
                      fav.imgUrl
                    )}'); updateFavoriteDate('${fav.imgUrl}')" title="コピー">
                        <img src="static/icons/copy-icon.png" alt="コピーアイコン" style="width: 24px; height: 24px;">
                    </button>
                    
                    <!-- 削除ボタン（アイコン形式） -->
                    <button class="remove-btn" onclick="removeFavorite('${encodeURI(
                      fav.imgUrl
                    )}')" title="削除">
                        <img src="static/icons/delete-icon.png" alt="削除アイコン" style="width: 24px; height: 24px;">
                    </button>
                </div>
            </div>

        `;

    favoritesContainer.appendChild(card);
  });
}
// #endregion 画像一覧のfunction群 ここまで

// #region クリエイティブ用のfunction群 ここから
// 20241220 クリエイティブ用画像の一覧を表示 --start
// お気に入り画像の一覧を表示する
function loadFavoritesCreative() {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const favoritesContainer = document.getElementById(
    "favoritesCreative-container"
  );

  // コンテナが存在しない場合は処理を中断
  if (!favoritesContainer) {
    console.warn("favoritesCreative-container 要素が見つかりません");
    return;
  }

  console.log(favorites);
  console.log(favoritesContainer);
  favoritesContainer.innerHTML = ""; // 既存のリストをクリア

  favorites.forEach((fav) => {
    console.log(fav);
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
          <!-- 2024年12月11日 thumbはcacheに残すようにした -->
          <!-- <img src="${encodeURI(
            fav.thumbUrl
          )}?nocache=${new Date().getTime()}" alt="お気に入り画像"> -->
              <!-- 20241213 img_urlが外部リンクかが増加を判定してaltをOutlinkかImageにする -->
              <!-- <img src="${encodeURI(
                fav.thumbUrl
              )}" alt="お気に入り画像"  onclick="viewImage('${encodeURI(
      fav.imgUrl
    )}')"> -->
              <div class="image-container">
                  <img src="${encodeURI(fav.thumbUrl)}"
                      alt="${fav.imgUrl.includes("/img") ? "Image" : "Outlink"}"
                      onclick="viewImage('${encodeURI(fav.imgUrl)}')">
                  <div class="overlay" onclick="viewImage('${encodeURI(
                    fav.imgUrl
                  )}')">
                      元img表示
                  </div>
              </div>
  
              <div class="card-body">
                  <div class="res-number-container">
                      <a href="${encodeURI(
                        fav.resLink
                      )}" target="_blank" class="link-res-number" title="スレッドリンク">
                          >>${encodeURI(fav.resNumber)}
                      </a>
                  </div>
                  <div class="button-container">
                      <!-- コピーボタン（アイコン形式） -->
                      <button class="copy-btn" onclick="copyToClipboardCreative('${encodeURI(
                        fav.imgUrl
                      )}')" title="コピー">
                          <img src="static/icons/copy-icon.png" alt="コピーアイコン" style="width: 24px; height: 24px;">
                      </button>
                      
                      <!-- 削除ボタン（アイコン形式） -->
                      <button class="remove-btn" onclick="removeFavorite('${encodeURI(
                        fav.imgUrl
                      )}')" title="削除">
                          <img src="static/icons/delete-icon.png" alt="削除アイコン" style="width: 24px; height: 24px;">
                      </button>
                  </div>
              </div>
  
          `;

    favoritesContainer.appendChild(card);
  });
}
// 20241220 クリエイティブ用画像の一覧を表示 --end
// お気に入り画像を削除する
function removeFavorite(imgSrc) {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  favorites = favorites.filter((fav) => fav.imgUrl !== imgSrc);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  loadFavorites(); // 削除後にリストを更新
}
// #endregion クリエイティブ用のfunction群 ここまで

// #region スレッド一覧のfunction群 ここから
// スレッドをお気に入りに追加する
function addThreadToFavorites(threadTitle, threadUrl, threadThumb) {
  const favoriteThreads =
    JSON.parse(localStorage.getItem("favoriteThreads")) || [];

  // 同じ threadUrl がすでに favoriteThreads にあるかチェック 20241213 重複不可対応
  const isDuplicate = favoriteThreads.some(
    (thread) => thread.url === threadUrl
  );

  if (isDuplicate) {
    alert("このスレッドはすでにお気に入りに追加されています");
    return; // 重複しているので何もせずに終了
  }
  const nowtime = new Date().toISOString();
  // 重複していない場合はスレッドを追加
  favoriteThreads.push({
    title: threadTitle,
    url: threadUrl,
    thumb: threadThumb,
    date: nowtime,
    register: nowtime,
    count: 0,
  });
  localStorage.setItem("favoriteThreads", JSON.stringify(favoriteThreads));
  alert("スレッド一覧に追加されました");
}
// お気に入りスレッドの一覧を表示する
function displayFavoriteThreads() {
  try {
    let favoriteThreads =
      JSON.parse(localStorage.getItem("favoriteThreads")) || [];
    const container = document.getElementById("threads-container");

    if (!container) {
      console.warn("threads-container 要素が見つかりません");
      return;
    }

    if (favoriteThreads.length === 0) {
      container.innerHTML = "<p>お気に入りスレッドがありません</p>";
    } else {
      // ソート
      favoriteThreads = sortThreads(
        favoriteThreads,
        currentSortCriteria,
        currentSortOrder
      );

      // 描画
      container.innerHTML = ""; // 既存の内容をクリア
      favoriteThreads.forEach((thread) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
          <div class="image-container">
              <img src="${encodeURI(thread.thumb)}" alt="${
          thread.title
        }" class="thread-thumb" onclick="viewThread('${
          thread.url
        }'); updateThreadDate('${thread.url}')">
              <div class="overlay" onclick="viewThread('${
                thread.url
              }'); updateThreadDate('${thread.url}')">
                  スレッド内画像一覧
              </div>
          </div>
          <div class="card-body">
              <a href="${encodeURI(
                thread.url
              )}" target="_blank" onclick="updateThreadDate('${thread.url}')">${
          thread.title
        }</a>
              <p>${
                thread.date ? new Date(thread.date).toLocaleString() : ""
              }</p>
              <div class="button-container">
                            <!-- クリップボードにURLをコピーするボタン -->
                            <!-- ボタンのonclickで正確にURLを渡す -->
                            <button class="copy-btn" onclick="copyToClipboard('${encodeURI(
                              thread.url
                            )}'); updateThreadDate('${
          thread.url
        }')" title="コピー">
                                <img src="static/icons/copy-icon.png" alt="コピーアイコン" style="width: 24px; height: 24px;">
                            </button>

                            <!-- 削除ボタン（アイコン形式） -->
                            <button class="remove-btn" onclick="removeThread('${
                              thread.url
                            }')" title="削除">
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
  const favoriteThreads =
    JSON.parse(localStorage.getItem("favoriteThreads")) || [];
  const updatedThreads = favoriteThreads.filter((thread) => thread.url !== url);
  localStorage.setItem("favoriteThreads", JSON.stringify(updatedThreads));
  displayFavoriteThreads(); // リストを再描画
}
// お気に入りスレッドを表示する
function viewThread(url) {
  window.location.href = `/view-thread?url=${encodeURIComponent(url)}`;
}
// 現在のソート状態を保持 20241228
let currentSortCriteria = "date";
let currentSortOrder = "desc"; // "asc" or "desc"

// ソート基準を設定して再描画 20241228
// ソート基準を設定して再描画
function setSortCriteria(criterion) {
  if (currentSortCriteria === criterion) {
    // 同じ基準を選択した場合は順序を切り替え
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
  } else {
    // 基準を変更
    currentSortCriteria = criterion;
    currentSortOrder = "desc"; // デフォルトは降順
  }

  // 呼び出し元に応じて再描画
  if (document.location.pathname.endsWith("/favorites")) {
    loadFavorites();
  } else {
    displayFavoriteThreads();
  }
}

// ソート関数 20241228
function sortThreads(threads, criterion = "date", order = "desc") {
  return threads.sort((a, b) => {
    if (criterion === "date") {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === "desc" ? dateB - dateA : dateA - dateB;
    } else if (criterion === "register") {
      const dateA = new Date(a.register);
      const dateB = new Date(b.register);
      return order === "desc" ? dateB - dateA : dateA - dateB;
    } else if (criterion === "title") {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      if (titleA < titleB) return order === "asc" ? -1 : 1;
      if (titleA > titleB) return order === "asc" ? 1 : -1;
      return 0;
    } else if (criterion === "count") {
      const countA = a.count || 0; // 初期値がない場合は 0 を使用
      const countB = b.count || 0;
      return order === "desc" ? countB - countA : countA - countB;
    }
    return 0;
  });
}
// #endregion スレッド一覧のfunction群 ここまで

// #region Utilityだとおもう ここから
// ローカルストレージのfavoritesの日時とcountを更新 20241229
function updateFavoriteDate(url) {
  // ローカルストレージのfavoritesを取得
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  // 対象アイテムの`date`を現在時刻で更新
  const favoriteIndex = favorites.findIndex((item) => item.imgUrl === url);
  if (favoriteIndex !== -1) {
    favorites[favoriteIndex].date = new Date().toISOString(); // 現在時刻をISO形式で保存

    // countをインクリメント (文字列の場合を考慮して数値に変換)
    const currentCount = parseInt(favorites[favoriteIndex].count || 0, 10);
    favorites[favoriteIndex].count = currentCount + 1;

    // ローカルストレージを更新
    localStorage.setItem("favorites", JSON.stringify(favorites));

    // デバッグ情報を出力
    console.log("Updated date and count for:", url);
    console.log("After update:", favorites[favoriteIndex]);
  } else {
    console.warn("Item not found in favorites:", url);
  }
}

// ローカルストレージのfavoriteThreadsの日時を更新 20241229
//ついでにカウンタも更新 20241229
function updateThreadDate(url) {
  // ローカルストレージのfavoriteThreadsを取得
  const favoriteThreads =
    JSON.parse(localStorage.getItem("favoriteThreads")) || [];

  // 対象スレッドの`date`を現在時刻で更新
  const threadIndex = favoriteThreads.findIndex((thread) => thread.url === url);
  if (threadIndex !== -1) {
    favoriteThreads[threadIndex].date = new Date().toISOString(); // 現在時刻をISO形式で保存
    localStorage.setItem("favoriteThreads", JSON.stringify(favoriteThreads));
    console.log("Updated date for:", url); // countをインクリメント
    // countをインクリメント (文字列の場合を考慮して数値に変換)
    const currentCount = parseInt(favoriteThreads[threadIndex].count || 0, 10);
    favoriteThreads[threadIndex].count = currentCount + 1;
    // デバッグ情報を出力
    // デバッグログ: 更新後のデータ
    console.log("After update:", favoriteThreads[threadIndex]);

    // ローカルストレージを更新
    localStorage.setItem("favoriteThreads", JSON.stringify(favoriteThreads));

    // デバッグログ: 成功メッセージ
    console.log(
      `Updated date and count for: ${url}, new count: ${favoriteThreads[threadIndex].count}`
    );
  } else {
    console.warn("Thread not found in favoriteThreads:", url);
  }
}

// URLをクリップボードにコピーする
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // クリップボードAPIが使える場合
    navigator.clipboard
      .writeText(text)
      .then(() => {
        //alert("URLをコピーしました: " + text);
      })
      .catch((err) => {
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
      //alert("URLをコピーしました: " + text);
    } catch (err) {
      alert("コピーに失敗しました: " + err);
      console.error("execCommandによるコピーエラー:", err);
    }

    document.body.removeChild(textArea);
  }
}
// 20241220 クリエイティブ用URLをクリップボードにコピーする alartなし --start
// URLをクリップボードにコピーする
function copyToClipboardCreative(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // クリップボードAPIが使える場合
    navigator.clipboard
      .writeText(text)
      .then(() => {
        //alert("URLをコピーしました: " + text); クリエイティブ用は成功時にアラートを出さない
      })
      .catch((err) => {
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
      //alert("URLをコピーしました: " + text);  //クリエイティブ用はアラートを出さない
    } catch (err) {
      alert("コピーに失敗しました: " + err);
      console.error("execCommandによるコピーエラー:", err);
    }

    document.body.removeChild(textArea);
  }
}
// 20241220 クリエイティブ用URLをクリップボードにコピーする alartなし --end
// 20241212 <img> タグをクリックしたときに image.img_url をブラウザで表示する
function viewImage(imageUrl) {
  console.log("Image URL: " + imageUrl); // ここでURLを確認
  // `a`要素を動的に作成
  const link = document.createElement("a");
  link.href = imageUrl;
  link.target = "_blank"; // 新しいタブで開く

  // `a`要素をDOMに追加し、クリックイベントをトリガーする
  document.body.appendChild(link);
  link.click();

  // 使用後に`a`要素を削除
  document.body.removeChild(link);
}
// 絞り込み機能
function filterCards(filterType, clickedButton) {
  const cards = document.querySelectorAll(".card");
  const buttons = document.querySelectorAll(".filter-button");

  // カードの表示/非表示
  cards.forEach((card) => {
    const imgElement = card.querySelector("img");
    const altText = imgElement.getAttribute("alt");

    if (filterType === "all" || altText === filterType) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });

  // ボタンの状態を更新
  buttons.forEach((button) => button.classList.remove("active"));
  clickedButton.classList.add("active");
}
// #endregion Utilityだとおもう ここから

// 20241214 ブックマークレット対応
// URLパラメータを取得
const urlParams = new URLSearchParams(window.location.search);
// 'autofill' パラメータが 'true' の場合に処理を実行
if (urlParams.get("autofill") === "true") {
  // 'source' パラメータの値を取得
  const source = urlParams.get("source");

  // 'source' パラメータが存在するかつ、信頼できるドメインかを確認
  if (source) {
    const allowedDomains = [
      "linguistic-sherilyn-animanimage-50068fef.koyeb.app",
      "bbs.animanch.com",
    ];
    try {
      const urlObj = new URL(source);
      if (allowedDomains.includes(urlObj.hostname)) {
        // サニタイズしてから、inputフィールドに値を設定
        document.querySelector('input[name="url"][id="url"]').value =
          decodeURIComponent(source);
      } else {
        console.error("不正なリダイレクト先");
      }
    } catch (e) {
      console.error("無効なURL");
    }
  }
}

// ボタンをクリックしたときにブックマークレットリンクを表示
function addBookmarklet() {
  const bookmarkletLink = `javascript:(function(){window.location.href='https://linguistic-sherilyn-animanimage-50068fef.koyeb.app/?autofill=true&source='+encodeURIComponent(window.location.href);})();`;

  // ブックマークレットリンクを表示する
  const bookmarkLinkElement = document.getElementById("bookmarkLink");
  if (bookmarkLinkElement) {
    // リンクの内容を更新
    bookmarkLinkElement.querySelector("a").href = bookmarkletLink;

    // リンクを表示する
    bookmarkLinkElement.style.display = "block";
  }
}
// ボタンをクリックしたときにブックマークレットリンクを表示
function addBookmarklet2() {
  const bookmarkletLink2 = `javascript:(function(){let s=document.createElement('script');s.src='https://channkenn.github.io/umamusume_dice/js/script.js';document.body.appendChild(s);})();`;

  // ブックマークレットリンクを表示する
  const bookmarkLinkElement2 = document.getElementById("bookmarkLink2");
  if (bookmarkLinkElement2) {
    // リンクの内容を更新
    bookmarkLinkElement2.querySelector("a").href = bookmarkletLink2;

    // リンクを表示する
    bookmarkLinkElement2.style.display = "block";
  }
}
// ハンバーガーメニューのクリックイベント
document
  .querySelector(".hamburger-menu")
  .addEventListener("click", function () {
    const leftSidebar = document.querySelector(".left-column");
    const rightSidebar = document.querySelector(".right-column");
    // サイドバーの表示・非表示を切り替える
    leftSidebar.style.display =
      leftSidebar.style.display === "none" || leftSidebar.style.display === ""
        ? "block"
        : "none";
    rightSidebar.style.display =
      rightSidebar.style.display === "none" || rightSidebar.style.display === ""
        ? "block"
        : "none";
  });

// #region インポート・エクスポート機能群だとおもう ここから
// UTF-8文字列をBase64エンコードする関数
function utf8ToBase64(str) {
  const encoder = new TextEncoder("utf-8"); // UTF-8エンコードを行う
  const bytes = encoder.encode(str); // Uint8Arrayに変換
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // btoaでBase64エンコード
}
// ローカルストレージからfavoritesデータを取得
function exportFavoritesData() {
  const favorites = localStorage.getItem("favorites");

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
  navigator.clipboard
    .writeText(base64Data)
    .then(() => {
      alert("画像一覧がクリップボードにエクスポートされました！");
    })
    .catch((error) => {
      alert("クリップボードへのエクスポートに失敗しました: " + error);
    });
}
// ローカルストレージからfavoriteThreadsデータを取得
function exportFavoriteThreadsData() {
  const favoriteThreads = localStorage.getItem("favoriteThreads");

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
  navigator.clipboard
    .writeText(base64Data)
    .then(() => {
      alert("スレッド一覧がクリップボードにエクスポートされました！");
    })
    .catch((error) => {
      alert("クリップボードへのエクスポートに失敗しました: " + error);
    });
}
// Base64データをインポートする関数（共通）
function importData(dataType) {
  let inputData;
  let storageKey;

  // favoritesまたはfavoriteThreadsに応じたデータ取得
  if (dataType === "favorites") {
    inputData = document.getElementById("importFavorites").value;
    storageKey = "favorites";
  } else if (dataType === "favoriteThreads") {
    inputData = document.getElementById("importFavoriteThreads").value;
    storageKey = "favoriteThreads";
  }

  // 入力されたデータがない場合はアラートを出す
  if (!inputData) {
    alert(`データを入力してください`);
    return;
  }

  try {
    // Base64 → 圧縮解除 → JSON
    const decodedData = base64ToUtf8(inputData); // Base64をデコード (UTF-8対応)
    let decompressedData;
    try {
      // UTF-8圧縮データの解除を試みる
      decompressedData = LZString.decompress(decodedData);
    } catch (e) {
      // UTF-16圧縮データの解除を試みる
      decompressedData = LZString.decompressFromUTF16(decodedData);
    }

    const jsonData = JSON.parse(decompressedData); // JSONに変換
    // ローカルストレージから既存データを取得
    const existingData = JSON.parse(localStorage.getItem(storageKey) || "[]");

    // jsonDataが配列の場合にのみ処理を行う
    if (Array.isArray(jsonData)) {
      // 重複を除外するためのセットを作成
      const dataSet = new Set(
        existingData.map((item) => item.imgUrl || item.url)
      ); // URLで重複チェック

      // データから重複を除外して追加
      const uniqueData = jsonData.filter(
        (item) => !dataSet.has(item.imgUrl || item.url)
      );

      // 既存データに新しいデータを追加
      existingData.push(...uniqueData);
    } else if (jsonData.hasOwnProperty(storageKey)) {
      // jsonDataがオブジェクトで特定のキーが存在する場合
      const newData = jsonData[storageKey];
      const dataSet = new Set(
        existingData.map((item) => item.imgUrl || item.url)
      );

      // 重複を除外して新しいデータを追加
      const uniqueData = newData.filter(
        (item) => !dataSet.has(item.imgUrl || item.url)
      );

      // 既存データに新しいデータを追加
      existingData.push(...uniqueData);
    } else {
      alert("無効なデータ形式です");
      return;
    }

    // ローカルストレージに更新されたデータを保存
    localStorage.setItem(storageKey, JSON.stringify(existingData));

    // インポート後のリスト更新
    if (dataType === "favorites") {
      loadFavorites();
    } else if (dataType === "favoriteThreads") {
      displayFavoriteThreads();
    }

    alert("データがインポートされました");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    alert("データのインポートに失敗しました");
  }
}

// Base64をUTF-8にデコードする関数
function base64ToUtf8(base64) {
  const decodedString = atob(base64); // Base64をデコード
  const byteArray = new Uint8Array(decodedString.length);
  for (let i = 0; i < decodedString.length; i++) {
    byteArray[i] = decodedString.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(byteArray); // UTF-8に変換
}

// --- テキストをバイナリに変換する関数 ---
// テキストをバイナリに変換する関数
// テキストをバイナリに変換する関数
function textToBinary(text) {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(text);
  let binaryString = "";
  uint8Array.forEach((byte) => {
    binaryString += byte.toString(2).padStart(8, "0"); // 8ビットの2進数に変換
  });
  return binaryString;
}

// バイナリデータをRGBカラー画像に変換する関数
function binaryToRgbImage(binaryData, width) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // 高さの計算
  const height = Math.ceil(binaryData.length / (width * 3));
  canvas.width = width;
  canvas.height = height;

  let pixelIndex = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixelIndex + 2 < binaryData.length) {
        const r = binaryData[pixelIndex] === "1" ? 255 : 0;
        const g = binaryData[pixelIndex + 1] === "1" ? 255 : 0;
        const b = binaryData[pixelIndex + 2] === "1" ? 255 : 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, 1, 1);
        pixelIndex += 3;
      }
    }
  }
}

// CanvasをPNGとしてダウンロードする関数
function downloadCanvasAsPNG(filename) {
  const canvas = document.getElementById("canvas");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

// 画像ファイルをデコードしてテキストに戻す関数
function decodeImageToText(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result; // ファイルを画像として読み込む
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
      let binaryString = "";
      for (let i = 0; i < imageData.length; i += 4) {
        binaryString += imageData[i] === 255 ? "1" : "0";
        binaryString += imageData[i + 1] === 255 ? "1" : "0";
        binaryString += imageData[i + 2] === 255 ? "1" : "0";
      }

      const decoder = new TextDecoder("utf-8");
      const uint8Array = new Uint8Array(
        binaryString.match(/.{1,8}/g).map((b) => parseInt(b, 2))
      );
      const jsonString = decoder.decode(uint8Array); // デコードしたテキストを返す
      // 末尾から最初の '}' を探して、そこまでを '}]' に変換
      const decodedText = jsonString.replace(/}[^}]*$/, "}]");
      // データ整合性チェック（長さが0でないか、期待されるフォーマットか）
      if (decodedText.length > 0) {
        resolve(decodedText);
      } else {
        throw new Error("デコードしたデータが空です");
      }
    };
    reader.readAsDataURL(file); // 画像をデータURLとして読み込む
  });
}
//20241218 ローカルストレージをPNG画像に変換してエクスポートインポートする
// JSONが有効かどうかを確認する関数
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// ローカルストレージにデータを追加する関数
function addToLocalStorage(key, data) {
  let existingData = JSON.parse(localStorage.getItem(key)) || [];

  data.forEach((newItem) => {
    const isDuplicate =
      key === "favorites"
        ? existingData.some(
            (existingItem) => existingItem.imgUrl === newItem.imgUrl
          )
        : key === "favoriteThreads"
        ? existingData.some((existingItem) => existingItem.url === newItem.url)
        : existingData.some(
            (existingItem) =>
              JSON.stringify(existingItem) === JSON.stringify(newItem)
          );

    if (!isDuplicate) {
      existingData.push(newItem);
    }
  });

  localStorage.setItem(key, JSON.stringify(existingData));
}
// #endregion インポート・エクスポート機能群だとおもう ここまで

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
  const exportFavoritesButton = document.getElementById(
    "exportFavoritesButton"
  );

  // ボタンが存在する場合のみイベントリスナーを追加
  if (exportFavoritesButton) {
    exportFavoritesButton.addEventListener("click", exportFavoritesData);
  }
  const exportFavoriteThreadsButton = document.getElementById(
    "exportFavoriteThreadsButton"
  );
  if (exportFavoriteThreadsButton) {
    exportFavoriteThreadsButton.addEventListener(
      "click",
      exportFavoriteThreadsData
    );
  }
  // インポートボタンのクリックイベント
  const importFavoritesButton = document.getElementById(
    "importFavoritesButton"
  );
  if (importFavoritesButton) {
    importFavoritesButton.addEventListener("click", () =>
      importData("favorites")
    );
  }
  const importFavoriteThreadsButton = document.getElementById(
    "importFavoriteThreadsButton"
  );
  if (importFavoriteThreadsButton) {
    importFavoriteThreadsButton.addEventListener("click", () =>
      importData("favoriteThreads")
    );
  }
  //20241218 ローカルストレージをpng画像エクスポートインポート
  // エクスポートボタンのイベントリスナー
  const imageexportButton = document.getElementById("imageexportButton");
  if (imageexportButton) {
    imageexportButton.addEventListener("click", () => {
      const data = localStorage.getItem("favorites") || "{}";
      const jsonString = JSON.stringify(JSON.parse(data));
      console.log(jsonString);
      const binaryData = textToBinary(jsonString);
      console.log("Binary Data:", binaryData);
      binaryToRgbImage(binaryData, 300); // 幅300ピクセルで描画
      // 現在の日付と時間を取得
      var now = new Date();
      var year = now.getFullYear();
      var month = ("0" + (now.getMonth() + 1)).slice(-2); // 2桁表示
      var day = ("0" + now.getDate()).slice(-2); // 2桁表示
      var hours = ("0" + now.getHours()).slice(-2); // 2桁表示
      var minutes = ("0" + now.getMinutes()).slice(-2); // 2桁表示
      var seconds = ("0" + now.getSeconds()).slice(-2); // 2桁表示

      // ファイル名を作成
      var formattedFilename =
        "image" + year + month + day + hours + minutes + seconds + ".png";
      downloadCanvasAsPNG(formattedFilename);
    });
  }
  const threadexportButton = document.getElementById("threadexportButton");
  if (threadexportButton) {
    threadexportButton.addEventListener("click", () => {
      const data = localStorage.getItem("favoriteThreads") || "{}";
      const jsonString = JSON.stringify(JSON.parse(data));
      console.log(jsonString);
      const binaryData = textToBinary(jsonString);
      console.log("Binary Data:", binaryData);
      binaryToRgbImage(binaryData, 300); // 幅300ピクセルで描画
      // 現在の日付と時間を取得
      var now = new Date();
      var year = now.getFullYear();
      var month = ("0" + (now.getMonth() + 1)).slice(-2); // 2桁表示
      var day = ("0" + now.getDate()).slice(-2); // 2桁表示
      var hours = ("0" + now.getHours()).slice(-2); // 2桁表示
      var minutes = ("0" + now.getMinutes()).slice(-2); // 2桁表示
      var seconds = ("0" + now.getSeconds()).slice(-2); // 2桁表示

      // ファイル名を作成
      var formattedFilename =
        "thread" + year + month + day + hours + minutes + seconds + ".png";
      downloadCanvasAsPNG(formattedFilename);
    });
  }
  // 20241220 画像一覧のcsvファイル出力 --ここから
  // エクスポートボタンのイベントリスナー
  const imagecsvdownloadButton = document.getElementById("imagecsvdownload");
  if (imagecsvdownloadButton) {
    imagecsvdownloadButton.addEventListener("click", () => {
      // ローカルストレージからデータを取得
      const data = localStorage.getItem("favorites");
      if (!data) {
        alert("favoritesデータが存在しません");
        return;
      }

      const favorites = JSON.parse(data);

      // CSV形式に変換する関数
      function convertToCSV(arr) {
        if (arr.length === 0) return ""; // 配列が空の場合は空のCSVを返す
        const headers = Object.keys(arr[0]);
        const rows = arr.map((obj) =>
          headers.map((fieldName) => obj[fieldName]).join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      }

      // CSV形式に変換
      const csvData = convertToCSV(favorites);

      // Blobオブジェクトを作成
      const blob = new Blob([csvData], { type: "text/csv" });

      // ダウンロードリンクを作成
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);

      // 現在の日付と時間を取得してファイル名を作成
      var now = new Date();
      var year = now.getFullYear();
      var month = ("0" + (now.getMonth() + 1)).slice(-2); // 2桁表示
      var day = ("0" + now.getDate()).slice(-2); // 2桁表示
      var hours = ("0" + now.getHours()).slice(-2); // 2桁表示
      var minutes = ("0" + now.getMinutes()).slice(-2); // 2桁表示
      var seconds = ("0" + now.getSeconds()).slice(-2); // 2桁表示

      // ファイル名を作成
      var formattedFilename =
        "image_" + year + month + day + hours + minutes + seconds + ".csv";

      link.download = formattedFilename;

      // ダウンロードを実行
      link.click();
    });
  }

  // 20241220 画像一覧のcsvファイル出力 --ここまで
  // 20250716 画像一覧のcsvファイルからダウンロードするバッチ.zip出力ここから
  document.getElementById("downloadZipLink").addEventListener("click", (e) => {
    e.preventDefault(); // aタグのデフォルト遷移を防ぐ
    downloadZip();
  });
  function downloadZip() {
    const zipUrl = "static/bat/bat_scripts.zip"; // zipファイルのパス（batフォルダに置く想定）
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "bat_scripts.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  // 20250716 画像一覧のcsvファイルからダウンロードするバッチ.zip出力ここまで
  // 20250702 画像一覧csvのファイル入力 --ここから
  const csvImportInput = document.getElementById("csvimport");

  if (csvImportInput) {
    csvImportInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (!file) {
        alert("ファイルが選択されていません");
        return;
      }

      // 拡張子チェック
      if (!file.name.endsWith(".csv")) {
        alert("CSVファイル（.csv）を選んでください");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const csvText = e.target.result;

        function parseCSV(csv) {
          const lines = csv.split("\n").filter((line) => line.trim() !== "");
          const headers = lines[0].split(",").map((h) => h.trim());
          const expectedHeaders = [
            "thumbUrl",
            "imgUrl",
            "resNumber",
            "resLink",
            "date",
            "register",
            "count",
          ];

          const isValidHeader = expectedHeaders.every((h) =>
            headers.includes(h)
          );
          if (!isValidHeader) {
            alert(
              "CSVのヘッダーが不正です。\n必要な列: " +
                expectedHeaders.join(", ")
            );
            return null;
          }

          return lines.slice(1).map((line) => {
            const values = line.split(",");
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index]?.trim() ?? "";
            });
            return obj;
          });
        }

        const parsed = parseCSV(csvText);
        if (!parsed) return;

        // 既存のfavoritesを取得
        const existing = JSON.parse(localStorage.getItem("favorites") || "[]");

        // 重複チェック（resLinkが一意とする）
        const existingLinks = new Set(existing.map((item) => item.resLink));
        const newItems = parsed.filter(
          (item) => !existingLinks.has(item.resLink)
        );

        if (newItems.length === 0) {
          alert("すべてのデータが既に登録済みです（resLinkが重複）");
          return;
        }

        // 保存
        const combined = [...existing, ...newItems];
        localStorage.setItem("favorites", JSON.stringify(combined));
        alert(`${newItems.length} 件の画像を追加しました`);
      };

      reader.readAsText(file);
    });
  }

  // 20250702 画像一覧csvのファイル入力 --ここまで
  // 20241220 スレッド一覧のcsvファイル出力 --ここから
  // エクスポートボタンのイベントリスナー
  const threadcsvdownloadButton = document.getElementById(
    "threadcsvdownloadButton"
  );
  if (threadcsvdownloadButton) {
    threadcsvdownloadButton.addEventListener("click", () => {
      // ローカルストレージからデータを取得
      const data = localStorage.getItem("favoriteThreads");
      if (!data) {
        alert("favoriteThreadsデータが存在しません");
        return;
      }

      const favorites = JSON.parse(data);

      // CSV形式に変換する関数
      function convertToCSV(arr) {
        if (arr.length === 0) return ""; // 配列が空の場合は空のCSVを返す
        const headers = Object.keys(arr[0]);
        const rows = arr.map((obj) =>
          headers.map((fieldName) => obj[fieldName]).join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      }

      // CSV形式に変換
      const csvData = convertToCSV(favorites);

      // Blobオブジェクトを作成
      const blob = new Blob([csvData], { type: "text/csv" });

      // ダウンロードリンクを作成
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);

      // 現在の日付と時間を取得してファイル名を作成
      var now = new Date();
      var year = now.getFullYear();
      var month = ("0" + (now.getMonth() + 1)).slice(-2); // 2桁表示
      var day = ("0" + now.getDate()).slice(-2); // 2桁表示
      var hours = ("0" + now.getHours()).slice(-2); // 2桁表示
      var minutes = ("0" + now.getMinutes()).slice(-2); // 2桁表示
      var seconds = ("0" + now.getSeconds()).slice(-2); // 2桁表示

      // ファイル名を作成
      var formattedFilename =
        "thread_" + year + month + day + hours + minutes + seconds + ".csv";

      link.download = formattedFilename;

      // ダウンロードを実行
      link.click();
    });
  }
  // 20241220 スレッド一覧のcsvファイル出力 --ここまで
  // 20250702 スレッド一覧csvのインポート --ここから
  const csvUploadInput = document.getElementById("csvupload");

  if (csvUploadInput) {
    csvUploadInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (!file) {
        alert("ファイルが選択されていません");
        return;
      }

      // 拡張子チェック
      if (!file.name.endsWith(".csv")) {
        alert("CSVファイル（.csv）を選んでください");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const csvText = e.target.result;

        // CSVをオブジェクト配列に変換する関数
        function parseCSV(csv) {
          const lines = csv.split("\n").filter((line) => line.trim() !== "");
          const headers = lines[0].split(",").map((h) => h.trim());
          const expectedHeaders = [
            "title",
            "url",
            "thumb",
            "date",
            "register",
            "count",
          ];

          const isValidHeader = expectedHeaders.every((h) =>
            headers.includes(h)
          );
          if (!isValidHeader) {
            alert(
              "CSVの列に誤りがあります。必要な列は: " +
                expectedHeaders.join(", ")
            );
            return null;
          }

          const data = lines.slice(1).map((line) => {
            const values = line.split(",");
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index]?.trim() ?? "";
            });
            return obj;
          });

          return data;
        }

        const parsedData = parseCSV(csvText);
        if (!parsedData) return;

        // 既存データを取得
        const existing = JSON.parse(
          localStorage.getItem("favoriteThreads") || "[]"
        );
        const existingUrls = new Set(existing.map((item) => item.url));

        // 重複を除外した新しいデータだけを追加
        const newItems = parsedData.filter(
          (item) => !existingUrls.has(item.url)
        );

        if (newItems.length === 0) {
          alert("すべてのデータが既に登録済みです（urlが重複しています）");
          return;
        }

        const combined = [...existing, ...newItems];
        localStorage.setItem("favoriteThreads", JSON.stringify(combined));
        alert(`${newItems.length} 件を追加しました（重複URLは除外）`);
      };

      reader.readAsText(file);
    });
  }

  // 20250702 スレッド一覧csvのインポート --ここまで

  // インポートボタンのイベントリスナー
  // ここは、importFileのイベントリスナーを設定する部分に追加するコードです 画像一覧
  const importimageFile = document.getElementById("importimageFile"); // インポートボタンのIDを取得
  if (importimageFile) {
    importimageFile.addEventListener("change", (e) => {
      const file = e.target.files[0]; // 選択したファイルを取得
      if (file) {
        // 画像をデコードしてテキストに戻す関数を呼び出し
        decodeImageToText(file).then((importedText) => {
          console.log("インポートされたデータ:", importedText); // 追加：インポートされたテキストを確認

          try {
            // デコードされたテキストが有効なJSONであるか確認
            if (isValidJSON(importedText)) {
              const importedData = JSON.parse(importedText); // JSONとして解析
              // 必要なキーのリスト
              const requiredKeys = [
                "imgUrl",
                "resLink",
                "resNumber",
                "thumbUrl",
              ];
              // インポートされたデータが配列の場合、各アイテムをチェック
              const isValid = Array.isArray(importedData)
                ? importedData.every((item) =>
                    requiredKeys.every((key) => key in item)
                  )
                : requiredKeys.every((key) => key in importedData);

              if (isValid) {
                // 正しいキーを持っている場合、ローカルストレージに追加
                addToLocalStorage("favorites", importedData);
                alert("スレッド一覧インポートが完了しました");
              } else {
                // キーが不足している場合、エラーメッセージを表示
                alert("インポートされたデータに不足しているキーがあります");
              }

              //addToLocalStorage('favorites', importedData); // ローカルストレージに追加
              //alert('画像一覧インポートが完了しました');
            } else {
              throw new Error("無効なJSONデータです");
            }
          } catch (error) {
            alert("データのインポートに失敗しました: " + error.message); // エラーメッセージを表示
          }
        });
      }
    });
  }
  // ここは、importthreadFileのイベントリスナーを設定する部分に追加するコードです スレッド一覧
  const importthreadFile = document.getElementById("importthreadFile"); // インポートボタンのIDを取得
  if (importthreadFile) {
    importthreadFile.addEventListener("change", (e) => {
      const file = e.target.files[0]; // 選択したファイルを取得
      if (file) {
        // 画像をデコードしてテキストに戻す関数を呼び出し
        decodeImageToText(file).then((importedText) => {
          console.log("インポートされたデータ:", importedText); // 追加：インポートされたテキストを確認

          try {
            // デコードされたテキストが有効なJSONであるか確認
            // デコードされたテキストが有効なJSONであるか確認
            if (isValidJSON(importedText)) {
              const importedData = JSON.parse(importedText); // JSONとして解析

              // 必要なキーのリスト
              const requiredKeys = ["thumb", "title", "url"];

              // インポートされたデータが配列の場合、各アイテムをチェック
              const isValid = Array.isArray(importedData)
                ? importedData.every((item) =>
                    requiredKeys.every((key) => key in item)
                  )
                : requiredKeys.every((key) => key in importedData);

              if (isValid) {
                // 正しいキーを持っている場合、ローカルストレージに追加
                addToLocalStorage("favoriteThreads", importedData);
                alert("スレッド一覧インポートが完了しました");
              } else {
                // キーが不足している場合、エラーメッセージを表示
                alert("インポートされたデータに不足しているキーがあります");
              }
            } else {
              throw new Error("無効なJSONデータです");
            }
          } catch (error) {
            alert("データのインポートに失敗しました: " + error.message); // エラーメッセージを表示
          }
        });
      }
    });
  }
  // お気に入り画像とスレッドの一覧を表示
  loadFavorites();
  loadFavoritesCreative();
  displayFavoriteThreads();
  //20241221 画像のフィルタリング機能をhtmlページごとにする機能 --ここから
  // ボタンを取得
  const button = document.getElementById("filter-copyable");

  // ボタンが存在するか確認してクリック
  if (button) {
    button.click(); // ボタンをクリック
    console.log("ボタンがクリックされました。");
  } else {
    console.error("指定されたボタンが見つかりません。");
  }
  //20241221 画像のフィルタリング機能をhtmlページごとにする機能 --ここまで
  // 20241221 クリエイター向けのテキストエリアにimgURLを貼り付けた時に重複した場合自動で末尾にナンバリングを加える --start
  // 既存のURLとそのカウントを保存するためのオブジェクト
  const urlCounts = {};

  // テキストエリアを取得
  const textArea = document.getElementById("textArea");

  // 貼り付け時の処理
  textArea.addEventListener("paste", (e) => {
    // 貼り付けたテキストを取得
    const pastedText = e.clipboardData.getData("text");

    // URLパターンを正規表現で検出
    const urlPattern = /https?:\/\/bbs\.animanch\.com\/img\/(\d+)\/(\d+)/g;

    // もし貼り付けたテキストがURLの形式に一致した場合
    if (urlPattern.test(pastedText)) {
      let newUrl = pastedText;

      // すでにそのURLがあるかを確認
      if (urlCounts[newUrl]) {
        // すでに存在する場合、末尾にカウントアップ
        urlCounts[newUrl]++;
        newUrl = `${newUrl}/${urlCounts[newUrl]}`;
      } else {
        // 新しいURLの場合、カウントを1に設定
        urlCounts[newUrl] = 1;
        newUrl = `${newUrl}/1`;
      }

      // 既存のテキストエリアの内容に新しいURLを追加
      textArea.value += newUrl;

      // デフォルトの貼り付け処理を無効化（テキストエリアにURLをそのまま貼り付けるのを防ぐ）
      e.preventDefault();
    }
  });
  // コピーボタンの処理
  document.getElementById("copyButton").addEventListener("click", () => {
    const textArea = document.getElementById("textArea");

    // テキストを選択してコピー
    textArea.select();
    navigator.clipboard
      .writeText(textArea.value)
      .then(() => {
        document.getElementById("copyMessage").style.display = "block";
        setTimeout(() => {
          document.getElementById("copyMessage").style.display = "none";
        }, 2000);
      })
      .catch((err) => {
        console.error("コピーに失敗しました:", err);
      });
  });

  // クリアボタンの処理
  document.getElementById("clearButton").addEventListener("click", () => {
    const textArea = document.getElementById("textArea");
    textArea.value = ""; // テキストエリアを空にする
    updateCount(); // カウントを更新
  });

  // テキストエリアの入力に対して文字数と行数を更新
  document.getElementById("textArea").addEventListener("input", updateCount);

  // 文字数と行数をカウントして表示する関数
  function updateCount() {
    const textArea = document.getElementById("textArea");
    const text = textArea.value;

    // 文字数をカウント
    const charCount = text.length;

    // 行数をカウント（改行で分割して行数を計算）
    const lineCount = text.split("\n").length;

    // 文字数と行数を表示
    const charCountSpan = document.getElementById("charCount");
    const lineCountSpan = document.getElementById("lineCount");

    charCountSpan.textContent = charCount;
    lineCountSpan.textContent = lineCount;

    // 文字数が1000以上の場合、赤色に変更
    if (charCount >= 1000) {
      charCountSpan.style.color = "red";
    } else {
      charCountSpan.style.color = "black";
    }

    // 行数が30以上の場合、赤色に変更
    if (lineCount >= 30) {
      lineCountSpan.style.color = "red";
    } else {
      lineCountSpan.style.color = "black";
    }
  }

  // ページ読み込み時にカウントを初期化
  updateCount();

  // 20241221 クリエイター向けのテキストエリアにimgURLを貼り付けた時に重複した場合自動で末尾にナンバリングを加える --end
});
