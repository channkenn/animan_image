const fileInput = document.getElementById("fileInput");
const heightInput = document.getElementById("heightInput");
const resizeButton = document.getElementById("resizeButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// 画像を選択して描画
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    alert("ファイルを選択してください。");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ペン描画機能
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  [lastX, lastY] = [event.offsetX, event.offsetY];
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;
  const [x, y] = [event.offsetX, event.offsetY];
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = "red"; // ペンの色
  ctx.lineWidth = 2; // ペンの太さ
  ctx.stroke();
  [lastX, lastY] = [x, y];
});

canvas.addEventListener("mouseup", () => (isDrawing = false));
canvas.addEventListener("mouseout", () => (isDrawing = false));

// 指定した高さでリサイズしてダウンロード
resizeButton.addEventListener("click", () => {
  const specifiedHeight = parseInt(heightInput.value, 10);

  if (!specifiedHeight || specifiedHeight <= 0) {
    alert("有効な高さを入力してください。");
    return;
  }

  const aspectRatio = canvas.width / canvas.height;
  const newWidth = specifiedHeight * aspectRatio;

  // リサイズ用のオフスクリーンキャンバスを作成
  const offscreenCanvas = document.createElement("canvas");
  const offscreenCtx = offscreenCanvas.getContext("2d");

  offscreenCanvas.width = newWidth;
  offscreenCanvas.height = specifiedHeight;
  offscreenCtx.drawImage(canvas, 0, 0, newWidth, specifiedHeight);

  offscreenCanvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `resized_image_${specifiedHeight}px.png`;
    link.click();
  }, "image/png");
});
