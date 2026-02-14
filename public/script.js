const socket = io();

// DOM elements
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
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const subscriptionModal = document.getElementById('subscriptionModal');
const localGenderBadge = document.getElementById('localGenderBadge');
const localCountryBadge = document.getElementById('localCountryBadge');
const remoteGenderBadge = document.getElementById('remoteGenderBadge');
const remoteCountryBadge = document.getElementById('remoteCountryBadge');
const filterStatus = document.getElementById('filterStatus');

// Check if user has completed profile
const userProfile = JSON.parse(localStorage.getItem('vyntra_profile'));

if (!userProfile || !userProfile.hasCompletedProfile) {
    // Redirect to profile page if no profile found
    window.location.href = 'profile.html';
}

// Check subscription status with profile validation
function checkSubscriptionStatus() {
    const profile = JSON.parse(localStorage.getItem('vyntra_profile'));
    const isPremiumValue = localStorage.getItem('vyntra_premium') === 'true';
    const expiry = localStorage.getItem('vyntra_expiry');
    
    // Can't be premium without complete profile
    if (!profile || !profile.hasCompletedProfile) {
        localStorage.setItem('vyntra_premium', 'false');
        return false;
    }
    
    if (isPremiumValue && expiry) {
        if (new Date() > new Date(expiry)) {
            localStorage.setItem('vyntra_premium', 'false');
            return false;
        }
        return true;
    }
    
    return false;
}

// Set premium status using the function
let isPremium = checkSubscriptionStatus();
let subscriptionExpiry = localStorage.getItem('vyntra_expiry');

// Update UI based on premium status
function updateSubscriptionBadge() {
    if (!subscriptionStatus) return;
    
    if (isPremium) {
        subscriptionStatus.textContent = 'Premium';
        subscriptionStatus.style.background = '#fbbf24';
        if (filterBar) filterBar.style.display = 'flex';
    } else {
        subscriptionStatus.textContent = 'Free';
        if (filterBar) filterBar.style.display = 'none';
    }
}

// Call this immediately
updateSubscriptionBadge();

// Load user profile
const userProfileData = JSON.parse(localStorage.getItem('vyntra_profile')) || {
    username: 'Guest',
    avatar: 'https://via.placeholder.com/40',
    gender: 'prefer-not',
    country: 'US',
    hasCompletedProfile: false
};

// Update UI with profile info
if (headerUsername) headerUsername.textContent = userProfileData.username;
if (headerAvatar) headerAvatar.src = userProfileData.avatar;
if (localName) localName.textContent = userProfileData.username;
if (localAvatar) localAvatar.src = userProfileData.avatar;
if (localGenderBadge) localGenderBadge.textContent = getGenderEmoji(userProfileData.gender);
if (localCountryBadge) localCountryBadge.textContent = getCountryFlag(userProfileData.country);

// Filter settings
let preferredGender = 'all';
let preferredCountry = 'all';

// Camera state
let isVideoEnabled = true;
let isAudioEnabled = true; // Always true by default

// WebRTC variables
let localStream;
let peerConnection;
let isChatting = false;

// Helper functions
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

// STUN servers
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize local video (camera and microphone both enabled)
async function initLocalVideo() {
    try {
        // Request both camera and microphone
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true  // Always request microphone
        });
        
        if (localVideo) localVideo.srcObject = localStream;
        if (cameraPermissionOverlay) cameraPermissionOverlay.style.display = 'none';
        if (startBtn) startBtn.disabled = false;
        
        // Setup camera controls (video toggle only)
        setupCameraControls();
        
        socket.emit('user-ready', userProfileData);
        
        console.log('Camera and microphone initialized successfully');
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        
        // Show more specific error message
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert('Please allow camera and microphone access to use Vyntra');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            alert('No camera or microphone found. Please connect a device and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            alert('Your camera or microphone is already in use by another application.');
        } else {
            alert('Unable to access camera or microphone. Please check your devices.');
        }
        
        if (cameraPermissionOverlay) cameraPermissionOverlay.style.display = 'flex';
        if (startBtn) startBtn.disabled = true;
    }
}

// Setup camera controls (video toggle only, audio always on)
function setupCameraControls() {
    if (!toggleVideoBtn) return;
    
    if (!isPremium) {
        toggleVideoBtn.style.opacity = '0.5';
        toggleVideoBtn.title = 'Premium feature (Upgrade to toggle camera)';
        
        toggleVideoBtn.addEventListener('click', () => {
            showSubscriptionModal();
        });
        
        return;
    }
    
    // Video toggle only (audio is always on)
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

// Subscription modal
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

// Create peer connection
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
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected') {
            if (waitingOverlay) waitingOverlay.style.display = 'none';
            if (chatStatus) {
                chatStatus.textContent = 'Connected';
                chatStatus.style.background = '#48bb78';
            }
        }
    };
}

// Socket event handlers
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
});

// UI functions
function updateUIState() {
    if (startBtn) startBtn.disabled = isChatting;
    if (nextBtn) nextBtn.disabled = !isChatting;
    if (stopBtn) stopBtn.disabled = !isChatting;
    if (messageInput) messageInput.disabled = !isChatting;
    if (sendBtn) sendBtn.disabled = !isChatting;
    
    if (chatStatus) {
        if (isChatting) {
            chatStatus.textContent = 'Connected';
            chatStatus.style.background = '#48bb78';
        } else {
            chatStatus.textContent = 'Offline';
            chatStatus.style.background = 'rgba(255,255,255,0.2)';
        }
    }
}

function displayMessage(message, sender) {
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (sender === 'me') {
        messageElement.classList.add('own');
        messageElement.textContent = message;
    } else if (sender === 'system') {
        messageElement.style.background = '#ffd700';
        messageElement.style.color = '#333';
        messageElement.style.textAlign = 'center';
        messageElement.style.margin = '10px auto';
        messageElement.textContent = message;
    } else {
        const strangerName = remoteName ? remoteName.textContent : 'Stranger';
        messageElement.innerHTML = `<strong>${strangerName}:</strong> ${message}`;
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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

// Event listeners
if (startBtn) {
    startBtn.addEventListener('click', () => {
        const filters = isPremium ? {
            gender: preferredGender,
            country: preferredCountry
        } : null;
        
        socket.emit('find-stranger', userProfileData, filters);
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
    sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('message', message);
            displayMessage(message, 'me');
            messageInput.value = '';
        }
    });
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && sendBtn) {
            sendBtn.click();
        }
    });
}

// Request permission button
const requestPermissionBtn = document.getElementById('requestPermissionBtn');
if (requestPermissionBtn) {
    requestPermissionBtn.addEventListener('click', initLocalVideo);
}

// Remove all mobile-specific microphone code
// No mobile detection, no mic tests, no permission status indicators

// Initialize
updateUIState();