const fileInput = document.getElementById('imageUpload')

window.onload = function() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const img = new Image()
    img.src = './jollyroger.png'

    const aspectRatio = img.width / img.height
    const imgWidth = 100
    const imgHeight = imgWidth / aspectRatio

    canvas.width = imgWidth
    canvas.height = imgHeight

    context.drawImage(img, 0, 0, imgWidth, imgHeight)
    let pixelData = context.getImageData(0, 0, imgWidth, imgHeight).data
}

function convertToGreyscale(pixelData) {
    console.log(pixelData)
}