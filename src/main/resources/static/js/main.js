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
const resetButton = document.getElementById('resetButton');
const generateQuizButton = document.getElementById('generateQuizButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContainer = document.getElementById('resultContainer');
const quizContainer = document.getElementById('quizContainer');
const quizLoading = document.getElementById('quizLoading');
const quizContent = document.getElementById('quizContent');
const quizResults = document.getElementById('quizResults');
const quizQuestions = document.getElementById('quizQuestions');
const quizForm = document.getElementById('quizForm');
const errorMessage = document.getElementById('errorMessage');
const pageCountElement = document.getElementById('pageCount');
const wordCountElement = document.getElementById('wordCount');
const summaryLengthElement = document.getElementById('summaryLength');
const compressionRatioElement = document.getElementById('compressionRatio');
const pdfContentElement = document.getElementById('pdfContent');
const summaryContentElement = document.getElementById('summaryContent');
const truncationNoticeElement = document.getElementById('truncationNotice');
const previewButton = document.getElementById('previewButton');
const modal = document.getElementById('pdfModal');
const modalClose = document.getElementById('modalClose');

let currentPdfFile = null;
let currentPdfContent = null;
let currentQuizData = null;

// Event Listeners
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
uploadButton.addEventListener('click', () => fileInput.click());
resetButton.addEventListener('click', resetForm);
generateQuizButton.addEventListener('click', generateQuiz);
previewButton.addEventListener('click', openPdfPreview);
modalClose.addEventListener('click', closePdfPreview);
quizForm.addEventListener('submit', submitQuiz);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closePdfPreview();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
        closePdfPreview();
    }
});

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

    currentPdfFile = file;
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
            const errorText = await response.text();
            throw new Error(`Failed to analyze PDF: ${errorText}`);
        }

        const data = await response.json();
        currentPdfContent = data.content;
        hideLoading();
        showResults(data);
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function showLoading() {
    loadingSpinner.style.display = 'block';
    resultContainer.style.display = 'none';
    quizContainer.style.display = 'none';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

// Add copy-to-clipboard for summary
function setupSummaryCopy() {
    const btn = document.getElementById('copySummaryBtn');
    const content = document.getElementById('summaryContent');
    if (!btn || !content) return;
    btn.onclick = function() {
        const text = content.textContent || '';
        if (!navigator.clipboard) {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } else {
            navigator.clipboard.writeText(text);
        }
        btn.classList.add('copied');
        btn.innerHTML = '<span style="color:#7c3aed;font-weight:600;">Copied!</span>';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><rect x="5" y="5" width="12" height="12" rx="2" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/><path d="M8 3h6a2 2 0 0 1 2 2v6" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/></svg>';
        }, 1200);
    };
}
// Animate summary content on update
function showSummaryWithAnimation(summary) {
    const content = document.getElementById('summaryContent');
    if (!content) return;
    content.style.opacity = 0;
    setTimeout(() => {
        content.innerHTML = summary;
        content.style.opacity = 1;
    }, 180);
}
// Collapsible Original Content
function setupOriginalContentToggle() {
    const btn = document.getElementById('toggleOriginalContentBtn');
    const box = document.getElementById('originalContentBox');
    if (!btn || !box) return;
    btn.onclick = function() {
        const isOpen = box.style.display !== 'none';
        if (isOpen) {
            box.style.display = 'none';
            btn.textContent = 'Show';
            btn.setAttribute('aria-expanded', 'false');
        } else {
            box.style.display = 'block';
            btn.textContent = 'Hide';
            btn.setAttribute('aria-expanded', 'true');
        }
    };
}
// Patch showResults to set up the toggle after results are shown
const _origShowResults = showResults;
showResults = function(data) {
    _origShowResults(data);
    setupOriginalContentToggle();
};
// Patch showResults to use the new animation and copy setup
function showResults(data) {
    // Format numbers with commas
    pageCountElement.textContent = data.pageCount.toLocaleString();
    wordCountElement.textContent = data.wordCount.toLocaleString();
    summaryLengthElement.textContent = data.summaryWordCount.toLocaleString();
    compressionRatioElement.textContent = data.compressionRatio;
    
    // Set content with proper formatting
    showSummaryWithAnimation(data.summary);
    pdfContentElement.textContent = data.content;

    // Show/hide truncation notice
    truncationNoticeElement.style.display = data.truncated ? 'block' : 'none';

    // Show results with animation
    resultContainer.style.display = 'block';
    resultContainer.style.opacity = '0';
    resultContainer.style.transform = 'translateY(20px)';
    
    // Trigger animation
    setTimeout(() => {
        resultContainer.style.opacity = '1';
        resultContainer.style.transform = 'translateY(0)';
    }, 10);

    // Enable buttons
    previewButton.disabled = false;
    generateQuizButton.disabled = false;

    // Setup copy button
    setupSummaryCopy();
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Scroll error into view
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetUI() {
    // Reset form elements
    fileInput.value = '';
    dropZone.classList.remove('dragover');
    
    // Hide results and errors with fade out
    if (resultContainer.style.display === 'block') {
        resultContainer.style.opacity = '0';
        resultContainer.style.transform = 'translateY(20px)';
        setTimeout(() => {
            resultContainer.style.display = 'none';
        }, 300);
    }
    
    if (quizContainer.style.display === 'block') {
        quizContainer.style.opacity = '0';
        quizContainer.style.transform = 'translateY(20px)';
        setTimeout(() => {
            quizContainer.style.display = 'none';
        }, 300);
    }
    
    errorMessage.style.display = 'none';
    
    // Reset content
    pageCountElement.textContent = '-';
    wordCountElement.textContent = '-';
    summaryLengthElement.textContent = '-';
    compressionRatioElement.textContent = '-';
    summaryContentElement.textContent = '';
    pdfContentElement.textContent = '';
    truncationNoticeElement.style.display = 'none';
    
    // Disable buttons
    previewButton.disabled = true;
    generateQuizButton.disabled = true;
    
    // Reset quiz data
    currentQuizData = null;
}

// Function to generate quiz from PDF content
async function generateQuiz() {
    if (!currentPdfContent) {
        showError('No PDF content available for quiz generation');
        return;
    }

    try {
        // Show quiz loading
        quizContainer.style.display = 'block';
        quizLoading.style.display = 'block';
        quizContent.style.display = 'none';
        quizResults.style.display = 'none';

        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: currentPdfContent
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate quiz: ${errorText}`);
        }

        const data = await response.json();
        console.log('Received quiz data:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        currentQuizData = data;
        console.log('Current quiz data before display:', currentQuizData);
        displayQuiz(data.quiz);
        
        // Hide loading and show quiz
        quizLoading.style.display = 'none';
        quizContent.style.display = 'block';
        
        // Scroll to quiz
        quizContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        quizLoading.style.display = 'none';
        showError(error.message);
    }
}

// Function to display the quiz on the page
function displayQuiz(quiz) {
    console.log('Displaying quiz:', quiz);
    if (!quiz || !quiz.questions) {
        console.error('Invalid quiz data:', quiz);
        showError('Failed to load quiz data.');
        return;
    }

    const questions = quiz.questions;
    console.log('Quiz questions:', questions);
    quizQuestions.innerHTML = '';

    questions.forEach((question, index) => {
        console.log(`Rendering question ${index + 1}:`, question);
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = `${index + 1}. ${question.question}`;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'question-options';

        Object.keys(question.options).forEach(optionKey => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question_${index}`;
            radio.value = optionKey;
            radio.id = `question_${index}_${optionKey}`;

            const label = document.createElement('label');
            label.htmlFor = radio.id;
            label.textContent = `${optionKey}: ${question.options[optionKey]}`;

            optionDiv.appendChild(radio);
            optionDiv.appendChild(label);
            optionsDiv.appendChild(optionDiv);

            // Add click handler for selecting the option
            optionDiv.addEventListener('click', () => {
                document.querySelectorAll(`input[name='question_${index}']`).forEach(input => {
                    input.checked = false;
                });
                radio.checked = true;
                document.querySelectorAll('.option-item').forEach(item => {
                    item.classList.remove('selected');
                });
                optionDiv.classList.add('selected');
            });
        });

        questionDiv.appendChild(questionText);
        questionDiv.appendChild(optionsDiv);
        quizQuestions.appendChild(questionDiv);
    });
}

