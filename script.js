const BANNER_WIDTH = 400;
const BANNER_HEIGHT = 140;
const AVATAR_SIZE = 120;
const AVATAR_OUTPUT_SIZE = 128;
const AVATAR_X = 30;
const AVATAR_Y = 80;

let originalImage = null;
let scale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;

let isGif = false;
let gifFrames = [];
let currentFrame = 0;
let gifAnimationId = null;
let gifUrl = null;

const editorCanvas = document.getElementById('editorCanvas');
const editorCtx = editorCanvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

const displayScale = editorCanvas.width / BANNER_WIDTH;

const fileInput = document.getElementById('fileInput');
const loadBannerBtn = document.getElementById('loadBanner');
const saveBannerBtn = document.getElementById('saveBanner');
const saveAvatarBtn = document.getElementById('saveAvatar');
const saveAllBtn = document.getElementById('saveAll');
const urlInput = document.getElementById('urlInput');
const loadFromUrlBtn = document.getElementById('loadFromUrl');
const toggleUrlInputBtn = document.getElementById('toggleUrlInput');
const urlSection = document.getElementById('urlSection');

const container = document.querySelector('.container');
const editorSection = document.querySelector('.editor-section');
const previewSection = document.querySelector('.preview-section');
const progressContainer = document.querySelector('.progress-container');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const footer = document.querySelector('.footer');
const asciiDiscord = document.getElementById('asciiDiscord');
const asciiCutter = document.getElementById('asciiCutter');

container.classList.add('compact');

function updateProgress(percent) {
    progressPercent.textContent = Math.round(percent);
    const barLength = 40;
    const fillLength = Math.round((percent / 100) * barLength);
    const emptyLength = barLength - fillLength;
    progressFill.textContent = '█'.repeat(fillLength) + '░'.repeat(emptyLength);
}

function showProgress() {
    progressContainer.classList.add('visible');
    updateProgress(0);
}

function hideProgress() {
    progressContainer.classList.remove('visible');
}

loadBannerBtn.addEventListener('click', () => fileInput.click());

toggleUrlInputBtn.addEventListener('click', () => {
    if (urlSection.style.display === 'none') {
        urlSection.style.display = 'block';
        toggleUrlInputBtn.textContent = '▲';
    } else {
        urlSection.style.display = 'none';
        toggleUrlInputBtn.textContent = '▼';
    }
});

loadFromUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert('Вставьте прямую ссылку на изображение');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('URL должен начинаться с http:// или https://');
        return;
    }
    
    if (url.includes('pinterest.com/pin/') || url.includes('pin.it/')) {
        alert('Это ссылка на страницу Pinterest, а не на изображение.\n\nДля Pinterest:\n1. Скачайте GIF с Pinterest\n2. Используйте кнопку [ LOAD_BANNER ] для загрузки файла');
        return;
    }
    
    loadImageFromUrl(url);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    stopGifAnimation();
    
    if (file.type === 'image/gif') {
        loadGif(file);
    } else {
        loadStaticImage(file);
    }
});

document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (!blob) continue;
            
            stopGifAnimation();
            
            if (blob.type === 'image/gif') {
                loadGif(blob);
            } else {
                loadStaticImage(blob);
            }
            break;
        }
    }
});

async function loadImageFromUrl(url) {
    stopGifAnimation();
    
    console.log(`Loading image from URL: ${url}`);
    
    showProgress();
    updateProgress(10);
    
    try {
        console.log('Loading image directly...');
        
        updateProgress(30);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        updateProgress(50);
        
        const blob = await response.blob();
        console.log(`Downloaded blob: ${(blob.size / 1024).toFixed(2)} KB, type: ${blob.type}`);
        
        if (blob.type === 'image/gif') {
            const file = new File([blob], 'image.gif', { type: 'image/gif' });
            loadGif(file);
        } else {
            const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
            loadStaticImage(file);
        }
        
    } catch (error) {
        console.error('Error loading image from URL:', error);
        hideProgress();
        
        let errorMessage = 'Не удалось загрузить изображение.\n\n';
        errorMessage += 'Возможные причины:\n';
        errorMessage += '- Сервер блокирует загрузку (CORS)\n';
        errorMessage += '- Неверная ссылка или изображение недоступно\n';
        errorMessage += '- Требуется авторизация\n\n';
        errorMessage += 'Решение: Скачайте изображение и загрузите через [ LOAD_BANNER ]';
        
        alert(errorMessage);
    }
}

