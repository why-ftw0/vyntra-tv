const socket = io();

// ===== DOM ELEMENTS =====
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const localName = document.getElementById('localName');
const remoteName = document.getElementById('remoteName');
const localAvatar = document.getElementById('localAvatar');
const remoteAvatar = document.getElementById('remoteAvatar');
const headerUsername = document.getElementById('headerUsername');
const headerAvatar = document.getElementById('headerAvatar');
const cameraPermissionOverlay = document.getElementById('cameraPermissionOverlay');
const waitingOverlay = document.getElementById('waitingOverlay');
const chatStatus = document.getElementById('chatStatus');
const filterBar = document.getElementById('filterBar');
const subscriptionStatus = document.getElementById('subscriptionStatus');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const subscriptionModal = document.getElementById('subscriptionModal');
const localGenderBadge = document.getElementById('localGenderBadge');
const localCountryBadge = document.getElementById('localCountryBadge');
const remoteGenderBadge = document.getElementById('remoteGenderBadge');
const remoteCountryBadge = document.getElementById('remoteCountryBadge');
const filterStatus = document.getElementById('filterStatus');
const logoutBtn = document.getElementById('logoutBtn');

// ===== GLOBAL VARIABLES (DECLARED ONCE) =====
let localStream;
let peerConnection;
let isChatting = false;
let isVideoEnabled = true;
let preferredGender = 'all';
let preferredCountry = 'all';
let userProfile = null;
let isAdmin = false;
let isPremium = false;
let subscriptionExpiry = null;

// ===== HELPER FUNCTIONS =====
function getGenderEmoji(gender) {
    const emojis = {
        'male': '♂️',
        'female': '♀️',
        'non-binary': '⚧️',
        'prefer-not': '⚥'
    };
    return emojis[gender] || '⚥';
}

function getCountryFlag(countryCode) {
    const flags = {
        'US': '🇺🇸',
        'GB': '🇬🇧',
        'CA': '🇨🇦',
        'AU': '🇦🇺',
        'DE': '🇩🇪',
        'FR': '🇫🇷',
        'ES': '🇪🇸',
        'IT': '🇮🇹',
        'JP': '🇯🇵',
        'KR': '🇰🇷',
        'BR': '🇧🇷',
        'MX': '🇲🇽',
        'IN': '🇮🇳'
    };
    return flags[countryCode] || '🌐';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CHECK USER LOGIN =====
function checkUserLoggedIn() {
    const storedProfile = JSON.parse(localStorage.getItem('vyntra_profile'));
    
    if (!storedProfile) {
        console.log('No profile found, redirecting to login');
        window.location.href = 'login.html';
        return null;
    }
    
    return storedProfile;
}

// Initialize user profile
userProfile = checkUserLoggedIn();
if (!userProfile) {
    throw new Error('No user logged in');
}

// Check if admin
isAdmin = localStorage.getItem('vyntra_is_admin') === 'true';

if (isAdmin) {
    console.log('👑 Admin logged in - all premium features enabled');
}

// Check subscription status
function checkSubscriptionStatus() {
    if (isAdmin) return true;
    
    const isPremiumValue = localStorage.getItem('vyntra_premium') === 'true';
    const expiry = localStorage.getItem('vyntra_expiry');
    
    if (isPremiumValue && expiry) {
        if (new Date() > new Date(expiry)) {
            localStorage.setItem('vyntra_premium', 'false');
            return false;
        }
        return true;
    }
    
    return false;
}

isPremium = checkSubscriptionStatus();
subscriptionExpiry = localStorage.getItem('vyntra_expiry');

// ===== UPDATE UI WITH PROFILE =====
function updateSubscriptionBadge() {
    if (!subscriptionStatus) return;
    
    if (isPremium || isAdmin) {
        subscriptionStatus.textContent = isAdmin ? 'Admin' : 'Premium';
        subscriptionStatus.style.background = isAdmin ? '#9f7aea' : '#fbbf24';
        if (filterBar) filterBar.style.display = 'flex';
        
        if (isAdmin) {
            subscriptionStatus.innerHTML = '👑 Admin';
        }
    } else {
        subscriptionStatus.textContent = 'Free';
        if (filterBar) filterBar.style.display = 'none';
    }
}

function updateUIWithProfile() {
    if (headerUsername) headerUsername.textContent = userProfile?.username || 'User';
    if (headerAvatar) headerAvatar.src = userProfile?.avatar || 'https://via.placeholder.com/40';
    if (localName) localName.textContent = userProfile?.username || 'You';
    if (localAvatar) localAvatar.src = userProfile?.avatar || 'https://via.placeholder.com/24';
    if (localGenderBadge) localGenderBadge.textContent = getGenderEmoji(userProfile?.gender);
    if (localCountryBadge) localCountryBadge.textContent = getCountryFlag(userProfile?.country);
}

updateSubscriptionBadge();
updateUIWithProfile();

// ===== STUN SERVERS =====
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ===== CAMERA FUNCTIONS =====
async function initLocalVideo() {
    console.log('Requesting camera permission...');
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true
        });
        
        console.log('Camera and microphone access granted!');
        
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        if (cameraPermissionOverlay) {
            cameraPermissionOverlay.style.display = 'none';
        }
        
        if (startBtn) {
            startBtn.disabled = false;
        }
        
        setupCameraControls();
        socket.emit('user-ready', userProfile);
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        
        let errorMessage = '❌ Unable to access camera. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = '❌ Camera access denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '❌ No camera found. Please connect a camera.';
        } else {
            errorMessage = '❌ Unable to access camera. Please try again.';
        }
        
        alert(errorMessage);
        
        if (cameraPermissionOverlay) {
            cameraPermissionOverlay.style.display = 'flex';
        }
    }
}

