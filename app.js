class PhotoToAsciiProcessor {
    static ASCII_MAPS = {
        standard: ' _.,-=+:;cba!?0123456789$W#@Ñ',
        reversed: 'Ñ@#W$9876543210?!abc;:+=-,._ ',

    }

    static DEFAULT_SETTINGS = {
        mode: 'greyscale',
        imgWidth: 150,
        imgHeight: 150,
        contrastFactor: 1,
        reverseIntensity : false,
        maintainAspectRatio : false
    }

    constructor(canvas) {
        if (!canvas) {
            throw new Error('Canvas is required');
        }

        this.canvas = canvas
        this.context = this.canvas.getContext('2d')
        this.settings = {
            ...PhotoToAsciiProcessor.DEFAULT_SETTINGS,
            aspectRatio: null,
            currentImage: null,
            asciiDivider: Math.floor(255 / (PhotoToAsciiProcessor.ASCII_MAPS.standard.length - 1))
        }
    }

    _updateSettings = {
        mode: (value) => this.settings.mode = value,
        imgWidth: (value) => this.settings.imgWidth = value,
        imgHeight: (value) => this.settings.imgHeight = value,
        contrastFactor: (value) => this.settings.contrastFactor = value,
        reverseIntensity: (value) => this.settings.reverseIntensity = value,
        maintainAspectRatio: (value) => this.settings.maintainAspectRatio = value,
    }

    updateSettings(setting, value) {
        this._updateSettings[setting](value)
        this.handleImageDimensions(settings)
    }

    handleImageDimensions(setting) {
        if (!this.settings.aspectRatio) return

        if (setting === 'maintainAspectRatio') {
            if (this.settings.aspectRatio) {
                this._updateSettings.imgHeight(Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2))
            }
            return
        }

        if (setting === 'imageWidth') {
            if (this.settings.maintainAspectRatio && this.settings.aspectRatio) {
                this._updateSettings.imgHeight(Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2))
            }
            return
        }

        if (setting === 'imageHeight') {
            if (this.settings.maintainAspectRatio && this.settings.aspectRatio) {
                this._updateSettings.imgWidth(Math.floor((this.settings.imgHeight * this.settings.aspectRatio) * 2))
            }
            return
        }
    }

    async loadImage(file) {
        if (!file) throw new Error('No file provided');
        if (this.settings.currentImage?.element?.src) {
            URL.revokeObjectURL(this.settings.currentImage.element.src);
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.settings.currentImage = {
                    file: file,
                    element: img,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    pixelData: this.capturePixelData(img)
                };
                
                this.settings.aspectRatio = img.width / img.height;
                
                if (this.settings.maintainAspectRatio) {
                    this.settings.imgHeight = Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2);
                }
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    capturePixelData(img) {
        this.canvas.width = this.settings.imgWidth;
        this.canvas.height = this.settings.imgHeight;
    
        this.context.drawImage(img, 0, 0, this.settings.imgWidth, this.settings.imgHeight);
        return this.context.getImageData(0, 0, this.settings.imgWidth, this.settings.imgHeight).data;
    }

    convertToGreyscale() {
        const greyscaleData = new Uint8ClampedArray(this.settings.currentImage.pixelData.length/4);
        for (let i = 0; i < greyscaleData.length; i++) {
            const Red = this.settings.currentImage.pixelData[i * 4];
            const Green = this.settings.currentImage.pixelData[(i * 4) + 1];
            const Blue = this.settings.currentImage.pixelData[(i * 4) + 2];
    
            greyscaleData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue);
        }
        return greyscaleData;
    }

    applyContrast(greyscaleData) {
        return greyscaleData.map(pixel => Math.floor(((pixel / 255 - 0.5) * this.settings.contrastFactor + 0.5) * 255))
    }

    convertToASCII(greyscaleData) {
        const asciiIntensity = this.settings.reverseIntensity 
            ? PhotoToAsciiProcessor.ASCII_MAPS.reversed 
            : PhotoToAsciiProcessor.ASCII_MAPS.standard;
        const artLines = [];
    
        for (let i = 0; i < greyscaleData.length; i += this.settings.imgWidth) {
            const line = [];  // Added missing line array initialization
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const index = Math.min(
                    Math.floor(greyscaleData[i + j] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[index];
                line.push(character);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }
    
    convertToASCIIColor() {
        const pixelCount = this.settings.currentImage.pixelData.length / 4;
        const artLines = [];
    
        for (let i = 0; i < pixelCount; i += this.settings.imgWidth) {
            const line = [];
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const pixelIndex = (i + j) * 4;
                const red = this.settings.currentImage.pixelData[pixelIndex];
                const green = this.settings.currentImage.pixelData[pixelIndex + 1];
                const blue = this.settings.currentImage.pixelData[pixelIndex + 2];
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">@</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }
    
    convertToASCIIColorBrightness(greyscaleData) {
        const asciiIntensity = this.settings.reverseIntensity 
            ? PhotoToAsciiProcessor.ASCII_MAPS.reversed 
            : PhotoToAsciiProcessor.ASCII_MAPS.standard;
        const artLines = [];
    
        for (let i = 0; i < greyscaleData.length; i += this.settings.imgWidth) {
            const line = [];
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const pixelIndex = (i + j) * 4;
                const red = this.settings.currentImage.pixelData[pixelIndex];
                const green = this.settings.currentImage.pixelData[pixelIndex + 1];
                const blue = this.settings.currentImage.pixelData[pixelIndex + 2];
                const charindex = Math.min(
                    Math.floor(greyscaleData[i + j] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[charindex];
                
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    async processImage(image, mode = this.settings.mode) {
        await this.loadImage(image)
        switch (mode) {
            case 'greyscale':
                return this.convertToASCII(this.applyContrast(this.convertToGreyscale()));
            case 'color':
                return this.convertToASCIIColor();
            case 'colorBrightnessMap':
                return this.convertToASCIIColorBrightness(this.convertToGreyscale());
            default:
                throw new Error(`Unsupported mode: ${mode}`);
        }
    }  
}





















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
        currentImage: null,
        asciiDivider: Math.floor(255 / (ASCII_MAPS.standard.length - 1))
    }

    const imageProcessingModes = {
        greyscale: (pixelData) => displayArt(convertToASCII(applyContrast(convertToGreyscale(pixelData)))),
        color: (pixelData) => displayArt(convertToASCIIColor(pixelData)),
        colorBrightnessMap: (pixelData) => displayArt(convertToASCIIColorBrightness(pixelData, convertToGreyscale(pixelData))),
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
        if (!file) return
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            state.aspectRatio = img.width / img.height;
        
            canvas.width = state.imgWidth;
            canvas.height = state.imgHeight;
        
            context.drawImage(img, 0, 0, state.imgWidth, state.imgHeight);
            let pixelData = context.getImageData(0, 0, state.imgWidth, state.imgHeight).data;
            URL.revokeObjectURL(img.src)

            const imageProcessor = imageProcessingModes[state.mode]
            imageProcessor(pixelData)
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
    
        for (let i = 0; i < greyscaleData.length; i += state.imgWidth) {
            const result = [];
            for (let j = 0; j < state.imgWidth; j++) {
                const index = Math.min(Math.floor(greyscaleData[i + j] / state.asciiDivider), asciiIntensity.length - 1);
                const character = asciiIntensity[index];
                line.push(character)
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    function convertToASCIIColor(pixelData) {
        const pixelCount = pixelData.length / 4
        const artLines = [];
    
        for (let i = 0; i < pixelCount; i += state.imgWidth) {
            const line = [];
            for (let j = 0; j < state.imgWidth; j++) {
                const pixelIndex = (i + j) * 4
                const red = pixelData[pixelIndex]
                const green = pixelData[pixelIndex + 1]
                const blue = pixelData[pixelIndex + 2]
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">@</span>`)
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    function convertToASCIIColorBrightness(pixelData, greyscaleData) {
        const asciiIntensity = state.reverseIntensity ? ASCII_MAPS.reversed : ASCII_MAPS.standard
        const artLines = [];
    
        for (let i = 0; i < greyscaleData.length; i += state.imgWidth) {
            const line = [];
            for (let j = 0; j < state.imgWidth; j++) {
                const pixelIndex = (i + j) * 4
                const red = pixelData[pixelIndex]
                const green = pixelData[pixelIndex + 1]
                const blue = pixelData[pixelIndex + 2]
                const charindex = Math.min(Math.floor(greyscaleData[i + j] / state.asciiDivider), asciiIntensity.length - 1);
                const character = asciiIntensity[charindex];
                
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`)
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    function displayArt(artData) {
        domElements.asciiDisplay.innerHTML = `<pre>${artData}</pre>`;
    }
});