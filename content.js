// content.js
// 仅负责抓取图片和打包下载，不再生成浮动图标
(function() {
  'use strict';

  // 全局变量
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isMenuOpen = false;
  let isDownloading = false;
  let lastZipBlob = null;
  let lastZipName = '图片打包助手.zip';

  // 获取作者和标题
  function getAuthorAndTitle() {
    const author = document.querySelector('.post__user-name')?.textContent?.trim() || '未知作者';
    const titleElement = document.querySelector('.post__title span');
    let title = titleElement?.textContent?.trim() || '未知标题';
    
    // 去除文件名非法字符，包括更多特殊字符
    const safe = s => s.replace(/[\\/:*?"<>|\[\]()]/g, '_');
    return {
      author: safe(author),
      title: safe(title)
    };
  }

  // 创建悬浮面板
  function createFloatingIcon() {
    const container = document.createElement('div');
    container.className = 'image-pack-helper';
    container.innerHTML = `
      <div class="image-pack-icon">
        <svg viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
      <div class="image-pack-menu">
        <div class="menu-title">Kemono图片打包助手</div>
        <button class="download-btn" id="downloadBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          打包下载图片
        </button>
        <button class="download-btn" id="manualDownloadBtn" style="margin-top:8px;display:none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 20h14v-2H5v2zm7-18C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10C22 6.48 17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          手动下载ZIP
        </button>
        <div class="progress-container" id="progressContainer">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText">准备中...</div>
        </div>
        <div id="debugInfo"></div>
      </div>
    `;
    document.body.appendChild(container);
    return container;
  }

  // 拖拽功能
  function initDragAndDrop(container) {
    const icon = container.querySelector('.image-pack-icon');
    icon.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    icon.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', stopDrag);
    icon.addEventListener('click', toggleMenu);
  }

  function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    const container = document.querySelector('.image-pack-helper');
    container.classList.add('dragging');
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
  }
  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const container = document.querySelector('.image-pack-helper');
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - dragOffset.x;
    const y = clientY - dragOffset.y;
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    container.style.right = 'auto';
  }
  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    const container = document.querySelector('.image-pack-helper');
    container.classList.remove('dragging');
  }

  function toggleMenu(e) {
    e.stopPropagation();
    const menu = document.querySelector('.image-pack-menu');
    if (isMenuOpen) {
      menu.classList.remove('show');
      isMenuOpen = false;
    } else {
      menu.classList.add('show');
      isMenuOpen = true;
    }
  }

  // 获取图片（带调试信息）
  function getAllImages(debugInfo) {
    const url = window.location.href;
    const container = document.querySelector('.post__files');
    debugInfo['页面URL'] = url;
    debugInfo['是否找到文件容器'] = !!container;
    if (!container) {
      debugInfo['图片数量'] = 0;
      return [];
    }
    
    // 获取所有图片链接
    const imgLinks = container.querySelectorAll('.fileThumb.image-link');
    debugInfo['图片链接数量'] = imgLinks.length;
    const images = [];
    let filteredCount = 0;
    
    imgLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('data:')) {
        let src = href;
        if (src && src.startsWith('//')) src = 'https:' + src;
        const urlLower = src.toLowerCase();
        const isImage = urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
                       urlLower.includes('.png') || urlLower.includes('.gif') || 
                       urlLower.includes('.webp') || urlLower.includes('.bmp') ||
                       urlLower.includes('.svg');
        if (isImage) {
          images.push({
            src: src,
            index: index
          });
        } else {
          filteredCount++;
        }
      }
    });
    debugInfo['过滤掉的非图片文件'] = filteredCount;
    debugInfo['有效图片数量'] = images.length;
    return images;
  }

  // 下载图片
  async function downloadImage(url) {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      
      // 过滤掉小文件（小于50KB的文件）
      if (blob.size < 50 * 1024) {
        console.log(`跳过小文件: ${url}, 大小: ${blob.size} bytes`);
        return null;
      }
      
      return blob;
    } catch (error) {
      console.error(`下载失败: ${url}`, error);
      return null;
    }
  }

  // 自动下载和手动下载
  function triggerDownload(blob, zipName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName || 'Kemono图片打包助手.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 显示调试信息
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

  // 进度UI
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

  // 主打包逻辑
  async function packAndDownloadImages(debugMode) {
    if (isDownloading) return;
    isDownloading = true;
    lastZipBlob = null;
    lastZipName = 'Kemono图片打包助手.zip';
    const downloadBtn = document.getElementById('downloadBtn');
    const manualBtn = document.getElementById('manualDownloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>处理中...`;
    progressContainer.classList.add('show');
    progressText.textContent = '准备中...';
    progressFill.style.width = '0%';
    showDebugInfo({ 状态: '正在请求页面信息...' });

    // 获取作者和标题
    const { author, title } = getAuthorAndTitle();
    lastZipName = `${author}_${title}.zip`;

    const debugInfo = {};
    const images = getAllImages(debugInfo);
    if (debugMode) showDebugInfo(debugInfo);
    if (images.length === 0) {
      updateProgressUI('error', { message: '未找到图片' });
      showDebugInfo(debugInfo);
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>打包下载图片`;
      manualBtn.style.display = 'none';
      isDownloading = false;
      return;
    }
    updateProgressUI('start', { total: images.length });
    const zip = new JSZip();
    let downloadedCount = 0;
    let skippedCount = 0;
    for (let i = 0; i < images.length; i++) {
      updateProgressUI('downloading', { current: i + 1, total: images.length });
      showDebugInfo(debugInfo);
      const blob = await downloadImage(images[i].src);
      if (blob) {
        // 根据blob类型确定扩展名
        let extension = 'jpg'; // 默认扩展名
        if (blob.type.includes('png')) extension = 'png';
        else if (blob.type.includes('gif')) extension = 'gif';
        else if (blob.type.includes('webp')) extension = 'webp';
        else if (blob.type.includes('bmp')) extension = 'bmp';
        else if (blob.type.includes('svg')) extension = 'svg';
        // 只用序号命名
        const filename = `${String(downloadedCount + 1).padStart(3, '0')}.${extension}`;
        zip.file(filename, blob);
        downloadedCount++;
        debugInfo[`文件${downloadedCount}`] = `${filename} (${(blob.size / 1024).toFixed(1)}KB)`;
      } else {
        skippedCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    debugInfo['跳过的小文件数量'] = skippedCount;
    debugInfo['实际下载文件数量'] = downloadedCount;
    if (downloadedCount === 0) {
      updateProgressUI('error', { message: '下载失败，请检查网络连接' });
      showDebugInfo(debugInfo);
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>打包下载图片`;
      manualBtn.style.display = 'none';
      isDownloading = false;
      return;
    }
    updateProgressUI('zipping', {});
    showDebugInfo(debugInfo);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    lastZipBlob = zipBlob;
    updateProgressUI('done', { count: downloadedCount });
    showDebugInfo(debugInfo);
    // 自动下载
    triggerDownload(zipBlob, lastZipName);
    // 显示手动下载按钮
    manualBtn.style.display = 'block';
    manualBtn.onclick = () => {
      if (lastZipBlob) triggerDownload(lastZipBlob, lastZipName);
    };
    setTimeout(() => {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>打包下载图片`;
      progressContainer.classList.remove('show');
      progressFill.style.width = '0%';
      isDownloading = false;
    }, 3000);
  }

  // 初始化
  function init() {
    if (!window.location.href.includes('kemono.su/')) return;
    const container = createFloatingIcon();
    initDragAndDrop(container);
    document.getElementById('downloadBtn').addEventListener('click', () => packAndDownloadImages(true));
    // 菜单常驻：点击菜单不关闭，点击icon才切换
    document.querySelector('.image-pack-menu').addEventListener('mousedown', e => e.stopPropagation());
    document.querySelector('.image-pack-menu').addEventListener('touchstart', e => e.stopPropagation());
    // 不再监听document的点击关闭菜单
    console.log('Kemono图片打包助手悬浮面板已启动');
  }

  init();
})(); 