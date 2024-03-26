document.addEventListener('DOMContentLoaded', function () {
    const stage = new Konva.Stage({
        container: 'container',
        width: 400,
        height: 400
    });

    const bufferLayer = new Konva.Layer();
    stage.add(bufferLayer);

    const drawingLayer = new Konva.Layer();
    stage.add(drawingLayer);

    const pixelSize = 10; // Size of each pixel
    const undoStack = []; // Stack to store drawing history for undo
    const redoStack = []; // Stack to store undone actions for redo

    // Initialize the grid with white pixels
    const rows = stage.height() / pixelSize;
    const cols = stage.width() / pixelSize;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            createPixel(j, i, 'white');
        }
    }

    let isDrawing = false;
    let lastDrawnPixel = null;

    // Event listener to change pixel color on click
    stage.on('mousedown touchstart', function (event) {
        if (event.evt.which === 1) { // Left mouse button
            isDrawing = true;
            drawPixel(event);
        } else if (event.evt.which === 3) { // Right mouse button
            fillTool(event);
        }
    });

    stage.on('mousemove touchmove', function (event) {
        if (isDrawing) {
            drawPixel(event);
        }
    });

    stage.on('mouseup touchend', function () {
        isDrawing = false;
        lastDrawnPixel = null;
        addToUndoStack(); // Add current drawing state to undo stack after mouseup
        redoStack.length = 0; // Clear redo stack after new drawing action
    });

    // Event listener to handle undo/redo with keyboard shortcuts
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z') { // Ctrl + Z for undo
            undo();
        } else if (event.ctrlKey && event.key === 'y') { // Ctrl + Y for redo
            redo();
        }
    });

    function drawPixel(event) {
        const pointer = stage.getPointerPosition();
        const gridX = Math.floor(pointer.x / pixelSize);
        const gridY = Math.floor(pointer.y / pixelSize);
        const color = document.getElementById('colorPicker').value;

        // Only draw if the pointer is within the canvas bounds
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            if (!lastDrawnPixel || lastDrawnPixel.x !== gridX || lastDrawnPixel.y !== gridY) {
                createPixel(gridX, gridY, color);
                lastDrawnPixel = { x: gridX, y: gridY };
            }
        }
    }

    function createPixel(x, y, color) {
        const rect = new Konva.Rect({
            x: x * pixelSize,
            y: y * pixelSize,
            width: pixelSize,
            height: pixelSize,
            fill: color,
            draggable: false
        });
        drawingLayer.add(rect);
        drawingLayer.batchDraw();
    }

    function fillTool(event) {
        const pointer = stage.getPointerPosition();
        const gridX = Math.floor(pointer.x / pixelSize);
        const gridY = Math.floor(pointer.y / pixelSize);

        const targetPixel = getPixelAt(gridX, gridY);

        if (targetPixel) {
            const targetColor = targetPixel.fill();
            floodFill(gridX, gridY, targetColor, document.getElementById('colorPicker').value);
            drawingLayer.batchDraw();
            addToUndoStack();
        }
    }

    function getPixelAt(x, y) {
        const pixels = drawingLayer.children.slice();

        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            if (pixel.x() === x * pixelSize && pixel.y() === y * pixelSize) {
                return pixel;
            }
        }
        return null;
    }

    function floodFill(x, y, targetColor, replacementColor) {
        const pixel = getPixelAt(x, y);

        if (!pixel) return;

        const currentColor = pixel.fill();

        if (currentColor !== targetColor || currentColor === replacementColor) return;

        pixel.fill(replacementColor);

        floodFill(x + 1, y, targetColor, replacementColor); // Right
        floodFill(x - 1, y, targetColor, replacementColor); // Left
        floodFill(x, y + 1, targetColor, replacementColor); // Down
        floodFill(x, y - 1, targetColor, replacementColor); // Up
    }

    function addToUndoStack() {
        const state = drawingLayer.clone();
        undoStack.push(state);
    }

    function undo() {
        if (undoStack.length > 0) {
            const prevState = undoStack.pop();
            redoStack.push(drawingLayer.clone()); // Push current state to redo stack
            drawingLayer.destroyChildren();
            drawingLayer.add(prevState.children);
            drawingLayer.batchDraw();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            undoStack.push(drawingLayer.clone()); // Push current state to undo stack
            drawingLayer.destroyChildren();
            drawingLayer.add(nextState.children);
            drawingLayer.batchDraw();
        }
    }
    
    function submitKonvaImage() {
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        // Convert Konva stage to image
        const content = stage.toDataURL({ mimeType: 'image/png' });

        const file = dataURLtoFile(content, 'image.png'); // Convert data URL to file object
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', document.getElementById("nameInput").value);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            showPopup(data.image_link)
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    function dataURLtoFile(dataUrl, filename) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    const preview_stage = new Konva.Stage({
        container: 'preview-container',
        width: 1600,
        height: 1600
    });
    preview_stage.scaleX(0.5);
    preview_stage.scaleY(0.5);

    // Function to add images to layer from a JSON array
    function addImagesFromJSON(jsonArray, stage) {
        jsonArray.forEach(function (jsonObj) {
            // Create a new layer for each JSON object
            var layer = new Konva.Layer();
            stage.add(layer);
    
            var imageObj = new Image();
            imageObj.onload = function () {
                var image = new Konva.Image({
                    x: jsonObj.x_coord,         // X coordinate from JSON object
                    y: jsonObj.y_coord,         // Y coordinate from JSON object
                    image: imageObj,
                    width: 400,           // Image width (modify as needed)
                    height: 400           // Image height (modify as needed)
                });
    
                // Add the image to the layer
                layer.add(image);
                layer.draw(); // Draw the layer to see changes
            };
            imageObj.src = jsonObj.image_path; // Image URL from JSON object
        });
    }

    function loadPreviewImage(){
        fetchAnnotations()
        .then(data => {addImagesFromJSON(data,preview_stage)});
    }
    async function fetchAnnotations() {
        try {
            const response = await fetch('/annotations');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching annotations:', error);
            return [];
        }
    }
    function showPopup(url) {
        document.getElementById("popupUrl").innerText = url;
        document.getElementById("popupUrl").href = url;
        document.getElementById("popup").classList.remove("hidden");
    }

    function closePopup() {
        document.getElementById("popup").classList.add("hidden");
    }
    loadPreviewImage()
    // Usage:
    fetchAnnotations()
        .then(data => {
            const annotationsList = document.getElementById('annotations-list');
            data.forEach(annotation => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="border px-4 py-2">${annotation.name}</td>
                    <td class="border px-4 py-2">${annotation.image_path}</td>
                    <td class="border px-4 py-2">${annotation.x_coord}</td>
                    <td class="border px-4 py-2">${annotation.y_coord}</td>
                `;
                annotationsList.appendChild(row);
            });
        });
    // Add event listener to the submit button
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', submitKonvaImage);
    document.querySelectorAll('.tab-btn').forEach(item => {
        item.addEventListener('click', event => {
            const tabContent = document.querySelectorAll('.tab-content');
            tabContent.forEach(content => {
                content.classList.add('hidden');
            });
            const selectedTab = document.getElementById(event.target.dataset.target);
            selectedTab.classList.remove('hidden');
        });
    });
});