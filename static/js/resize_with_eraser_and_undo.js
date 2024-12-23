const fileInput = document.getElementById("fileInput");
const heightInput = document.getElementById("heightInput");
const resizeButton = document.getElementById("resizeButton");
const eraserButton = document.getElementById("eraserButton");
const undoButton = document.getElementById("undoButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isEraserMode = false; // 消しゴムモードのフラグ
const history = []; // 描画履歴を保存するスタック
let historyIndex = -1; // 現在の履歴位置

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
    history.splice(historyIndex + 1); // 古い履歴を削除
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

// ファイル選択イベント
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    originalImage = new Image();
    originalImage.onload = () => {
      // キャンバスのリセット
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア
      ctx.drawImage(originalImage, 0, 0);

      // 画像情報を表示
      imageInfo.textContent = `選択した画像の情報: 幅 ${originalImage.width}px, 高さ ${originalImage.height}px`;

      // 描画履歴をリセット
      history.length = 0; // 履歴を空にする
      historyIndex = -1; // 履歴位置を初期化
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

// 描画または消しゴム機能
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  [lastX, lastY] = [event.offsetX, event.offsetY];
  saveHistory(); // 操作開始時に履歴を保存
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;

  const [x, y] = [event.offsetX, event.offsetY];
  if (isEraserMode) {
    // 消しゴムモード
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2, false); // 消しゴムサイズ（10px）
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else {
    // 通常の描画
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = penColor; // ユーザーが選んだペンの色
    ctx.lineWidth = penWidth; // ユーザーが選んだペンの太さ
    ctx.stroke();
  }
  [lastX, lastY] = [x, y];
});

canvas.addEventListener("mouseup", () => (isDrawing = false));
canvas.addEventListener("mouseout", () => (isDrawing = false));

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

  // キャンバスをリサイズして再描画
  canvas.width = newWidth;
  canvas.height = specifiedHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImage, 0, 0, newWidth, specifiedHeight);

  // リサイズ後の画像情報を表示
  imageInfo.textContent = `選択した画像の情報: 幅 ${canvas.width}px, 高さ ${canvas.height}px`;

  alert("リサイズが完了しました。");
  downloadButton.style.display = "block"; // ダウンロードボタン表示
});

// ダウンロードボタンイベント
downloadButton.addEventListener("click", () => {
  canvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `resized_image_${canvas.height}px.png`;
    link.click();
  }, "image/png");
});
