const processFilesInBatches = (files, batchSize, specifiedHeight) => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const processBatch = (batch) => {
    return new Promise((resolve) => {
      batch.forEach((file) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            const newWidth = specifiedHeight * aspectRatio;

            canvas.width = newWidth;
            canvas.height = specifiedHeight;
            ctx.drawImage(img, 0, 0, newWidth, specifiedHeight);

            canvas.toBlob((blob) => {
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const newFileName = `${baseName}_${specifiedHeight}px.png`;

              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = newFileName;
              link.click();
            }, "image/png");
          };

          img.src = event.target.result;
        };

        reader.readAsDataURL(file);
      });
      resolve();
    });
  };

  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  (async () => {
    for (const batch of batches) {
      await processBatch(batch);
    }
    alert("すべての画像が処理されました！");
  })();
};

document.getElementById("resizeButton").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  const heightInput = document.getElementById("heightInput");

  if (!fileInput.files.length) {
    alert("PNGファイルを選択してください。");
    return;
  }

  if (!heightInput.value || heightInput.value <= 0) {
    alert("有効な高さ(px)を入力してください。");
    return;
  }

  const files = Array.from(fileInput.files);
  const specifiedHeight = parseInt(heightInput.value, 10);

  const batchSize = 10; // 一度に処理するファイル数
  processFilesInBatches(files, batchSize, specifiedHeight);
});