function loadStaticImage(file) {
    isGif = false;
    gifFrames = [];
    
    console.log(`Loading static image: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB, type: ${file.type}`);
    
    showProgress();
    updateProgress(10);
    
    const reader = new FileReader();
    reader.onload = (event) => {
        updateProgress(50);
        
        const img = new Image();
        img.onload = () => {
            console.log(`Static image loaded: ${img.width}x${img.height}`);
            
            updateProgress(75);
            
            originalImage = img;
            scale = BANNER_WIDTH / img.width;
            offsetX = 0;
            offsetY = 0;
            
            console.log(`Initial scale: ${scale.toFixed(3)}, offset: (${offsetX}, ${offsetY})`);
            
            startExpandAnimation();
            
            updateProgress(90);
            
            updateEditor();
            updatePreview();
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    updateProgress(100);
                    
                    setTimeout(() => {
                        hideProgress();
                        finishExpandAnimation();
                        
                        saveBannerBtn.disabled = false;
                        saveAvatarBtn.disabled = false;
                        saveAllBtn.disabled = false;
                        
                        console.log('Static image ready for editing');
                    }, 300);
                });
            });
        };
        img.onerror = () => {
            console.error('Failed to load static image');
            hideProgress();
            alert('Failed to load image');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function loadGif(file) {
    isGif = true;
    gifFrames = [];
    
    console.log(`Loading GIF: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB`);
    
    showProgress();
    updateProgress(10);
    
    const reader = new FileReader();
    reader.onload = (event) => {
        updateProgress(30);
        
        const dataUrl = event.target.result;
        
        const tempImg = document.createElement('img');
        tempImg.setAttribute('rel:animated_src', dataUrl);
        tempImg.setAttribute('rel:auto_play', '0');
        tempImg.style.position = 'absolute';
        tempImg.style.left = '-9999px';
        tempImg.style.visibility = 'hidden';
        tempImg.style.width = '0';
        tempImg.style.height = '0';
        tempImg.style.opacity = '0';
        document.body.appendChild(tempImg);
        
        try {
            const rub = new SuperGif({ 
                gif: tempImg,
                auto_play: false,
                loop_mode: false,
                show_progress_bar: false
            });
            
            rub.load(() => {
                try {
                    updateProgress(50);
                    
                    const frameCount = rub.get_length();
                    console.log(`SuperGif: detected ${frameCount} frames`);
                    
                    if (frameCount === 0) {
                        throw new Error('No frames in GIF');
                    }
                    
                    const canvas = rub.get_canvas();
                    const width = canvas.width;
                    const height = canvas.height;
                    
                    console.log(`GIF dimensions: ${width}x${height}`);
                    
                    for (let i = 0; i < frameCount; i++) {
                        rub.move_to(i);
                        
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = width;
                        frameCanvas.height = height;
                        const ctx = frameCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, 0);
                        
                        gifFrames.push({
                            canvas: frameCanvas,
                            delay: 100
                        });
                        
                        const progress = 50 + Math.round((i / frameCount) * 25);
                        updateProgress(progress);
                        
                        if ((i + 1) % 10 === 0 || i === frameCount - 1) {
                            console.log(`Extracted frame ${i + 1}/${frameCount}`);
                        }
                    }
                    
                    if (document.body.contains(tempImg)) {
                        document.body.removeChild(tempImg);
                    }
                    
                    console.log(`Total frames extracted: ${gifFrames.length}`);
                    
                    updateProgress(80);
                    
                    originalImage = gifFrames[0].canvas;
                    scale = BANNER_WIDTH / originalImage.width;
                    offsetX = 0;
                    offsetY = 0;
                    
                    console.log(`Initial scale: ${scale.toFixed(3)}, offset: (${offsetX}, ${offsetY})`);
                    
                    if (gifFrames.length > 1) {
                        startGifAnimation();
                        console.log('GIF animation started');
                    }
                    
                    startExpandAnimation();
                    
                    updateProgress(90);
                    
                    updateEditor();
                    updatePreview();
                    
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            updateProgress(100);
                            
                            setTimeout(() => {
                                hideProgress();
                                finishExpandAnimation();
                                
                                saveBannerBtn.disabled = false;
                                saveAvatarBtn.disabled = false;
                                saveAllBtn.disabled = false;
                                
                                console.log('GIF ready for editing');
                            }, 300);
                        });
                    });
                    
                } catch (error) {
                    console.error('Error extracting frames:', error);
                    if (document.body.contains(tempImg)) {
                        document.body.removeChild(tempImg);
                    }
                    loadGifFallback(file);
                }
            });
            
        } catch (error) {
            console.error('SuperGif error:', error);
            if (document.body.contains(tempImg)) {
                document.body.removeChild(tempImg);
            }
            loadGifFallback(file);
        }
    };
    reader.readAsDataURL(file);
}