function setupCameraControls() {
    if (!toggleVideoBtn) return;
    
    if (!isPremium && !isAdmin) {
        toggleVideoBtn.style.opacity = '0.5';
        toggleVideoBtn.title = 'Premium feature';
        
        toggleVideoBtn.addEventListener('click', () => {
            showSubscriptionModal();
        });
        
        return;
    }
    
    toggleVideoBtn.addEventListener('click', () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                isVideoEnabled = !isVideoEnabled;
                videoTrack.enabled = isVideoEnabled;
                toggleVideoBtn.classList.toggle('off', !isVideoEnabled);
                toggleVideoBtn.innerHTML = isVideoEnabled ? '📹' : '🚫';
            }
        }
    });
}

// ===== CHAT FUNCTIONS =====
function updateChatState(enabled) {
    if (messageInput) {
        messageInput.disabled = !enabled;
        messageInput.placeholder = enabled ? "Type a message..." : "Connect to start chatting";
    }
    if (sendBtn) {
        sendBtn.disabled = !enabled;
    }
}

function sendMessage() {
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    
    if (message && isChatting) {
        console.log('Sending message:', message);
        
        socket.emit('message', message);
        displayMessage(message, 'me');
        messageInput.value = '';
    } else if (!isChatting) {
        alert('You need to be connected to send messages');
    }
}

function displayMessage(message, sender) {
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'me') {
        messageElement.classList.add('own');
        messageElement.innerHTML = `
            <div class="message-sender">You</div>
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${timestamp}</div>
        `;
    } else if (sender === 'system') {
        messageElement.classList.add('system');
        messageElement.innerHTML = `<div class="message-text">${message}</div>`;
    } else {
        const strangerName = remoteName ? remoteName.textContent : 'Stranger';
        messageElement.innerHTML = `
            <div class="message-sender">${escapeHtml(strangerName)}</div>
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${timestamp}</div>
        `;
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===== PEER CONNECTION =====
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    peerConnection.ontrack = (event) => {
        if (remoteVideo) remoteVideo.srcObject = event.streams[0];
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'connected') {
            if (waitingOverlay) waitingOverlay.style.display = 'none';
            if (chatStatus) {
                chatStatus.textContent = 'Connected';
                chatStatus.style.background = '#48bb78';
            }
            updateChatState(true);
        }
    };
}

// ===== UI FUNCTIONS =====
function updateUIState() {
    if (startBtn) startBtn.disabled = isChatting;
    if (nextBtn) nextBtn.disabled = !isChatting;
    if (stopBtn) stopBtn.disabled = !isChatting;
    
    if (chatStatus) {
        if (isChatting) {
            chatStatus.textContent = 'Connected';
            chatStatus.style.background = '#48bb78';
        } else {
            chatStatus.textContent = 'Offline';
            chatStatus.style.background = 'rgba(255,255,255,0.2)';
        }
    }
    
    updateChatState(isChatting);
}

function stopChatting() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (remoteVideo) remoteVideo.srcObject = null;
    isChatting = false;
    updateUIState();
    if (remoteName) remoteName.textContent = 'Stranger';
    if (remoteAvatar) remoteAvatar.src = 'https://via.placeholder.com/24';
    if (remoteGenderBadge) remoteGenderBadge.textContent = '';
    if (remoteCountryBadge) remoteCountryBadge.textContent = '';
}

