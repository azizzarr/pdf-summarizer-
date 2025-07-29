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
quizForm.addEventListener('submit', submitQuiz);

// --- Animate Drop Zone Icon on Dragover ---
dropZone.addEventListener('dragenter', () => {
  const icon = dropZone.querySelector('.upload-icon');
  if (icon) icon.classList.add('drag-animate');
});
dropZone.addEventListener('dragleave', () => {
  const icon = dropZone.querySelector('.upload-icon');
  if (icon) icon.classList.remove('drag-animate');
});
dropZone.addEventListener('drop', () => {
  const icon = dropZone.querySelector('.upload-icon');
  if (icon) icon.classList.remove('drag-animate');
});

// Remove sidebar mobile toggle logic

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
            btn.innerHTML = '<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><rect x="5" y="5" width="12" height="12" rx="2" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/><path d="M8 3h6a2 2 0 0 1 2 2v6" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/></svg> Copy Summary';
        }, 1200);
        btn.focus(); // Accessibility: return focus
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

// Enhance quiz display with progress bar and modern cards
function displayQuiz(quiz) {
    if (!quiz || !quiz.questions) {
        showError('Failed to load quiz data.');
        return;
    }
    const questions = quiz.questions;
    quizQuestions.innerHTML = '';

    // Add progress bar
    let progressBar = document.createElement('div');
    progressBar.className = 'quiz-progress-bar';
    let progress = document.createElement('div');
    progress.className = 'quiz-progress';
    progress.style.width = '0%';
    progressBar.appendChild(progress);
    quizQuestions.appendChild(progressBar);

    let selectedCount = 0;
    function updateProgress() {
        progress.style.width = ((selectedCount / questions.length) * 100) + '%';
    }

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question modern';

        // Add question badge
        const badge = document.createElement('span');
        badge.className = 'question-badge';
        badge.textContent = index + 1;
        questionDiv.appendChild(badge);

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        questionDiv.appendChild(questionText);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'question-options';

        Object.keys(question.options).forEach(optionKey => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item modern';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question_${index}`;
            radio.value = optionKey;
            radio.id = `question_${index}_${optionKey}`;
            radio.style.marginRight = '1em';

            const label = document.createElement('label');
            label.htmlFor = radio.id;
            label.textContent = `${optionKey}: ${question.options[optionKey]}`;
            label.style.flex = '1';

            optionDiv.appendChild(radio);
            optionDiv.appendChild(label);
            optionsDiv.appendChild(optionDiv);

            // Add click handler for selecting the option
            optionDiv.addEventListener('click', () => {
                if (!radio.checked) {
                    selectedCount++;
                    updateProgress();
                }
                document.querySelectorAll(`input[name='question_${index}']`).forEach(input => {
                    input.checked = false;
                });
                radio.checked = true;
                optionsDiv.querySelectorAll('.option-item').forEach(item => {
                    item.classList.remove('selected');
                });
                optionDiv.classList.add('selected');
            });
        });

        questionDiv.appendChild(optionsDiv);
        quizQuestions.appendChild(questionDiv);
    });
}

// Enhance quiz results with summary card
function displayQuizResults(result) {
    const resultsContainer = document.getElementById('quizResults');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    // Summary card
    const summaryCard = document.createElement('div');
    summaryCard.className = 'quiz-summary-card';
    summaryCard.innerHTML = `
        <h2>Quiz Complete!</h2>
        <p><strong>Score:</strong> ${result.correctAnswers} / ${result.totalQuestions} (${Math.round((result.correctAnswers/result.totalQuestions)*100)}%)</p>
        <p>Great job! Review your answers below.</p>
    `;
    resultsContainer.appendChild(summaryCard);

    // Highlight answers in the quiz UI
    result.questionResults.forEach((res, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = `quiz-question modern`;
        // Add question badge
        const badge = document.createElement('span');
        badge.className = 'question-badge';
        badge.textContent = index + 1;
        resultDiv.appendChild(badge);
        // Question text
        const questionLabel = document.createElement('div');
        questionLabel.className = 'question-text';
        questionLabel.textContent = res.question;
        resultDiv.appendChild(questionLabel);
        // Options
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'question-options';
        Object.entries(res.options).forEach(([key, value]) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item modern';
            if (key === res.userAnswer) {
                optionDiv.classList.add(res.isCorrect ? 'correct' : 'incorrect');
            }
            if (key === res.correctAnswer) {
                optionDiv.classList.add('correct');
            }
            optionDiv.innerHTML = `<span style='font-weight:600;margin-right:0.7em;'>${key}</span> ${value}`;
            optionsDiv.appendChild(optionDiv);
        });
        resultDiv.appendChild(optionsDiv);
        resultsContainer.appendChild(resultDiv);
    });
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
    const percentLabel = document.getElementById('scoreModalPercentage');
    percentLabel.textContent = percent + '%';

    // Color the score percentage label
    if (percent === 100) {
      percentLabel.style.color = '#f59e0b'; // gold
      percentLabel.style.textShadow = '0 2px 8px #fbbf2422';
    } else if (percent >= 80) {
      percentLabel.style.color = '#10b981'; // green
      percentLabel.style.textShadow = '0 2px 8px #10b98122';
    } else if (percent < 50) {
      percentLabel.style.color = '#ef4444'; // red
      percentLabel.style.textShadow = '0 2px 8px #ef444422';
    } else {
      percentLabel.style.color = '#7c3aed'; // accent
      percentLabel.style.textShadow = '0 2px 8px #a78bfa22';
    }

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

    // Confetti for high scores
    const modalContent = modal.querySelector('.score-modal-content');
    if (percent >= 80) {
      modalContent.classList.add('confetti');
    } else {
      modalContent.classList.remove('confetti');
    }

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

// Implement submitQuiz to handle quiz submission and display score stats
function submitQuiz(event) {
  event.preventDefault();
  if (!currentQuizData || !currentQuizData.quiz) {
    showError('No quiz data available.');
    return;
  }

  // Collect user answers
  const userAnswers = [];
  currentQuizData.quiz.questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="question_${i}"]:checked`);
    userAnswers.push(selected ? selected.value : null);
  });

  // Simple frontend scoring
  const questionResults = currentQuizData.quiz.questions.map((q, i) => {
    const userAnswer = userAnswers[i];
    const correctAnswer = q.correctAnswer;
    return {
      question: q.question,
      options: q.options,
      userAnswer,
      correctAnswer,
      isCorrect: userAnswer === correctAnswer
    };
  });
  const correctAnswers = questionResults.filter(q => q.isCorrect).length;
  const totalQuestions = questionResults.length;

  const result = {
    correctAnswers,
    totalQuestions,
    questionResults
  };

  quizContent.style.display = 'none';
  quizResults.style.display = 'block';
  displayQuizResults(result);
  showScoreModal(result);
} 