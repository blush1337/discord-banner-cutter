const BANNER_WIDTH = 400;
const BANNER_HEIGHT = 140;
const AVATAR_SIZE = 120;
const AVATAR_OUTPUT_SIZE = 80;
const AVATAR_X = 30;
const AVATAR_Y = 80;

let originalImage = null;
let scale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;

// GIF support
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

loadBannerBtn.addEventListener('click', () => fileInput.click());

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

function loadStaticImage(file) {
    isGif = false;
    gifFrames = [];
    
    console.log(`Loading static image: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB, type: ${file.type}`);
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            console.log(`Static image loaded: ${img.width}x${img.height}`);
            
            originalImage = img;
            scale = BANNER_WIDTH / img.width;
            offsetX = 0;
            offsetY = 0;
            
            console.log(`Initial scale: ${scale.toFixed(3)}, offset: (${offsetX}, ${offsetY})`);
            
            updateEditor();
            updatePreview();
            
            saveBannerBtn.disabled = false;
            saveAvatarBtn.disabled = false;
            saveAllBtn.disabled = false;
            
            console.log('Static image ready for editing');
        };
        img.onerror = () => {
            console.error('Failed to load static image');
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
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        
        // Создаем временный img элемент для SuperGif
        const tempImg = document.createElement('img');
        tempImg.setAttribute('rel:animated_src', dataUrl);
        tempImg.setAttribute('rel:auto_play', '0');
        tempImg.style.position = 'absolute';
        tempImg.style.left = '-9999px';
        document.body.appendChild(tempImg);
        
        try {
            // Используем SuperGif для парсинга
            const rub = new SuperGif({ 
                gif: tempImg,
                auto_play: false,
                loop_mode: false,
                show_progress_bar: false
            });
            
            rub.load(() => {
                try {
                    const frameCount = rub.get_length();
                    console.log(`SuperGif: detected ${frameCount} frames`);
                    
                    if (frameCount === 0) {
                        throw new Error('No frames in GIF');
                    }
                    
                    const canvas = rub.get_canvas();
                    const width = canvas.width;
                    const height = canvas.height;
                    
                    console.log(`GIF dimensions: ${width}x${height}`);
                    
                    // Извлекаем все кадры
                    for (let i = 0; i < frameCount; i++) {
                        rub.move_to(i);
                        
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = width;
                        frameCanvas.height = height;
                        const ctx = frameCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, 0);
                        
                        // Используем фиксированную задержку 100ms
                        gifFrames.push({
                            canvas: frameCanvas,
                            delay: 100
                        });
                        
                        if ((i + 1) % 10 === 0 || i === frameCount - 1) {
                            console.log(`Extracted frame ${i + 1}/${frameCount}`);
                        }
                    }
                    
                    if (document.body.contains(tempImg)) {
                        document.body.removeChild(tempImg);
                    }
                    
                    console.log(`Total frames extracted: ${gifFrames.length}`);
                    
                    originalImage = gifFrames[0].canvas;
                    scale = BANNER_WIDTH / originalImage.width;
                    offsetX = 0;
                    offsetY = 0;
                    
                    console.log(`Initial scale: ${scale.toFixed(3)}, offset: (${offsetX}, ${offsetY})`);
                    
                    if (gifFrames.length > 1) {
                        startGifAnimation();
                        console.log('GIF animation started');
                    }
                    
                    updateEditor();
                    updatePreview();
                    
                    saveBannerBtn.disabled = false;
                    saveAvatarBtn.disabled = false;
                    saveAllBtn.disabled = false;
                    
                    console.log('GIF ready for editing');
                    
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
            // Fallback на старый метод
            loadGifFallback(file);
        }
    };
    reader.readAsDataURL(file);
}

// Fallback метод для загрузки GIF как статического изображения
function loadGifFallback(file) {
    console.log('Используем fallback метод для GIF');
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Создаем canvas с первым кадром
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
            
            updateEditor();
            updatePreview();
            
            saveBannerBtn.disabled = false;
            saveAvatarBtn.disabled = false;
            saveAllBtn.disabled = false;
            
            alert('GIF загружен как статическое изображение (библиотека не доступна)');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Fallback метод для загрузки GIF как статического изображения
function loadGifFallback(file) {
    console.log('Using fallback method for GIF');
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Создаем canvas с первым кадром
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
            
            updateEditor();
            updatePreview();
            
            saveBannerBtn.disabled = false;
            saveAvatarBtn.disabled = false;
            saveAllBtn.disabled = false;
            
            console.warn('GIF loaded as static image (failed to extract frames)');
            alert('GIF loaded as static image (failed to extract frames)');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startGifAnimation() {
    if (!isGif || gifFrames.length === 0) return;
    
    stopGifAnimation();
    
    let frameIndex = 0;
    
    function animate() {
        if (!isGif) return;
        
        const frame = gifFrames[frameIndex];
        originalImage = frame.canvas;
        
        updateEditor();
        updatePreview();
        
        frameIndex = (frameIndex + 1) % gifFrames.length;
        
        const delay = frame.delay || 100;
        gifAnimationId = setTimeout(() => {
            requestAnimationFrame(animate);
        }, delay);
    }
    
    animate();
}

function stopGifAnimation() {
    if (gifAnimationId) {
        clearTimeout(gifAnimationId);
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
    previewCtx.fillStyle = '#232428';
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
        const previewScale = displayBannerWidth / BANNER_WIDTH;
        const previewAvatarX = AVATAR_X * previewScale;
        const previewAvatarY = AVATAR_Y * previewScale;
        const previewAvatarSize = AVATAR_SIZE * previewScale;
        
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
        
        previewCtx.strokeStyle = '#232428';
        previewCtx.lineWidth = 6;
        previewCtx.beginPath();
        previewCtx.arc(
            previewAvatarX + previewAvatarSize / 2,
            previewAvatarY + previewAvatarSize / 2,
            previewAvatarSize / 2,
            0,
            Math.PI * 2
        );
        previewCtx.stroke();
    }
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
        // Подготавливаем кадры для gifshot
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
        
        // Используем gifshot для создания GIF
        gifshot.createGIF({
            images: images,
            gifWidth: BANNER_WIDTH,
            gifHeight: BANNER_HEIGHT,
            interval: 0.05, // 50ms между кадрами
            numFrames: images.length,
            frameDuration: 1,
            sampleInterval: 10,
            numWorkers: 2
        }, (obj) => {
            if (!obj.error) {
                console.log('GIF banner created successfully');
                // Конвертируем base64 в blob
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
        // Подготавливаем кадры аватарки
        const images = gifFrames.map((frame, index) => {
            const avatarCanvas = document.createElement('canvas');
            avatarCanvas.width = AVATAR_OUTPUT_SIZE;
            avatarCanvas.height = AVATAR_OUTPUT_SIZE;
            const ctx = avatarCanvas.getContext('2d');
            
            // Создаем круглую маску
            ctx.beginPath();
            ctx.arc(AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // Рисуем обрезанную часть
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
        
        // Используем gifshot для создания GIF
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

updateEditor();
updatePreview();
