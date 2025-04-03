// Load sidebar
fetch('/components/sidebar.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('sidebar-container').innerHTML = html;
    })
    .catch(error => console.error('Error loading sidebar:', error));

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('pdfFile');
const uploadButton = document.getElementById('uploadButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContainer = document.getElementById('resultContainer');
const errorMessage = document.getElementById('errorMessage');
const pageCountElement = document.getElementById('pageCount');
const wordCountElement = document.getElementById('wordCount');
const pdfContentElement = document.getElementById('pdfContent');
const summaryContentElement = document.getElementById('summaryContent');
const summaryLengthElement = document.getElementById('summaryLength');
const compressionRatioElement = document.getElementById('compressionRatio');
const truncationNoticeElement = document.getElementById('truncationNotice');

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileUpload);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('dragover');
}

function unhighlight(e) {
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}

let currentPdfFile = null;

function handleFileUpload(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function handleFile(file) {
    if (!file) return;

    if (!file.type.includes('pdf')) {
        showError('Please select a valid PDF file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('File size exceeds 10MB limit');
        return;
    }

    currentPdfFile = file; // Store the current PDF file
    resetUI();
    showLoading();

    const formData = new FormData();
    formData.append('file', file);

    analyzePdf(formData);
}

async function analyzePdf(formData) {
    try {
        const response = await fetch('/api/pdf/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to analyze PDF');
        }

        const data = await response.json();
        showResults(data);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    loadingSpinner.classList.add('show');
    uploadButton.disabled = true;
}

function hideLoading() {
    loadingSpinner.classList.remove('show');
    uploadButton.disabled = false;
}

function showResults(data) {
    // Update statistics
    pageCountElement.textContent = data.pageCount;
    wordCountElement.textContent = data.wordCount.toLocaleString();
    summaryLengthElement.textContent = data.summaryWordCount + ' words';
    compressionRatioElement.textContent = data.compressionRatio;

    // Update content
    pdfContentElement.textContent = data.content;
    summaryContentElement.textContent = data.summary;

    // Show truncation notice if applicable
    if (data.truncated) {
        truncationNoticeElement.style.display = 'block';
    } else {
        truncationNoticeElement.style.display = 'none';
    }

    // Show results
    resultContainer.classList.add('show');
    errorMessage.classList.remove('show');
}

function showError(message) {
    errorMessage.textContent = `Error: ${message}`;
    errorMessage.classList.add('show');
    resultContainer.classList.remove('show');
}

function resetUI() {
    resultContainer.classList.remove('show');
    errorMessage.classList.remove('show');
    pageCountElement.textContent = '-';
    wordCountElement.textContent = '-';
    pdfContentElement.textContent = '';
    summaryContentElement.textContent = '';
    summaryLengthElement.textContent = '-';
    compressionRatioElement.textContent = '-';
    truncationNoticeElement.style.display = 'none';
}

function openPdfPreview() {
    if (!currentPdfFile) return;

    const modal = document.getElementById('pdfModal');
    const preview = document.getElementById('pdfPreview');
    const url = URL.createObjectURL(currentPdfFile);
    
    preview.src = url;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closePdfPreview() {
    const modal = document.getElementById('pdfModal');
    const preview = document.getElementById('pdfPreview');
    
    preview.src = '';
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.getElementById('pdfModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePdfPreview();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePdfPreview();
    }
});

function resetForm() {
    fileInput.value = '';
    currentPdfFile = null;
    resetUI();
} 