// ===== SUBSCRIPTION MODAL =====
function showSubscriptionModal() {
    if (subscriptionModal) {
        subscriptionModal.style.display = 'block';
    }
}

const closeModal = document.querySelector('.close-modal');
if (closeModal) {
    closeModal.addEventListener('click', () => {
        if (subscriptionModal) subscriptionModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === subscriptionModal) {
        subscriptionModal.style.display = 'none';
    }
});

const subscribeNowBtn = document.getElementById('subscribeNowBtn');
if (subscribeNowBtn) {
    subscribeNowBtn.addEventListener('click', () => {
        window.location.href = 'subscription.html';
    });
}

// ===== LOGOUT FUNCTION =====
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            // Stop any ongoing chat
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            // Sign out from Firebase
            firebase.auth().signOut().then(function() {
                console.log('User signed out successfully');
                
                // Clear all localStorage data
                localStorage.clear();
                
                // Redirect to landing page
                window.location.href = 'landing.html';
                
            }).catch(function(error) {
                console.error('Error signing out:', error);
                
                // Even if Firebase fails, clear local data and redirect
                localStorage.clear();
                window.location.href = 'landing.html';
            });
        }
    });
}

// ===== SOCKET EVENT HANDLERS =====
socket.on('matched', (strangerProfile) => {
    console.log('Matched with a stranger!');
    isChatting = true;
    updateUIState();
    if (waitingOverlay) waitingOverlay.style.display = 'none';
    
    if (remoteName) remoteName.textContent = strangerProfile.username || 'Stranger';
    if (remoteAvatar) remoteAvatar.src = strangerProfile.avatar || 'https://via.placeholder.com/24';
    if (remoteGenderBadge) remoteGenderBadge.textContent = getGenderEmoji(strangerProfile.gender);
    if (remoteCountryBadge) remoteCountryBadge.textContent = getCountryFlag(strangerProfile.country);
    
    createPeerConnection();
    
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', peerConnection.localDescription);
        });
});

socket.on('offer', async (offer, strangerProfile) => {
    if (remoteName) remoteName.textContent = strangerProfile.username || 'Stranger';
    if (remoteAvatar) remoteAvatar.src = strangerProfile.avatar || 'https://via.placeholder.com/24';
    if (remoteGenderBadge) remoteGenderBadge.textContent = getGenderEmoji(strangerProfile.gender);
    if (remoteCountryBadge) remoteCountryBadge.textContent = getCountryFlag(strangerProfile.country);
    
    createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

socket.on('message', (message) => {
    displayMessage(message, 'stranger');
});

socket.on('stranger-disconnected', () => {
    displayMessage('Stranger disconnected', 'system');
    stopChatting();
    if (waitingOverlay) waitingOverlay.style.display = 'flex';
    updateChatState(false);
});

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    
    const requestPermissionBtn = document.getElementById('requestPermissionBtn');
    if (requestPermissionBtn) {
        requestPermissionBtn.addEventListener('click', initLocalVideo);
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const filters = isPremium || isAdmin ? {
                gender: preferredGender,
                country: preferredCountry
            } : null;
            
            socket.emit('find-stranger', userProfile, filters);
            startBtn.disabled = true;
            if (waitingOverlay) waitingOverlay.style.display = 'flex';
            
            if (isPremium && filterStatus) {
                filterStatus.textContent = `Matching with ${preferredGender === 'all' ? 'everyone' : preferredGender} from ${preferredCountry === 'all' ? 'all countries' : preferredCountry}`;
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            socket.emit('next-stranger');
            stopChatting();
            if (waitingOverlay) waitingOverlay.style.display = 'flex';
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            socket.emit('stop-chatting');
            stopChatting();
            if (waitingOverlay) waitingOverlay.style.display = 'none';
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Filter event listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            preferredGender = btn.dataset.gender;
            
            if (isChatting) {
                alert('Filters will apply on next match');
            }
        });
    });

    const countryFilter = document.getElementById('countryFilter');
    if (countryFilter) {
        countryFilter.addEventListener('change', (e) => {
            preferredCountry = e.target.value;
            
            if (isChatting) {
                alert('Filters will apply on next match');
            }
        });
    }
});

// ===== INITIALIZE =====
updateUIState();
updateChatState(false);