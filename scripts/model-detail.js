import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SERVER_URL = "https://bennieslab-backend.onrender.com";
const isAdmin = !!localStorage.getItem('jwt_token');

function formatDateTimeArray(dateTimeArray) {
    if (!dateTimeArray || dateTimeArray.length < 6) {
        return "Invalid Date";
    }

    const year = dateTimeArray[0];
    const month = dateTimeArray[1] - 1;
    const day = dateTimeArray[2];
    const hours = dateTimeArray[3];
    const minutes = dateTimeArray[4];
    const seconds = dateTimeArray[5];

    const modelDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - modelDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return modelDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (modelDate >= startOfWeek && modelDate <= now) {
        return modelDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            modelDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (modelDate.getFullYear() === now.getFullYear()) {
        return modelDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return modelDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getModelIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

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
    container.appendChild(renderer.domElement);

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
    const modelId = getModelIdFromUrl();
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
            document.body.appendChild(buildAdminFab('model', model.id));
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
                        alert('Could not download the model file.');
                    }
                });
            } else {
                downloadBtn.style.display = 'none';
            }
        }

        renderSkillsSidebar(model.skills);

        if (modelContentElement) {
            if (model.description) {
                modelContentElement.innerHTML = marked.parse(model.description);
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

function buildAdminFab(type, id) {
    const fab = document.createElement('div');
    fab.classList.add('admin-fab-controls');

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('admin-fab-btn', 'admin-fab-edit');
    editBtn.setAttribute('aria-label', 'Edit');
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
    editBtn.addEventListener('click', () => {
        window.location.href = `admin.html?edit=${type}&id=${id}`;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('admin-fab-btn', 'admin-fab-delete');
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this model? This cannot be undone.')) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/models/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            alert('Model deleted.');
            window.location.href = 'models.html';
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}

document.addEventListener('DOMContentLoaded', displayModel);