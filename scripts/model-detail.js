import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// SERVER_URL and the shared helpers are exposed on window by classic
// <script> tags loaded before this module (config.js, utils/*, etc).
const isAdmin = isLoggedIn();

async function fetchModel(id) {
    try {
        const response = await fetch(`${SERVER_URL}/models/${id}`);
        const modelData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return modelData;
    } catch (error) {
        console.error("Error fetching model:", error);
        return null;
    }
}

/**
 * Sets up a three.js scene inside #modelViewer and loads the given GLB/GLTF
 * URL into it. Camera framing is computed from the model's own bounding
 * box, so this works reasonably for models of any size or origin offset
 * without per-model tuning.
 */
function initModelViewer(modelUrl) {
    const container = document.getElementById('modelViewer');
    const loadingEl = document.getElementById('modelViewerLoading');
    const loadingTextEl = document.getElementById('modelViewerLoadingText');
    const errorEl = document.getElementById('modelViewerError');
    if (!container) return;

    if (!modelUrl) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.classList.add('is-visible');
        return;
    }

    const scene = new THREE.Scene();
    // No scene.background set — the canvas stays transparent so the
    // container's own CSS background (light/dark aware) shows through.

    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / Math.max(container.clientHeight, 1),
        0.1,
        1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Metallic/PBR materials (common from Blender glTF exports) mostly
    // reflect their surroundings rather than direct lights — with no
    // environment map they render almost solid black. RoomEnvironment
    // gives them something neutral to reflect without needing an actual
    // HDRI asset.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(3, 10, 8);
    scene.add(dirLight);

    // If the model takes a while to arrive, reassure the user instead of
    // leaving a bare spinner up with no feedback. This is not an error —
    // just cleared once the load settles (success or failure) below.
    const slowLoadTimeout = setTimeout(() => {
        if (loadingTextEl) {
            loadingTextEl.textContent = "Still loading — large models can take a moment...";
        }
    }, 15000);

    const loader = new GLTFLoader();
    loader.load(
        modelUrl,
        (gltf) => {
            clearTimeout(slowLoadTimeout);
            const model = gltf.scene;
            scene.add(model);
            frameCameraToObject(model, camera, controls);
            if (loadingEl) loadingEl.style.display = 'none';
        },
        (xhr) => {
            if (loadingTextEl && xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                loadingTextEl.textContent = `Loading ${percent}%...`;
            }
        },
        (error) => {
            clearTimeout(slowLoadTimeout);
            console.error('Error loading 3D model:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) {
                errorEl.classList.add('is-visible');
                errorEl.textContent = "Couldn't load the 3D model — it may still be processing, blocked by a network issue, or the file may be missing.";
            }
        }
    );

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        if (!container.clientWidth || !container.clientHeight) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

/** Points the camera at the model's bounding-box center, backed off enough to see the whole thing. */
function frameCameraToObject(object, camera, controls) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    camera.near = maxDimension / 100;
    camera.far = maxDimension * 100;
    camera.updateProjectionMatrix();

    const distance = maxDimension * 1.6;
    camera.position.set(
        center.x + distance * 0.6,
        center.y + distance * 0.4,
        center.z + distance * 0.6
    );
    camera.lookAt(center);

    controls.target.copy(center);
    controls.update();
}

async function displayModel() {
    const modelId = getIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const modelTitleElement = document.querySelector('.model-detail-title');
    const modelCategoryElement = document.querySelector('.model-meta .category');
    const datePostedElement = document.querySelector('.model-meta .date-posted');
    const lastUpdateElement = document.querySelector('.model-meta .last-updated');
    const modelContentElement = document.querySelector('.model-content-rendered');

    if (!modelId) {
        modelTitleElement.textContent = "Model Not Found";
        pageTitleElement.textContent = "Error";
        document.body.classList.remove('is-loading');
        return;
    }

    const model = await fetchModel(modelId);

    if (model) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('model', model.id, 'models.html'));
        }

        pageTitleElement.textContent = model.name;
        modelTitleElement.textContent = model.name;
        modelCategoryElement.textContent = model.category;
        datePostedElement.textContent = formatDateTimeArray(model.datePosted);
        lastUpdateElement.textContent = formatDateTimeArray(model.lastUpdated);

        // Reveal the layout now, before initializing the 3D viewer — while
        // body still carries .is-loading, main.model-detail-main is
        // display:none, so the viewer container reports 0x0 dimensions and
        // three.js sizes the renderer/camera to nothing.
        document.body.classList.remove('is-loading');

        initModelViewer(model.modelUrl);

        const downloadBtn = document.getElementById('modelDownloadBtn');
        if (downloadBtn) {
            if (model.modelUrl) {
                const suggestedName = (model.name || 'model').replace(/[^a-z0-9\-_]+/gi, '_') + '.glb';
                downloadBtn.style.display = 'inline-flex';
                downloadBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        // The download attribute is ignored cross-origin by most
                        // browsers, and Backblaze doesn't send a Content-Disposition
                        // filename — so the URL's raw storage key gets used instead,
                        // stripping the .glb extension. Fetching as a blob and
                        // downloading from a same-origin object URL sidesteps that.
                        const response = await fetch(model.modelUrl);
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        const tempLink = document.createElement('a');
                        tempLink.href = objectUrl;
                        tempLink.download = suggestedName;
                        document.body.appendChild(tempLink);
                        tempLink.click();
                        tempLink.remove();
                        URL.revokeObjectURL(objectUrl);
                    } catch (err) {
                        console.error('Download failed:', err);
                        showToast('Could not download the model file.', 'error');
                    }
                });
            } else {
                downloadBtn.style.display = 'none';
            }
        }

        renderSkillsSidebar(model.skills);

        if (modelContentElement) {
            if (model.description) {
                modelContentElement.innerHTML = renderMarkdownWithMath(model.description);
                addCopyButtonsToCodeBlocks(modelContentElement);
                highlightCodeBlocks(modelContentElement);
                renderMathContent(modelContentElement);
            } else {
                modelContentElement.innerHTML = '';
            }
        }
    } else {
        modelTitleElement.textContent = "Model Not Found";
        pageTitleElement.textContent = "Error";
        const errorEl = document.getElementById('modelViewerError');
        const loadingEl = document.getElementById('modelViewerLoading');
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.classList.add('is-visible');
        if (modelContentElement) modelContentElement.innerHTML = '';
    }

    document.body.classList.remove('is-loading');
}

/**
 * Builds skill chip links in the left sidebar.
 * The sidebar stays hidden (display:none) if there are no skills.
 */
function renderSkillsSidebar(skills) {
    const sidebar = document.getElementById('modelSkillsSidebar');
    const list = document.getElementById('modelSkillsList');
    if (!sidebar || !list || !skills || skills.length === 0) return;

    skills.forEach(skill => {
        const chip = document.createElement('a');
        chip.href = `skill-detail.html?id=${skill.id}`;
        chip.className = 'skill-chip';
        chip.title = skill.description || skill.name;

        if (skill.thumbnailUrl) {
            const img = document.createElement('img');
            img.src = skill.thumbnailUrl;
            img.alt = skill.name;
            img.className = 'skill-chip-thumb';
            chip.appendChild(img);
        }

        const label = document.createElement('span');
        label.className = 'skill-chip-name';
        label.textContent = skill.name;
        chip.appendChild(label);

        list.appendChild(chip);
    });

    sidebar.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', displayModel);