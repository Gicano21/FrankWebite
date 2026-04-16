const authArea = document.getElementById('authArea');
const chatArea = document.getElementById('chatArea');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const forgotForm = document.getElementById('forgotForm');
const signInTab = document.getElementById('signinTab');
const signUpTab = document.getElementById('signupTab');
const forgotTab = document.getElementById('forgotTab');
const toForgot = document.getElementById('toForgot');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBody = document.getElementById('chatBody');
const captchaBanner = document.getElementById('captchaBanner');
const solveCaptchaButton = document.getElementById('solveCaptchaButton');
const captchaModal = document.getElementById('captchaModal');
const playAudio = document.getElementById('playAudio');
const submitCaptcha = document.getElementById('submitCaptcha');
const closeCaptcha = document.getElementById('closeCaptcha');
const captchaAnswer = document.getElementById('captchaAnswer');
const captchaMessage = document.getElementById('captchaMessage');
const videoModal = document.getElementById('videoModal');
const closeVideoModalButton = document.getElementById('closeVideoModal');
const unlockVideo = document.getElementById('unlockVideo');
const signInMessage = document.getElementById('signInMessage');
const signUpMessage = document.getElementById('signUpMessage');
const forgotMessage = document.getElementById('forgotMessage');
const resetSection = document.getElementById('resetSection');
const resetTokenInput = document.getElementById('resetToken');
const resetPasswordInput = document.getElementById('resetPassword');
const resetPasswordButton = document.getElementById('resetPasswordButton');

let currentUser = null;
let chatCount = 0;
let captchaPassed = false;
let captchaAnswerValue = '';
let pendingMessage = null;
let resetToken = '';
let ws = null;

function showTab(tab) {
    signInForm.classList.add('hidden');
    signUpForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    signInTab.classList.remove('active');
    signUpTab.classList.remove('active');
    forgotTab.classList.remove('active');
    signInMessage.textContent = '';
    signUpMessage.textContent = '';
    forgotMessage.textContent = '';
    resetSection.classList.add('hidden');
    if (tab === 'signin') {
        signInForm.classList.remove('hidden');
        signInTab.classList.add('active');
    } else if (tab === 'signup') {
        signUpForm.classList.remove('hidden');
        signUpTab.classList.add('active');
    } else {
        forgotForm.classList.remove('hidden');
        forgotTab.classList.add('active');
    }
}

function showChatScreen() {
    authArea.classList.add('hidden');
    chatArea.classList.remove('hidden');
    chatInput.focus();
    // Connect to WebSocket using the current host and protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${wsProtocol}://${window.location.host}`);
    ws.onopen = () => {
        console.log('Connected to chat');
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'history') {
            chatBody.innerHTML = '';
            data.messages.forEach(msg => addChatBubble(msg.message, msg.user === currentUser.username ? 'user' : 'bot', msg.user));
        } else if (data.type === 'message') {
            // Only add message from other users (skip own messages to prevent duplication)
            if (data.user !== currentUser.username) {
                addChatBubble(data.message, 'bot', data.user);
            }
        }
    };
    ws.onclose = () => {
        console.log('Disconnected from chat');
    };
}

