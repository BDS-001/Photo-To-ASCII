document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const ASCII_MAPS = {
        standard: ' _.,-=+:;cba!?0123456789$W#@Ñ',
        reversed: 'Ñ@#W$9876543210?!abc;:+=-,._ '
    }

    const DEFAULT_SETTINGS = {
        mode: 'greyscale',
        imgWidth: 150,
        imgHeight: 150,
        contrastFactor: 1,
        reverseIntensity : false,
        maintainAspectRatio : false
    }

    const domElements = {
        imageUpload : document.getElementById('imageUpload'),
        imgWidthInput : document.getElementById('imageWidth'),
        imgHeightInput : document.getElementById('imageHeight'),
        modeSelect : document.getElementById('mode'),
        asciiDisplay : document.getElementById('art'),
        imageSettings : document.getElementById('imageSettings'),

    }

    const state = {
        ...DEFAULT_SETTINGS,
        aspectRatio: null,
        currentImage: null
    }

    const settingHandlers = {
        mode: (e) => state.mode = e.target.value,
        imageWidth: (e) => handleImgDimensions('imageWidth', parseInt(e.target.value) || DEFAULT_SETTINGS.imgWidth),
        imageHeight: (e) => handleImgDimensions('imageHeight', parseInt(e.target.value) || DEFAULT_SETTINGS.imgHeight),
        contrastFactor: (e) => state.contrastFactor = parseFloat(e.target.value) || DEFAULT_SETTINGS.contrastFactor,
        reverseIntensity: (e) => state.reverseIntensity = e.target.checked,
        maintainAspectRatio: (e) => handleImgDimensions('maintainAspectRatio', e.target.checked)
    }
    
    domElements.imageSettings.addEventListener('change', handleSettingsChange)
    domElements.imageUpload.addEventListener('change', handleImageUpload)
    
    function handleSettingsChange(e) {
        const handler = settingHandlers[e.target.name]
        if (handler) {
            handler(e)
            if (state.currentImage) processImage(state.currentImage)
        }
    }

    function handleImageUpload(e) {
        const imageFile = e.target.files[0]
        if (!imageFile) return
        if (!imageFile.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        state.currentImage = imageFile;
        processImage(imageFile);
    }

    function processImage(file) {
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const uploadedImg = e.target.result;
                const img = new Image();
                img.src = uploadedImg;
                
                img.onload = () => {
                    state.aspectRatio = img.width / img.height;
                    
                
                    canvas.width = state.imgWidth;
                    canvas.height = state.imgHeight;
                
                    context.drawImage(img, 0, 0, state.imgWidth, state.imgHeight);
                    let pixelData = context.getImageData(0, 0, state.imgWidth, state.imgHeight).data;
                    
                    if (state.mode === 'greyscale') displayArt(convertToASCII(applyContrast(convertToGreyscale(pixelData))));
                };
                img.src = uploadedImg;
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    function handleImgDimensions(name, value) {
        if (name === 'maintainAspectRatio') {
            state.maintainAspectRatio = value;
            if (state.aspectRatio) {
                state.imgHeight = Math.floor((state.imgWidth / state.aspectRatio) / 2);
                domElements.imgHeightInput.value = state.imgHeight;
            }
            return
        }

        if (name === 'imageWidth') {
            state.imgWidth = value;
            if (state.maintainAspectRatio && state.aspectRatio) {
                state.imgHeight = Math.floor((state.imgWidth / state.aspectRatio) / 2);
                domElements.imgHeightInput.value = state.imgHeight;
            }
            return
        }

        if (name === 'imageHeight') {
            state.imgHeight = value;
            if (state.maintainAspectRatio && state.aspectRatio) {
                state.imgWidth = Math.floor((state.imgHeight * state.aspectRatio) * 2);
                domElements.imgWidthInput.value = state.imgWidth;
            }
            return
        }
    }

    function convertToGreyscale(pixelData) {
        const greyscaleData = new Uint8ClampedArray(pixelData.length/4);
        for (let i = 0; i < greyscaleData.length; i++) {
            const Red = pixelData[i * 4];
            const Green = pixelData[(i * 4) + 1];
            const Blue = pixelData[(i * 4) + 2];
    
            greyscaleData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue);
        }
        return greyscaleData;
    }
    
    function applyContrast(greyscaleData) {
        return greyscaleData.map(pixel => Math.floor(((pixel / 255 - 0.5) * state.contrastFactor + 0.5) * 255))
    }
    
    function convertToASCII(greyscaleData) {
        const asciiIntensity = state.reverseIntensity ? ASCII_MAPS.reversed : ASCII_MAPS.standard
        const artLines = [];
        const divider = Math.floor(255 / (asciiIntensity.length - 1));
    
        for (let i = 0; i < greyscaleData.length; i += state.imgWidth) {
            const line = [];
            for (let j = 0; j < state.imgWidth; j++) {
                const index = Math.min(Math.floor(greyscaleData[i + j] / divider), asciiIntensity.length - 1);
                line.push(asciiIntensity[index]);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }
    
    function displayArt(artData) {
        domElements.asciiDisplay.innerHTML = `<pre>${artData}</pre>`;
    }
});