// Function to handle quiz submission
async function submitQuiz(event) {
    event.preventDefault();
    console.log('Submitting quiz');

    const userAnswers = {};
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    inputs.forEach(input => {
        const name = input.name;
        const value = input.value;
        userAnswers[name] = value;
        console.log(`Answer for ${name}: ${value}`);
    });

    console.log('User answers:', userAnswers);

    try {
        const response = await fetch('/api/quiz/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizData: currentQuizData,
                userAnswers: userAnswers
            })
        });

        const result = await response.json();
        console.log('Quiz evaluation result:', result);

        if (result.error) {
            console.error('Quiz evaluation error:', result.error);
            showError(result.error);
            return;
        }

        displayQuizResults(result);
    } catch (error) {
        console.error('Error submitting quiz:', error);
        showError('Error submitting quiz. Please try again.');
    }
}

// Function to display quiz results
function displayQuizResults(result) {
    console.log('Displaying quiz results:', result);
    const resultsContainer = document.getElementById('quizResults');
    if (!resultsContainer) {
        console.error('quizResults element not found!');
        return;
    }
    resultsContainer.innerHTML = '';

    // Highlight answers in the quiz UI
    // For each question, find the options and apply classes
    result.questionResults.forEach((res, index) => {
        // Find the question container
        const questionDiv = document.querySelectorAll('.quiz-question')[index];
        if (questionDiv) {
            const optionDivs = questionDiv.querySelectorAll('.option-item');
            optionDivs.forEach(optionDiv => {
                const radio = optionDiv.querySelector('input[type="radio"]');
                if (!radio) return;
                const optionValue = radio.value;
                // Remove previous highlight classes
                optionDiv.classList.remove('correct-answer', 'wrong-answer', 'selected');
                // Highlight user's answer
                if (optionValue === res.userAnswer) {
                    if (res.isCorrect) {
                        optionDiv.classList.add('correct-answer');
                    } else {
                        optionDiv.classList.add('wrong-answer');
                    }
                }
                // Highlight the correct answer if user was wrong
                if (!res.isCorrect && optionValue === res.correctAnswer) {
                    optionDiv.classList.add('correct-answer');
                }
            });
        }

        // Render result summary as before
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-item ${res.isCorrect ? 'correct' : 'incorrect'}`;

        const questionLabel = document.createElement('div');
        questionLabel.className = 'result-question';
        questionLabel.textContent = `Question ${index + 1}: ${res.question}`;

        const answerLabel = document.createElement('div');
        answerLabel.className = 'result-answer';
        answerLabel.textContent = `Your answer: ${res.userAnswer} (Correct: ${res.correctAnswer})`;

        resultDiv.appendChild(questionLabel);
        resultDiv.appendChild(answerLabel);
        resultsContainer.appendChild(resultDiv);
    });

    // Hide old scoreDisplay span if present
    const scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) {
        scoreDisplay.style.display = 'none';
    }

    // Show the new score modal with animated stats
    showScoreModal(result);
}

function showScoreModal(result) {
    const modal = document.getElementById('scoreModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Stats
    const correct = result.correctAnswers || 0;
    const total = result.totalQuestions || 0;
    const wrong = total - correct;
    const percent = Math.round((correct / total) * 100);

    document.getElementById('scoreModalCorrect').textContent = correct;
    document.getElementById('scoreModalWrong').textContent = wrong;
    document.getElementById('scoreModalTotal').textContent = total;
    document.getElementById('scoreModalPercentage').textContent = percent + '%';

    // Animate the circular progress
    const circle = document.querySelector('.score-ring-fg');
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${circumference}`;
    setTimeout(() => {
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }, 100);

    // Modal close handler
    const closeBtn = document.getElementById('scoreModalClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    // Also close modal on click outside content
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function retakeQuiz() {
    if (currentQuizData) {
        quizResults.style.display = 'none';
        quizContent.style.display = 'block';
        
        // Clear previous answers
        quizQuestions.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });
        
        quizQuestions.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
}

function generateNewQuiz() {
    if (currentPdfContent) {
        generateQuiz();
    }
}

function openPdfPreview() {
    if (!currentPdfFile) {
        showError('No PDF file available for preview');
        return;
    }

    const fileURL = URL.createObjectURL(currentPdfFile);
    document.getElementById('pdfPreview').src = fileURL;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closePdfPreview() {
    modal.style.display = 'none';
    document.getElementById('pdfPreview').src = '';
    document.body.style.overflow = ''; // Restore scrolling
    
    // Clean up object URL
    if (currentPdfFile) {
        URL.revokeObjectURL(document.getElementById('pdfPreview').src);
    }
}

function resetForm() {
    currentPdfFile = null;
    currentPdfContent = null;
    currentQuizData = null;
    resetUI();
    
    // Scroll to top with smooth animation
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
} 