function loadGifFallback(file) {
    console.log('Using fallback method for GIF');
    const reader = new FileReader();
    reader.onload = (event) => {
        updateProgress(60);
        
        const img = new Image();
        img.onload = () => {
            updateProgress(80);
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            gifFrames = [{
                canvas: canvas,
                delay: 100
            }];
            
            originalImage = canvas;
            scale = BANNER_WIDTH / originalImage.width;
            offsetX = 0;
            offsetY = 0;
            
            startExpandAnimation();
            
            updateProgress(90);
            
            updateEditor();
            updatePreview();
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    updateProgress(100);
                    
                    setTimeout(() => {
                        hideProgress();
                        finishExpandAnimation();
                        
                        saveBannerBtn.disabled = false;
                        saveAvatarBtn.disabled = false;
                        saveAllBtn.disabled = false;
                        
                        console.warn('GIF loaded as static image (failed to extract frames)');
                        alert('GIF loaded as static image (failed to extract frames)');
                    }, 300);
                });
            });
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startGifAnimation() {
    if (!isGif || gifFrames.length === 0) return;
    
    stopGifAnimation();
    
    let frameIndex = 0;
    let lastFrameTime = performance.now();
    
    function animate(currentTime) {
        if (!isGif) return;
        
        const frame = gifFrames[frameIndex];
        const delay = frame.delay || 100;
        const elapsed = currentTime - lastFrameTime;
        
        if (elapsed >= delay) {
            originalImage = frame.canvas;
            
            updateEditor();
            updatePreview();
            
            frameIndex = (frameIndex + 1) % gifFrames.length;
            lastFrameTime = currentTime;
        }
        
        gifAnimationId = requestAnimationFrame(animate);
    }
    
    gifAnimationId = requestAnimationFrame(animate);
}

function stopGifAnimation() {
    if (gifAnimationId) {
        cancelAnimationFrame(gifAnimationId);
        gifAnimationId = null;
    }
}

function updateEditor() {
    if (!originalImage) return;
    
    editorCtx.fillStyle = '#1E1F22';
    editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
    
    const scaledWidth = originalImage.width * scale;
    const scaledHeight = originalImage.height * scale;
    
    const displayOffsetX = offsetX * displayScale;
    const displayOffsetY = offsetY * displayScale;
    const displayWidth = scaledWidth * displayScale;
    const displayHeight = scaledHeight * displayScale;
    
    editorCtx.drawImage(originalImage, displayOffsetX, displayOffsetY, displayWidth, displayHeight);
    
    const bannerBottom = BANNER_HEIGHT * displayScale;
    editorCtx.strokeStyle = '#5865F2';
    editorCtx.lineWidth = 2;
    editorCtx.beginPath();
    editorCtx.moveTo(0, bannerBottom);
    editorCtx.lineTo(editorCanvas.width, bannerBottom);
    editorCtx.stroke();
    
    const avatarX = AVATAR_X * displayScale;
    const avatarY = AVATAR_Y * displayScale;
    const avatarSize = AVATAR_SIZE * displayScale;
    
    editorCtx.strokeStyle = '#000000';
    editorCtx.lineWidth = 3;
    editorCtx.beginPath();
    editorCtx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    editorCtx.stroke();
    
    editorCtx.fillStyle = '#FFFFFF';
    editorCtx.font = '12px Arial';
    editorCtx.fillText(`Размер: ${BANNER_WIDTH}x${BANNER_HEIGHT}`, 10, editorCanvas.height - 10);
}

