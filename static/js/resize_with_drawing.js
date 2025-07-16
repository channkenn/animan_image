const fileInput = document.getElementById("fileInput");
const heightInput = document.getElementById("heightInput");
const resizeButton = document.getElementById("resizeButton");
const eraserButton = document.getElementById("eraserButton");
const undoButton = document.getElementById("undoButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const downloadButton = document.getElementById("downloadButton");
const urlInput = document.getElementById("urlInput");
const urlLoadButton = document.getElementById("urlLoadButton");

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isEraserMode = false;
let originalImage = null;
let originalFileName = "";
const history = [];
let historyIndex = -1;

// ペンの色と太さ
let penColor = "#ff0000"; // デフォルト色: 赤
let penWidth = 2; // デフォルトのペン太さ

// ペンの色変更
document.getElementById("penColor").addEventListener("input", (event) => {
  penColor = event.target.value;
});

// ペンの太さ変更
document.getElementById("penWidth").addEventListener("input", (event) => {
  penWidth = event.target.value;
});

// キャンバスの現在の状態を履歴に保存
const saveHistory = () => {
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }
  history.push(canvas.toDataURL());
  historyIndex++;
};

// 履歴を元に戻す
undoButton.addEventListener("click", () => {
  if (historyIndex > 0) {
    historyIndex--;
    const img = new Image();
    img.src = history[historyIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  } else {
    alert("これ以上戻せません。");
  }
});

// 共通の描画・消しゴム処理
const handleDrawing = (x, y) => {
  if (isEraserMode) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2, false); // 消しゴムサイズ（10px）
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.stroke();
  }

  [lastX, lastY] = [x, y];
};

// イベントリスナー設定 (PC or モバイル向け)
const setupDrawingEvents = () => {
  const startDrawing = (event) => {
    isDrawing = true;
    const [x, y] = getEventCoordinates(event);
    lastX = x;
    lastY = y;
    saveHistory(); // 操作開始時に履歴を保存
  };

  const moveDrawing = (event) => {
    if (!isDrawing) return;
    const [x, y] = getEventCoordinates(event);
    handleDrawing(x, y);
  };

  const stopDrawing = () => {
    isDrawing = false;
  };

  const getEventCoordinates = (event) => {
    let x, y;
    if (event.touches) {
      // タッチイベント (スマホ)
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      // マウスイベント (PC)
      x = event.offsetX;
      y = event.offsetY;
    }
    return [x, y];
  };

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", moveDrawing);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // タッチイベント対応 (スマホ)
  canvas.addEventListener("touchstart", startDrawing);
  canvas.addEventListener("touchmove", moveDrawing);
  canvas.addEventListener("touchend", stopDrawing);
  canvas.addEventListener("touchcancel", stopDrawing);
};

// ファイル選択イベント
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  originalFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    originalImage = new Image();
    originalImage.onload = () => {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);

      imageInfo.textContent = `選択した画像の情報: 幅 ${originalImage.width}px, 高さ ${originalImage.height}px`;
      document.getElementById("heightInput").value = canvas.height;

      history.length = 0;
      historyIndex = -1;
    };
    originalImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// 消しゴムモード切り替え
eraserButton.addEventListener("click", () => {
  isEraserMode = !isEraserMode;
  eraserButton.textContent = isEraserMode
    ? "ペンモードに切り替え"
    : "消しゴムモードに切り替え";
});

// リサイズボタンイベント
resizeButton.addEventListener("click", () => {
  if (!originalImage) {
    alert("画像を選択してください。");
    return;
  }

  const specifiedHeight = parseInt(heightInput.value, 10);
  if (!specifiedHeight || specifiedHeight <= 0) {
    alert("有効な高さ(px)を入力してください。");
    return;
  }

  const aspectRatio = originalImage.width / originalImage.height;
  const newWidth = specifiedHeight * aspectRatio;

  canvas.width = newWidth;
  canvas.height = specifiedHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImage, 0, 0, newWidth, specifiedHeight);

  imageInfo.textContent = `選択した画像の情報: 幅 ${canvas.width}px, 高さ ${canvas.height}px`;
  document.getElementById("heightInput").value = canvas.height;
  alert("リサイズが完了しました。");
  downloadButton.style.display = "block";
});