function addChatBubble(text, type = 'bot', username = '') {
    const row = document.createElement('div');
    row.className = `message-row ${type}`;
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${type}`;
    if (username) {
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = username;
        bubble.appendChild(header);
    }
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    bubble.appendChild(content);
    row.appendChild(bubble);
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showCaptchaBanner() {
    if (!captchaPassed) {
        captchaBanner.classList.remove('hidden');
    }
}

function hideCaptchaBanner() {
    captchaBanner.classList.add('hidden');
}

function openCaptchaModal() {
    captchaModal.classList.remove('hidden');
    captchaAnswer.value = '';
    captchaMessage.textContent = '';
    playCaptchaSound();
}

function closeCaptchaModal() {
    captchaModal.classList.add('hidden');
}

function openVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('hidden');
    if (unlockVideo && typeof unlockVideo.play === 'function') {
        unlockVideo.play().catch(() => {});
    }
}

function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.add('hidden');
    if (unlockVideo && typeof unlockVideo.pause === 'function') {
        unlockVideo.pause();
        unlockVideo.currentTime = 0;
    }
}

function generateCaptcha() {
    const numbers = ['seven', 'two', 'five', 'four', 'nine', 'one', 'eight'];
    const chosen = numbers[Math.floor(Math.random() * numbers.length)];
    const mapping = {
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        nine: '9',
    };
    captchaAnswerValue = mapping[chosen] || '3';
    return chosen;
}

function playCaptchaSound() {
    const phrase = generateCaptcha();
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        captchaMessage.textContent = 'Audio support is not available in your browser. Please type the number directly.';
    }
}

function validateCaptchaSubmission() {
    const answer = captchaAnswer.value.trim();
    if (answer === captchaAnswerValue) {
        captchaPassed = true;
        hideCaptchaBanner();
        closeCaptchaModal();
        addChatBubble('Audio captcha solved. Video unlocked!', 'bot');
        openVideoModal();
        if (pendingMessage) {
            sendChatMessage(pendingMessage);
            pendingMessage = null;
        }
    } else {
        captchaMessage.textContent = 'Incorrect answer. Please try again.';
    }
}

function sendChatMessage(message) {
    if (!message) return;
    // Add message immediately (optimistic update)
    addChatBubble(message, 'user', currentUser.username);
    // Send to server
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', user: currentUser.username, message }));
    }
    chatInput.value = '';
    chatCount += 1;
    if (chatCount >= 2 && !captchaPassed) {
        showCaptchaBanner();
    }
}

async function handleSignIn(event) {
    event.preventDefault();
    const username = document.getElementById('signinUsername').value.trim();
    const password = document.getElementById('signinPassword').value.trim();
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            signInMessage.textContent = '';
            showChatScreen();
        } else {
            signInMessage.textContent = data.message;
        }
    } catch (error) {
        signInMessage.textContent = 'Error logging in.';
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value.trim();
    const confirm = document.getElementById('signupConfirm').value.trim();
    if (!username || !email || !password || !confirm) {
        signUpMessage.textContent = 'Please fill in every field.';
        return;
    }
    if (password !== confirm) {
        signUpMessage.textContent = 'Passwords do not match.';
        return;
    }
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            signUpMessage.style.color = '#16a34a';
            signUpMessage.textContent = 'Account created successfully. Please sign in.';
            document.getElementById('formSignUp').reset();
            setTimeout(() => {
                signUpMessage.textContent = '';
                signUpMessage.style.color = '';
                showTab('signin');
            }, 1800);
        } else {
            signUpMessage.textContent = data.message;
        }
    } catch (error) {
        signUpMessage.textContent = 'Error creating account.';
    }
}

async function handleForgotRequest(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    try {
        const response = await fetch('/api/forgot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            resetToken = data.token;
            forgotMessage.style.color = '#111827';
            forgotMessage.textContent = `A reset token was sent to ${email}. Use token ${resetToken} to reset your password.`;
            resetSection.classList.remove('hidden');
        } else {
            forgotMessage.textContent = data.message;
        }
    } catch (error) {
        forgotMessage.textContent = 'Error sending reset token.';
    }
}

async function handleResetPassword() {
    const token = resetTokenInput.value.trim();
    const newPassword = resetPasswordInput.value.trim();
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    if (token !== resetToken) {
        forgotMessage.textContent = 'Invalid reset token.';
        return;
    }
    if (!newPassword) {
        forgotMessage.textContent = 'Enter a new password.';
        return;
    }
    try {
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            forgotMessage.style.color = '#16a34a';
            forgotMessage.textContent = 'Password reset. You can now sign in with your new password.';
            resetSection.classList.add('hidden');
            document.getElementById('formForgot').reset();
            resetTokenInput.value = '';
            resetPasswordInput.value = '';
            resetToken = '';
        } else {
            forgotMessage.textContent = data.message;
        }
    } catch (error) {
        forgotMessage.textContent = 'Error resetting password.';
    }
}

function bindEvents() {
    signInTab.addEventListener('click', () => showTab('signin'));
    signUpTab.addEventListener('click', () => showTab('signup'));
    forgotTab.addEventListener('click', () => showTab('forgot'));
    toForgot.addEventListener('click', () => showTab('forgot'));
    document.getElementById('formSignIn').addEventListener('submit', handleSignIn);
    document.getElementById('formSignUp').addEventListener('submit', handleSignUp);
    document.getElementById('formForgot').addEventListener('submit', handleForgotRequest);
    resetPasswordButton.addEventListener('click', handleResetPassword);
    chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;
        if (chatCount >= 2 && !captchaPassed) {
            pendingMessage = message;
            openCaptchaModal();
            return;
        }
        sendChatMessage(message);
    });
    solveCaptchaButton.addEventListener('click', openCaptchaModal);
    playAudio.addEventListener('click', playCaptchaSound);
    submitCaptcha.addEventListener('click', validateCaptchaSubmission);
    closeCaptcha.addEventListener('click', closeCaptchaModal);
    closeVideoModalButton.addEventListener('click', closeVideoModal);
    videoModal.addEventListener('click', (event) => {
        if (event.target === videoModal) {
            closeVideoModal();
        }
    });
}

bindEvents();