function updatePreview() {
    previewCtx.fillStyle = '#111214';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    if (!originalImage) {
        previewCtx.fillStyle = '#4E5058';
        previewCtx.font = '20px Arial';
        previewCtx.textAlign = 'center';
        previewCtx.fillText('Загрузите баннер', previewCanvas.width / 2, previewCanvas.height / 2);
        return;
    }
    
    const croppedBanner = getCroppedBanner();
    
    const displayBannerWidth = 600;
    const displayBannerHeight = 210;
    previewCtx.drawImage(croppedBanner, 0, 0, displayBannerWidth, displayBannerHeight);
    
    const avatar = getAvatarCrop();
    
    if (avatar) {
        const previewAvatarX = 30;
        const previewAvatarY = displayBannerHeight - 80;
        const previewAvatarSize = 140;
        
        previewCtx.save();
        previewCtx.beginPath();
        previewCtx.arc(
            previewAvatarX + previewAvatarSize / 2,
            previewAvatarY + previewAvatarSize / 2,
            previewAvatarSize / 2,
            0,
            Math.PI * 2
        );
        previewCtx.closePath();
        previewCtx.clip();
        
        previewCtx.drawImage(avatar, previewAvatarX, previewAvatarY, previewAvatarSize, previewAvatarSize);
        previewCtx.restore();
        
        previewCtx.strokeStyle = '#111214';
        previewCtx.lineWidth = 8;
        previewCtx.beginPath();
        previewCtx.arc(
            previewAvatarX + previewAvatarSize / 2,
            previewAvatarY + previewAvatarSize / 2,
            previewAvatarSize / 2,
            0,
            Math.PI * 2
        );
        previewCtx.stroke();
        
        const statusSize = 32;
        const statusX = previewAvatarX + previewAvatarSize - statusSize + 2;
        const statusY = previewAvatarY + previewAvatarSize - statusSize + 2;
        
        previewCtx.fillStyle = '#111214';
        previewCtx.beginPath();
        previewCtx.arc(statusX + statusSize / 2, statusY + statusSize / 2, statusSize / 2 + 4, 0, Math.PI * 2);
        previewCtx.fill();
        
        previewCtx.fillStyle = '#23A559';
        previewCtx.beginPath();
        previewCtx.arc(statusX + statusSize / 2, statusY + statusSize / 2, statusSize / 2, 0, Math.PI * 2);
        previewCtx.fill();
    }
    
    const badgeX = 240;
    const badgeY = displayBannerHeight + 20;
    const badgeWidth = 320;
    const badgeHeight = 50;
    const badgeRadius = 25;
    
    previewCtx.fillStyle = '#2B2D31';
    previewCtx.beginPath();
    previewCtx.moveTo(badgeX + badgeRadius, badgeY);
    previewCtx.lineTo(badgeX + badgeWidth - badgeRadius, badgeY);
    previewCtx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + badgeRadius);
    previewCtx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - badgeRadius);
    previewCtx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - badgeRadius, badgeY + badgeHeight);
    previewCtx.lineTo(badgeX + badgeRadius, badgeY + badgeHeight);
    previewCtx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - badgeRadius);
    previewCtx.lineTo(badgeX, badgeY + badgeRadius);
    previewCtx.quadraticCurveTo(badgeX, badgeY, badgeX + badgeRadius, badgeY);
    previewCtx.closePath();
    previewCtx.fill();
    
    previewCtx.fillStyle = '#B5BAC1';
    previewCtx.font = '18px "Courier New", monospace';
    previewCtx.textAlign = 'center';
    previewCtx.fillText('"./assets/wind.jpeg"', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 6);
    
    const textX = 30;
    const textY = displayBannerHeight + 90;
    
    previewCtx.fillStyle = '#F2F3F5';
    previewCtx.font = 'bold 32px Arial';
    previewCtx.textAlign = 'left';
    previewCtx.fillText('blush', textX, textY);
    
    const idY = textY + 40;
    previewCtx.fillStyle = '#B5BAC1';
    previewCtx.font = '20px Arial';
    previewCtx.fillText('id8324', textX, idY);
}

