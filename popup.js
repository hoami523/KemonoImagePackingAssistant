// popup.js

function updateProgressUI(type, data) {
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  if (type === 'start') {
    progressContainer.classList.add('show');
    progressFill.style.width = '0%';
    progressText.textContent = `找到 ${data.total} 张图片，开始下载...`;
  } else if (type === 'downloading') {
    progressFill.style.width = `${(data.current / data.total) * 100}%`;
    progressText.textContent = `下载中... (${data.current}/${data.total})`;
  } else if (type === 'zipping') {
    progressFill.style.width = '100%';
    progressText.textContent = '正在生成ZIP文件...';
  } else if (type === 'done') {
    progressFill.style.width = '100%';
    progressText.textContent = `下载完成！共打包 ${data.count} 张图片`;
    progressContainer.classList.add('show');
  } else if (type === 'error') {
    progressText.textContent = data.message;
    progressContainer.classList.add('show');
  }
}

function showDebugInfo(info) {
  const debugDiv = document.getElementById('debugInfo');
  debugDiv.innerHTML = '';
  for (const key in info) {
    const p = document.createElement('p');
    p.style.fontSize = '12px';
    p.style.margin = '2px 0';
    p.textContent = `${key}: ${info[key]}`;
    debugDiv.appendChild(p);
  }
}

function triggerDownload(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kemono_images_${new Date().getTime()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debugInfo';
  debugDiv.style.marginTop = '10px';
  debugDiv.style.background = '#f6f6f6';
  debugDiv.style.borderRadius = '6px';
  debugDiv.style.padding = '6px';
  debugDiv.style.color = '#666';
  debugDiv.style.wordBreak = 'break-all';
  debugDiv.style.fontFamily = 'monospace';
  document.querySelector('.image-pack-menu').appendChild(debugDiv);

  let portTabId = null;

  // 监听content script的进度消息和调试信息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'progress') {
      const progress = message.progress;
      if (progress.debugInfo) {
        showDebugInfo(progress.debugInfo);
      }
      if (progress.type === 'done') {
        updateProgressUI('done', progress);
        triggerDownload(progress.blob);
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>打包下载图片`;
          progressContainer.classList.remove('show');
          progressFill.style.width = '0%';
        }, 3000);
      } else if (progress.type === 'error') {
        updateProgressUI('error', progress);
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>打包下载图片`;
          progressContainer.classList.remove('show');
          progressFill.style.width = '0%';
        }, 3000);
      } else {
        updateProgressUI(progress.type, progress);
      }
    }
  });

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>处理中...`;
    progressContainer.classList.add('show');
    progressText.textContent = '准备中...';
    progressFill.style.width = '0%';
    showDebugInfo({ 状态: '正在请求页面信息...' });
    // 获取当前激活tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: 'packAndDownloadImages', debug: true }, (response) => {
        // 无需处理response，进度通过onMessage监听
      });
    });
  });
}); 