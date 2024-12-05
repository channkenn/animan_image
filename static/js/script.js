// 正しいJavaScriptコード
function addToFavorites(imgSrc, threadUrl) {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites.push({ img: imgSrc, url: threadUrl });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("お気に入りに追加しました！");
}

function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const container = document.getElementById("favorites-container");
    favorites.forEach(fav => {
        const row = document.createElement("div");
        row.classList.add("row");
        row.innerHTML = `
            <div class="cell">
                <img src="${fav.img}" alt="お気に入り画像">
            </div>
            <div class="cell">
                <span>${fav.url}</span>
                <button class="remove-btn" onclick="removeFavorite('${fav.img}')">削除</button>
            </div>`;
        container.appendChild(row);
    });
}

function removeFavorite(imgSrc) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(fav => fav.img !== imgSrc);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    location.reload(); // ページをリロードして更新
}
// コピー機能
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("URLをコピーしました: " + text);
    }).catch(err => {
        alert("コピーに失敗しました: " + err);
    });
}