function getCroppedBanner() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = BANNER_WIDTH;
    tempCanvas.height = BANNER_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    
    const visibleWidth = BANNER_WIDTH / scale;
    const visibleHeight = BANNER_HEIGHT / scale;
    
    const x1 = -offsetX / scale;
    const y1 = -offsetY / scale;
    
    tempCtx.drawImage(
        originalImage,
        x1, y1, visibleWidth, visibleHeight,
        0, 0, BANNER_WIDTH, BANNER_HEIGHT
    );
    
    return tempCanvas;
}

function getAvatarCrop() {
    if (!originalImage) return null;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = AVATAR_SIZE;
    tempCanvas.height = AVATAR_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    
    const origX1 = (AVATAR_X - offsetX) / scale;
    const origY1 = (AVATAR_Y - offsetY) / scale;
    const origSize = AVATAR_SIZE / scale;
    
    tempCtx.drawImage(
        originalImage,
        origX1, origY1, origSize, origSize,
        0, 0, AVATAR_SIZE, AVATAR_SIZE
    );
    
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = AVATAR_OUTPUT_SIZE;
    outputCanvas.height = AVATAR_OUTPUT_SIZE;
    const outputCtx = outputCanvas.getContext('2d');
    
    outputCtx.drawImage(tempCanvas, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
    
    return outputCanvas;
}

editorCanvas.addEventListener('mousedown', (e) => {
    if (!originalImage) return;
    isDragging = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
});

editorCanvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.offsetX - lastX;
    const deltaY = e.offsetY - lastY;
    
    offsetX += deltaX / displayScale;
    offsetY += deltaY / displayScale;
    
    lastX = e.offsetX;
    lastY = e.offsetY;
    
    updateEditor();
    updatePreview();
});

editorCanvas.addEventListener('mouseup', () => {
    isDragging = false;
});

editorCanvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

editorCanvas.addEventListener('wheel', (e) => {
    if (!originalImage) return;
    e.preventDefault();
    
    const oldScale = scale;
    
    if (e.deltaY < 0) {
        scale *= 1.1;
    } else {
        scale /= 1.1;
    }
    
    const minScale = Math.max(BANNER_WIDTH / originalImage.width, BANNER_HEIGHT / originalImage.height);
    const maxScale = 5.0;
    scale = Math.max(minScale, Math.min(maxScale, scale));
    
    const scaleRatio = scale / oldScale;
    const mouseX = e.offsetX / displayScale;
    const mouseY = e.offsetY / displayScale;
    
    offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
    offsetY = mouseY - (mouseY - offsetY) * scaleRatio;
    
    updateEditor();
    updatePreview();
});

saveBannerBtn.addEventListener('click', async () => {
    console.log(`=== Saving banner (isGif: ${isGif}) ===`);
    
    if (isGif) {
        saveBannerBtn.disabled = true;
        saveBannerBtn.textContent = '[ PROCESSING... ]';
        await saveGifBanner();
        saveBannerBtn.disabled = false;
        saveBannerBtn.textContent = '[ SAVE_BANNER ]';
    } else {
        console.log('Cropping static banner...');
        const banner = getCroppedBanner();
        downloadCanvas(banner, 'discord_banner.png');
        console.log('Static banner saved');
    }
});

