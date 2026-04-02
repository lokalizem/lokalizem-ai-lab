const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");

// Les classes de votre modèle
const CLASSES = ["person", "pistol"];
const COLORS = ["#00FF00", "#FF0000"]; // Vert pour personne, Rouge pour pistolet

let model;

// 1. Initialisation unique du modèle au chargement de la page
async function initModel() {
    statusText.innerText = "Chargement du modèle (cela peut prendre quelques secondes)...";
    try {
        // IMPORTANT : Vérifiez bien votre chemin ici. 
        // Si le json est dans un dossier, mettez 'best_web_model/model.json'
        model = await tf.loadGraphModel('best_web_model/model.json'); 
        
        statusText.innerText = "Modèle IA prêt ! Uploadez une image ou utilisez la caméra.";
        statusText.style.color = "#00FF00";
    } catch (error) {
        statusText.innerText = "Erreur de chargement du modèle : " + error.message;
        statusText.style.color = "red";
        console.error(error);
    }
}

// 2. Fonction d'analyse universelle (Appelée par interface.js)
// "sourceElement" peut être la balise <video> ou <img>
async function analyzeSource(sourceElement) {
    if (!model) {
        alert("Veuillez patienter, le modèle n'est pas encore chargé.");
        return;
    }

    statusText.innerText = "Analyse en cours...";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- PRÉPARATION DE L'IMAGE ---
    const input = tf.tidy(() => {
        return tf.browser.fromPixels(sourceElement)
            .resizeBilinear([640, 640]) // Le modèle attend du 640x640
            .div(255.0)                 // Normalisation des pixels entre 0 et 1
            .expandDims(0);             // Ajout d'une dimension (Batch = 1) -> [1, 640, 640, 3]
    });

    // --- EXÉCUTION DU MODÈLE ---
    const res = model.execute(input);

    // Extraction du tenseur principal
    const outputTensor = Array.isArray(res) ? res[0] : res;
    const data = await outputTensor.array(); 
    const predictions = data[0]; // Extraction des 300 détections

    // Libération immédiate de la mémoire de la carte graphique
    tf.dispose(input);
    if (Array.isArray(res)) {
        res.forEach(t => t.dispose());
    } else {
        res.dispose();
    }

    // --- DÉBOGAGE DANS LA CONSOLE ---
    if (predictions && predictions.length > 0) {
        const bestPrediction = predictions.reduce((prev, current) => 
            (prev[4] > current[4]) ? prev : current
        );

        const maxScore = bestPrediction[4];
        const classId = Math.round(bestPrediction[5]);
        const className = CLASSES[classId] || "unknown";

        console.log(`🔎 Résultat du scan : ${className} détecté avec un score de ${(maxScore * 100).toFixed(2)}%`);
    }

    // --- DESSIN DES RÉSULTATS SUR L'ÉCRAN ---
    let objectDetected = false;

    predictions.forEach(prediction => {
        const [x1, y1, x2, y2, score, classId] = prediction;

        // Seuil de confiance : on dessine seulement si le modèle est sûr à plus de 25%
        if (score > 0.25) { 
            objectDetected = true;
            const classIndex = Math.round(classId);
            const label = CLASSES[classIndex] || "Objet";
            const color = COLORS[classIndex] || "#00FF00";

            // Recalcul des coordonnées pour s'adapter à la taille de l'élément source
            const scaleX = canvas.width / 640;
            const scaleY = canvas.height / 640;
            const finalX = x1 * scaleX;
            const finalY = y1 * scaleY;
            const finalW = (x2 - x1) * scaleX;
            const finalH = (y2 - y1) * scaleY;

            // 1. Dessiner le cadre
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(finalX, finalY, finalW, finalH);

            // 2. Dessiner l'arrière-plan du texte
            ctx.fillStyle = color;
            const text = `${label} (${Math.round(score * 100)}%)`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(finalX, finalY - 25, textWidth + 10, 25);

            // 3. Dessiner le texte
            ctx.fillStyle = "#000000"; // Noir pour le contraste
            ctx.font = "bold 16px Arial";
            ctx.fillText(text, finalX + 5, finalY - 7);
        }
    });

    // Mise à jour de l'interface
    if (objectDetected) {
        statusText.innerText = "Analyse terminée. Objets détectés.";
    } else {
        statusText.innerText = "Analyse terminée. Aucun objet n'a dépassé le seuil de 25%.";
    }
}

// Démarrage automatique : On charge le modèle dès que le fichier JS est lu
initModel();