// ダウンロードボタンイベント
downloadButton.addEventListener("click", () => {
  if (!originalFileName) {
    alert("元の画像ファイル名がありません。");
    return;
  }

  const fileName = originalFileName.split(".")[0];
  const newFileName = `${fileName}_${canvas.height}px.png`;

  try {
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = newFileName;
      link.click();
    });
  } catch (e) {
    alert(`右クリックで保存してください：${originalFileName}`);
  }
});

// URLから画像を読み込む機能を追加
urlLoadButton.addEventListener("click", () => {
  const imageUrl = urlInput.value.trim();
  if (!imageUrl) {
    alert("有効なURLを入力してください。");
    return;
  }

  try {
    const url = new URL(imageUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 1) {
      const fileNamePart = pathSegments.slice(1).join("_");
      originalFileName = `img_${fileNamePart}.png`;
    } else {
      originalFileName = "unknown.png";
    }
  } catch (e) {
    alert("有効なURLを入力してください。");
    return;
  }

  originalImage = new Image();
  originalImage.onload = () => {
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    imageInfo.textContent = `選択した画像の情報: 幅 ${originalImage.width}px, 高さ ${originalImage.height}px, ファイル名: ${originalFileName}`;
    document.getElementById("heightInput").value = canvas.height;
    history.length = 0;
    historyIndex = -1;
  };

  originalImage.onerror = () => {
    alert("画像の読み込みに失敗しました。URLを確認してください。");
  };

  originalImage.src = imageUrl;
});

// イベント設定
setupDrawingEvents();

// 20241226 貼り付け機能追加
let startX, startY, endX, endY; // 範囲選択の座標
let isSelecting = false; // 範囲選択中フラグ
let overlayCanvas = document.createElement("canvas");
overlayCanvas.width = canvas.width;
overlayCanvas.height = canvas.height;
let overlayCtx = overlayCanvas.getContext("2d");

// 範囲選択の開始
canvas.addEventListener("mousedown", (e) => {
  startX = e.offsetX;
  startY = e.offsetY;
  isSelecting = true;
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
});

// 範囲選択の描画
canvas.addEventListener("mousemove", (e) => {
  if (isSelecting) {
    endX = e.offsetX;
    endY = e.offsetY;

    // オーバーレイに選択範囲の描画（無色）
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.strokeStyle = "rgba(0, 0, 0, 0)"; // 無色の透明線
    overlayCtx.lineWidth = 2; // 線の太さ
    overlayCtx.strokeRect(startX, startY, endX - startX, endY - startY);

    // オーバーレイをメインキャンバスに描画
    ctx.drawImage(overlayCanvas, 0, 0);
  }
});

// 範囲選択の終了
canvas.addEventListener("mouseup", () => {
  isSelecting = false;
});

// 貼り付けイベントリスナー
document.addEventListener("paste", async (event) => {
  const items = event.clipboardData.items;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const blob = item.getAsFile();
      const img = new Image();

      img.onload = () => {
        if (
          startX !== undefined &&
          startY !== undefined &&
          endX !== undefined &&
          endY !== undefined
        ) {
          const selectionWidth = Math.abs(endX - startX);
          const selectionHeight = Math.abs(endY - startY);
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);

          // 選択範囲に画像をリサイズして描画
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height, // 元画像全体
            x,
            y,
            selectionWidth,
            selectionHeight // 選択範囲にリサイズして描画
          );
        } else {
          alert("まず範囲を選択してください！");
        }

        // 画像を貼り付けた後に範囲選択の無色線を消去
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // ここで無色線を消去
      };

      // BlobをImageオブジェクトに変換
      img.src = URL.createObjectURL(blob);
    }
  }
});