saveAvatarBtn.addEventListener('click', async () => {
    console.log(`=== Saving avatar (isGif: ${isGif}) ===`);
    
    if (isGif) {
        saveAvatarBtn.disabled = true;
        saveAvatarBtn.textContent = '[ PROCESSING... ]';
        await saveGifAvatar();
        saveAvatarBtn.disabled = false;
        saveAvatarBtn.textContent = '[ SAVE_AVATAR ]';
    } else {
        console.log('Cropping static avatar...');
        const avatar = getAvatarCrop();
        if (!avatar) return;
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = AVATAR_OUTPUT_SIZE;
        finalCanvas.height = AVATAR_OUTPUT_SIZE;
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.beginPath();
        finalCtx.arc(AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, 0, Math.PI * 2);
        finalCtx.closePath();
        finalCtx.clip();
        
        finalCtx.drawImage(avatar, 0, 0);
        
        downloadCanvas(finalCanvas, 'discord_avatar.png');
        console.log('Static avatar saved');
    }
});

saveAllBtn.addEventListener('click', async () => {
    if (isGif) {
        saveAllBtn.disabled = true;
        saveAllBtn.textContent = '[ PROCESSING... ]';
        await saveGifBanner();
        await new Promise(resolve => setTimeout(resolve, 500));
        await saveGifAvatar();
        saveAllBtn.disabled = false;
        saveAllBtn.textContent = '[ SAVE_ALL ]';
    } else {
        saveBannerBtn.click();
        setTimeout(() => saveAvatarBtn.click(), 500);
    }
});

async function saveGifBanner() {
    console.log(`Starting banner save, frames: ${gifFrames.length}`);
    
    return new Promise((resolve, reject) => {
        const images = gifFrames.map((frame, index) => {
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = BANNER_WIDTH;
            croppedCanvas.height = BANNER_HEIGHT;
            const ctx = croppedCanvas.getContext('2d');
            
            const visibleWidth = BANNER_WIDTH / scale;
            const visibleHeight = BANNER_HEIGHT / scale;
            const x1 = -offsetX / scale;
            const y1 = -offsetY / scale;
            
            ctx.drawImage(
                frame.canvas,
                x1, y1, visibleWidth, visibleHeight,
                0, 0, BANNER_WIDTH, BANNER_HEIGHT
            );
            
            if ((index + 1) % 10 === 0 || index === gifFrames.length - 1) {
                console.log(`Prepared banner frame ${index + 1}/${gifFrames.length}`);
            }
            return croppedCanvas.toDataURL('image/png');
        });
        
        console.log(`Creating GIF from ${images.length} frames...`);
        
        gifshot.createGIF({
            images: images,
            gifWidth: BANNER_WIDTH,
            gifHeight: BANNER_HEIGHT,
            interval: 0.05,
            numFrames: images.length,
            frameDuration: 1,
            sampleInterval: 10,
            numWorkers: 2
        }, (obj) => {
            if (!obj.error) {
                console.log('GIF banner created successfully');
                fetch(obj.image)
                    .then(res => res.blob())
                    .then(blob => {
                        console.log(`Banner file size: ${(blob.size / 1024).toFixed(2)} KB`);
                        downloadBlob(blob, 'discord_banner.gif');
                        resolve();
                    })
                    .catch(err => {
                        console.error('Save error:', err);
                        alert('Error saving GIF');
                        reject(err);
                    });
            } else {
                console.error('GIF creation error:', obj.error);
                alert('Error creating GIF: ' + obj.error);
                reject(obj.error);
            }
        });
    });
}

