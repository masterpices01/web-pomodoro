const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// 設定輸入與輸出的檔案路徑
const inputFileName = 'Bach Cello Suite No  5 in C minor, BWV 1011(Pablo Casals 1938) - 320.mp3';
const outputFileName = 'compressed-bach.mp3'; // 壓縮後的新檔名改短一點比較好記

const inputPath = path.join(__dirname, 'public', 'assets', inputFileName);
const outputPath = path.join(__dirname, 'public', 'assets', outputFileName);

console.log('⏳ 開始壓縮音樂，這可能需要一到兩分鐘，請稍候...');

// 使用 ffmpeg 執行壓縮 (將音質位元率降至 128k，這會大幅減少檔案大小，但保留足夠的音質)
execFile(ffmpeg, [
  '-i', inputPath,
  '-b:a', '128k',
  outputPath
], (error, stdout, stderr) => {
  if (error) {
    console.error('❌ 壓縮失敗：', error);
    return;
  }
  
  const stats = fs.statSync(outputPath);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ 壓縮完成！`);
  console.log(`📂 新檔案已儲存為：public/assets/${outputFileName}`);
  console.log(`⚖️  新檔案大小：${fileSizeInMB} MB`);
  
  if (fileSizeInMB < 25) {
    console.log('🎉 太棒了！這個大小已經符合 Cloudflare Pages 的限制。');
  } else {
    console.log('⚠️ 檔案還是超過 25MB，可能需要把位元率降到 96k 重新嘗試。');
  }
});