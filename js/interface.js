// --- interface.js : Logistique et UI ---

const btnCamera = document.getElementById("btn-camera");
const btnCapture = document.getElementById("btn-capture");
const fileUpload = document.getElementById("file-upload");

const videoElement = document.getElementById("video");
const imagePreview = document.getElementById("image-preview");
const uiCanvas = document.getElementById("canvas");

let stream = null;

// 1. Gérer l'Upload de fichier
fileUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        stopCamera(); // On coupe la caméra si elle était allumée
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = "block";
            videoElement.style.display = "none";
            
            // On attend que l'image soit chargée sur la page avant de l'analyser
            imagePreview.onload = () => {
                uiCanvas.width = imagePreview.width;
                uiCanvas.height = imagePreview.height;
                // APPEL AU MOTEUR IA (app.js)
                analyzeSource(imagePreview); 
            };
        };
        reader.readAsDataURL(file);
    }
});

// 2. Activer la Caméra
btnCamera.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoElement.srcObject = stream;
        
        videoElement.style.display = "block";
        imagePreview.style.display = "none";
        btnCapture.style.display = "inline-block";
        btnCamera.style.display = "none";
        
        // On nettoie le canvas des anciennes détections
        const ctx = uiCanvas.getContext("2d");
        ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        
    } catch (err) {
        alert("Erreur d'accès à la caméra : " + err.message);
    }
});

// 3. Prendre une photo depuis la vidéo
btnCapture.addEventListener("click", () => {
    if (!stream) return;

    // Créer un canvas temporaire pour capturer l'image de la vidéo
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);

    // Convertir la capture en image
    imagePreview.src = tempCanvas.toDataURL("image/png");
    imagePreview.style.display = "block";
    videoElement.style.display = "none";
    
    stopCamera();

    // Adapter le vrai canvas et lancer l'analyse
    imagePreview.onload = () => {
        uiCanvas.width = imagePreview.width;
        uiCanvas.height = imagePreview.height;
        // APPEL AU MOTEUR IA (app.js)
        analyzeSource(imagePreview);
    };
});

// Fonction utilitaire pour couper proprement la caméra
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    btnCapture.style.display = "none";
    btnCamera.style.display = "inline-block";
}