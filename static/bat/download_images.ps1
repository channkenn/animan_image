Add-Type -AssemblyName System.Windows.Forms
$ofd = New-Object System.Windows.Forms.OpenFileDialog
$ofd.Title = 'CSVファイルを選択してください'
$ofd.Filter = 'CSVファイル (*.csv)|*.csv'
$ofd.InitialDirectory = Get-Location

if ($ofd.ShowDialog() -eq 'OK') {
    $csvPath = $ofd.FileName
    Write-Host "選択されたCSV: $csvPath"

    $outputFolder = 'abbsimg'
    if (-not (Test-Path $outputFolder)) {
        New-Item -ItemType Directory -Path $outputFolder | Out-Null
    }

    $csv = Import-Csv -Path $csvPath

    foreach ($row in $csv) {
        $imgUrl = $row.imgUrl
        if ($imgUrl -match '/img/(\d+)/(\d+)$') {
            $boardNum = $matches[1]
            $resNum = $matches[2]
            $fileName = "ani_${boardNum}_${resNum}.png"
            $outputPath = Join-Path $outputFolder $fileName
            Write-Host "📥 Downloading $imgUrl -> $outputPath"
            try {
                Invoke-WebRequest -Uri $imgUrl -OutFile $outputPath -ErrorAction Stop
            } catch {
                Write-Warning "⚠️ ダウンロード失敗: $imgUrl"
            }
        } else {
            Write-Warning "⚠️ URL形式が不正: $imgUrl"
        }
    }
    Write-Host "✅ すべての画像を '$outputFolder' に保存しました。"
} else {
    Write-Host "❌ CSVが選択されませんでした。終了します。"
}
Pause