async function saveGifAvatar() {
    console.log(`Starting avatar save, frames: ${gifFrames.length}`);
    
    return new Promise((resolve, reject) => {
        const images = gifFrames.map((frame, index) => {
            const avatarCanvas = document.createElement('canvas');
            avatarCanvas.width = AVATAR_OUTPUT_SIZE;
            avatarCanvas.height = AVATAR_OUTPUT_SIZE;
            const ctx = avatarCanvas.getContext('2d');
            
            ctx.beginPath();
            ctx.arc(AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            const origX1 = (AVATAR_X - offsetX) / scale;
            const origY1 = (AVATAR_Y - offsetY) / scale;
            const origSize = AVATAR_SIZE / scale;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = AVATAR_SIZE;
            tempCanvas.height = AVATAR_SIZE;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.drawImage(
                frame.canvas,
                origX1, origY1, origSize, origSize,
                0, 0, AVATAR_SIZE, AVATAR_SIZE
            );
            
            ctx.drawImage(tempCanvas, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
            
            if ((index + 1) % 10 === 0 || index === gifFrames.length - 1) {
                console.log(`Prepared avatar frame ${index + 1}/${gifFrames.length}`);
            }
            return avatarCanvas.toDataURL('image/png');
        });
        
        console.log(`Creating GIF avatar from ${images.length} frames...`);
        
        gifshot.createGIF({
            images: images,
            gifWidth: AVATAR_OUTPUT_SIZE,
            gifHeight: AVATAR_OUTPUT_SIZE,
            interval: 0.05,
            numFrames: images.length,
            frameDuration: 1,
            sampleInterval: 10,
            numWorkers: 2
        }, (obj) => {
            if (!obj.error) {
                console.log('GIF avatar created successfully');
                fetch(obj.image)
                    .then(res => res.blob())
                    .then(blob => {
                        console.log(`Avatar file size: ${(blob.size / 1024).toFixed(2)} KB`);
                        downloadBlob(blob, 'discord_avatar.gif');
                        resolve();
                    })
                    .catch(err => {
                        console.error('Save error:', err);
                        alert('Error saving GIF');
                        reject(err);
                    });
            } else {
                console.error('GIF creation error:', obj.error);
                alert('Error creating GIF: ' + obj.error);
                reject(obj.error);
            }
        });
    });
}

function downloadCanvas(canvas, filename) {
    console.log(`Downloading canvas as ${filename}`);
    canvas.toBlob((blob) => {
        console.log(`File size: ${(blob.size / 1024).toFixed(2)} KB`);
        downloadBlob(blob, filename);
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`Downloaded: ${filename}`);
}

function startExpandAnimation() {
    container.classList.remove('compact');
    container.classList.add('expanded');
    
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
        subtitle.classList.add('hidden');
    }
    
    setTimeout(() => {
        if (asciiDiscord) {
            asciiDiscord.classList.add('hidden');
            setTimeout(() => {
                asciiDiscord.style.display = 'none';
            }, 500);
        }
    }, 300);
    
    setTimeout(() => {
        if (asciiCutter) {
            asciiCutter.classList.add('visible');
        }
    }, 600);
    
    setTimeout(() => {
        if (footer) {
            footer.classList.add('move-up');
        }
    }, 400);
    
    setTimeout(() => {
        const saveButtons = document.querySelectorAll('.btn-success');
        saveButtons.forEach((btn, index) => {
            setTimeout(() => {
                btn.classList.add('visible');
            }, index * 100);
        });
    }, 700);
    
    setTimeout(() => {
        const sizeInfoElements = document.querySelectorAll('.info p.size-info');
        sizeInfoElements.forEach(el => {
            el.classList.add('hidden');
        });
        
        const controlsLine = document.querySelector('.info p.controls-line');
        if (controlsLine) {
            controlsLine.classList.add('visible');
        }
    }, 500);
}

function finishExpandAnimation() {
    setTimeout(() => {
        editorSection.classList.add('visible');
    }, 1000);
    
    setTimeout(() => {
        previewSection.classList.add('visible');
    }, 1200);
}

function expandContainer() {
    startExpandAnimation();
    finishExpandAnimation();
}

updateEditor();
updatePreview();

const titleSymbols = '⋆˙⟡˙⋆˙';
let titleIndex = 0;

setInterval(() => {
    document.title = titleSymbols.substring(titleIndex) + titleSymbols.substring(0, titleIndex);
    titleIndex = (titleIndex + 1) % titleSymbols.length;
}, 300);
