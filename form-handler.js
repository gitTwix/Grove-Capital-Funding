// =================================================================
// SIGNATURE PAD
// =================================================================
function initSignaturePad(canvasId, inputId, clearBtnId) {
    const canvas = document.getElementById(canvasId);
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (!canvas || !input) {
        console.warn(`Signature pad not found: ${canvasId}`);
        return;
    }

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || 800;
    canvas.height = 150 * window.devicePixelRatio || 150;

    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#003d66';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDraw(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDraw() {
        if (isDrawing) {
            isDrawing = false;
            input.value = canvas.toDataURL('image/png');
        }
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    // Touch events
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            input.value = '';
        });
    }
}

// =================================================================
// FILE STORE
// =================================================================
const fileStore = {
    documents_upload: []
};

function addFilesToStore(inputElement, storeKey, containerId, maxFiles) {
    const newFiles = inputElement.files;

    for (let i = 0; i < newFiles.length; i++) {
        const newFile = newFiles[i];

        const alreadyExists = fileStore[storeKey].some(
            f => f.name === newFile.name && f.size === newFile.size
        );

        if (!alreadyExists) {
            if (maxFiles && fileStore[storeKey].length >= maxFiles) {
                alert(`Maximum ${maxFiles} files allowed for this field.`);
                break;
            }

            const clonedFile = new File(
                [newFile],
                newFile.name,
                { type: newFile.type, lastModified: newFile.lastModified }
            );

            fileStore[storeKey].push(clonedFile);
        }
    }

    displayFiles(storeKey, containerId);
}

function removeFile(storeKey, containerId, index) {
    fileStore[storeKey].splice(index, 1);
    displayFiles(storeKey, containerId);
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        tiff: '🖼️',
        tif: '🖼️'
    };
    return icons[ext] || '📎';
}

function displayFiles(storeKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const files = fileStore[storeKey];
    if (!files || files.length === 0) return;

    const countDiv = document.createElement('div');
    countDiv.className = 'file-count';
    countDiv.textContent = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
    container.appendChild(countDiv);

    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';

        item.innerHTML = `
            <div class="file-item-info">
                <span class="file-item-icon">${getFileIcon(file.name)}</span>
                <span class="file-item-name">${file.name}</span>
                <span class="file-item-size">${(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button type="button" class="file-item-remove" data-index="${index}">✕</button>
        `;

        item.querySelector('.file-item-remove').addEventListener('click', () => {
            removeFile(storeKey, containerId, index);
        });

        container.appendChild(item);
    });
}

// =================================================================
// DRAG AND DROP
// =================================================================
function initDragAndDrop(zoneId, inputId, storeKey, containerId, maxFiles) {
    const zone = document.getElementById(zoneId);
    const label = zone ? zone.querySelector('.upload-zone-label') : null;

    if (!zone || !label) return;

    label.addEventListener('dragover', (e) => {
        e.preventDefault();
        label.classList.add('dragover');
    });

    label.addEventListener('dragleave', () => {
        label.classList.remove('dragover');
    });

    label.addEventListener('drop', (e) => {
        e.preventDefault();
        label.classList.remove('dragover');

        const input = document.getElementById(inputId);
        if (!input) return;

        const dt = e.dataTransfer;
        const files = dt.files;

        // Create a fake input event
        const fakeInput = { files };
        addFilesToStore(fakeInput, storeKey, containerId, maxFiles);
    });
}

// =================================================================
// FORM PROGRESS BAR
// =================================================================
function updateProgress() {
    const form = document.getElementById('gcfForm');
    if (!form) return;

    const requiredFields = form.querySelectorAll('[required]');
    let filled = 0;

    requiredFields.forEach(field => {
        if (field.type === 'checkbox') {
            if (field.checked) filled++;
        } else if (field.value.trim() !== '') {
            filled++;
        }
    });

    const percent = (filled / requiredFields.length) * 100;
    const progressBar = document.getElementById('formProgressBar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

// =================================================================
// REAL-TIME VALIDATION
// =================================================================
function validateField(field) {
    const errorEl = document.getElementById(`err_${field.id}`);
    let isValid = true;
    let errorMsg = '';

    if (field.required && !field.value.trim()) {
        isValid = false;
        errorMsg = 'This field is required.';
    } else if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            isValid = false;
            errorMsg = 'Please enter a valid email address.';
        }
    } else if (field.type === 'tel' && field.value) {
        const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
        if (!phoneRegex.test(field.value)) {
            isValid = false;
            errorMsg = 'Please enter a valid phone number.';
        }
    }

    if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.classList.toggle('visible', !isValid);
    }

    field.classList.toggle('error', !isValid);
    field.classList.toggle('success', isValid && field.value.trim() !== '');

    return isValid;
}

