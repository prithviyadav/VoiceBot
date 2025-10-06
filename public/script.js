// script.js - WITH REFINED COOLDOWN FEEDBACK

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const recordButton = document.getElementById('record-button');
    const statusText = document.getElementById('status-text');
    const resultContainer = document.getElementById('result-container');
    const answerBox = document.getElementById('answer-box');
    const ttsButton = document.getElementById('tts-button');
    const toastContainer = document.getElementById('toast-container');

    // --- State Management ---
    let isRecording = false;
    let lastAnswerText = "";
    let resultReceived = false;
    let isOnCooldown = false;
    let cooldownTimer = null;


    // --- Web Speech API (Recognition) Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        statusText.textContent = "Browser doesn't support Speech Recognition.";
        showToast("Your browser doesn't support Speech Recognition.", 'error');
        recordButton.disabled = true;
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // --- Recognition Event Handlers ---
    recognition.onstart = () => {
        isRecording = true;
        resultReceived = false;
        recordButton.classList.add('recording');
        statusText.textContent = 'Listening...';
        showToast('Listening...', 'info');
    };

    recognition.onresult = (event) => {
        resultReceived = true;
        const question = event.results[0][0].transcript;
        getAIResponse(question);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            showToast("I didn't hear anything. Please try again.", 'error');
        } else {
            showToast(`Speech recognition error: ${event.error}`, 'error');
        }
    };

    recognition.onend = () => {
        isRecording = false;
        recordButton.classList.remove('recording');
        if (!resultReceived && !isOnCooldown) {
            statusText.textContent = 'Click the mic to ask a question';
        }
    };

    // --- Interaction Logic ---
    const handleRecordClick = () => {
        if (isOnCooldown) {
            // --- UPDATED: Simpler toast message as requested ---
            showToast('Please wait a moment!', 'error');
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            speechSynthesis.cancel();
            recognition.start();
        }
    };
    
    recordButton.addEventListener('click', debounce(handleRecordClick, 300));
    
    ttsButton.addEventListener('click', () => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
        } else if (speechSynthesis.paused) {
            speechSynthesis.resume();
        } else if (lastAnswerText) {
            speak(lastAnswerText);
        }
    });

    // --- Core Functions ---
    async function getAIResponse(question) {
        statusText.textContent = 'Thinking...';
        showToast('Sending to AI...', 'info');
        resultContainer.classList.add('hidden');

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong.');
            }

            const data = await response.json();
            showToast('Response received!', 'success');
            displayAnswer(data.answer || "Sorry, I couldn't generate a response.");
            
            startCooldown(5);

        } catch (error) {
            showToast(error.message, 'error');
            statusText.textContent = 'Click the mic to ask a question';
        }
    }
    
    function displayAnswer(text) {
        lastAnswerText = text;
        const formattedText = formatResponse(text);
        answerBox.innerHTML = formattedText;
        resultContainer.classList.remove('hidden');
        speak(text);
    }
    
    function speak(text) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onstart = () => { ttsButton.textContent = '⏸️'; };
        utterance.onpause = () => { ttsButton.textContent = '▶️'; };
        utterance.onresume = () => { ttsButton.textContent = '⏸️'; };
        utterance.onend = () => { ttsButton.textContent = '🔊'; };
        speechSynthesis.speak(utterance);
    }

    function formatResponse(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>');
        formatted = formatted.replace(/<\/ul>\n<ul>/g, ''); 
        return formatted.replace(/\n/g, '<br>');
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    function startCooldown(seconds) {
        isOnCooldown = true;
        recordButton.disabled = true; // This will trigger the grey style in CSS
        let remaining = seconds;
        
        clearInterval(cooldownTimer);
        
        statusText.textContent = `Please wait ${remaining}s...`;

        cooldownTimer = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                statusText.textContent = `Please wait ${remaining}s...`;
            } else {
                clearInterval(cooldownTimer);
                isOnCooldown = false;
                recordButton.disabled = false; // This re-enables the button
                statusText.textContent = 'Click the mic to ask a question';
                showToast('Ready for your next question!', 'info');
            }
        }, 1000);
    }
});