// =================================================================
// SSN TOGGLE VISIBILITY
// =================================================================
function initSSNToggles() {
    document.querySelectorAll('.ssn-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁';
            }
        });
    });
}

// =================================================================
// FORM SUBMISSION
// =================================================================
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('gcfForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = submitBtn.querySelector('.submit-btn-text');

    // Validate all required fields
    let isFormValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (field.type === 'checkbox') {
            const errorEl = document.getElementById('err_agreement');
            if (!field.checked) {
                isFormValid = false;
                if (errorEl) {
                    errorEl.textContent = 'You must agree to the terms to submit.';
                    errorEl.classList.add('visible');
                }
            }
        } else {
            if (!validateField(field)) {
                isFormValid = false;
            }
        }
    });

    // Validate signature
    const owner1Sig = document.getElementById('owner1_signature_data');
    if (!owner1Sig || !owner1Sig.value.trim()) {
        isFormValid = false;
        const sigError = document.getElementById('err_owner1_signature');
        if (sigError) {
            sigError.textContent = 'Owner 1 signature is required.';
            sigError.classList.add('visible');
        }
    }

    // Validate file uploads
    if (fileStore.documents_upload.length === 0) {
        isFormValid = false;
        alert('Please upload your bank statements and driver\'s license before submitting.');
        return;
    }

    if (!isFormValid) {
        // Scroll to first error
        const firstError = form.querySelector('.error, .field-error.visible');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitText.textContent = 'Submitting...';

    // Build FormData
    const formData = new FormData();

    // Add all form fields
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.type === 'file' || el.type === 'submit' || el.type === 'button' || !el.name) continue;
        if (el.type === 'checkbox') {
            formData.append(el.name, el.checked ? 'yes' : 'no');
            continue;
        }
        formData.append(el.name, el.value);
    }

    // Add files
    fileStore.documents_upload.forEach(file => {
        formData.append('documents_upload', file, file.name);
    });

    try {
        // Cloudflare Worker URL
        const response = await fetch('https://grove-capital-form.twix-5ae.workers.dev', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

            if (result.success) {
            // Show success modal
            const modal = document.getElementById('successModal');
            if (modal) modal.classList.add('active');

            // Reset form
            form.reset();

            // Clear signatures
            ['owner1_signature_canvas', 'owner2_signature_canvas'].forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            });

            // Clear signature data
            ['owner1_signature_data', 'owner2_signature_data'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });

            // Clear file store
            fileStore.documents_upload = [];
            const fileList = document.getElementById('documents_file_list');
            if (fileList) fileList.innerHTML = '';

            // Reset progress bar
            const progressBar = document.getElementById('formProgressBar');
            if (progressBar) progressBar.style.width = '0%';

        } else {
            console.error('Submission failed:', result.message);
            alert('Submission failed: ' + (result.message || 'Please try again.'));
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert('An unexpected error occurred. Please try again or contact us directly.');
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Submit Application';
    }
}

// =================================================================
// INIT
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Signature Pads ---
    initSignaturePad('owner1_signature_canvas', 'owner1_signature_data', 'clear_owner1');
    initSignaturePad('owner2_signature_canvas', 'owner2_signature_data', 'clear_owner2');

    // --- SSN Toggles ---
    initSSNToggles();

    // --- File Input Listeners ---
    const fileInputConfigs = [
        {
            id: 'documents_upload',
            storeKey: 'documents_upload',
            containerId: 'documents_file_list',
            maxFiles: 10
        }
    ];

    fileInputConfigs.forEach(({ id, storeKey, containerId, maxFiles }) => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('change', () => {
                addFilesToStore(inputElement, storeKey, containerId, maxFiles);
                inputElement.value = '';
            });
        }
    });

    // --- Drag and Drop ---
    initDragAndDrop('documents_zone', 'documents_upload', 'documents_upload', 'documents_file_list', 10);

    // --- Real-time Validation ---
    const form = document.getElementById('gcfForm');
    if (form) {
        const inputs = form.querySelectorAll('.field-input, .field-textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                updateProgress();
                if (input.classList.contains('error')) {
                    validateField(input);
                }
            });
        });

        // --- Form Submit ---
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Grove Capital Form initialized');
    } else {
        console.error('❌ Form not found');
    }

    // --- Progress Bar Initial Update ---
    updateProgress();

    // --- Set Today as Default Signing Date ---
    const today = new Date().toISOString().split('T')[0];
    const owner1Date = document.getElementById('owner1_date');
    const owner2Date = document.getElementById('owner2_date');
    if (owner1Date && !owner1Date.value) owner1Date.value = today;
    if (owner2Date && !owner2Date.value) owner2Date.value = today;

});