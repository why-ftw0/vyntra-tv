// Profile page functionality
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const avatarInput = document.getElementById('avatarInput');
    const avatarImage = document.getElementById('avatarImage');
    const testCameraBtn = document.getElementById('testCameraBtn');
    const previewVideo = document.getElementById('previewVideo');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const termsCheckbox = document.getElementById('terms');
    const cameraNextBtn = document.getElementById('cameraNextBtn');
    
    let localStream = null;
    let cameraTested = false;
    
    // Handle avatar upload
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarImage.src = e.target.result;
                // Save to localStorage
                localStorage.setItem('vyntra_avatar', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Test camera function (only camera, no microphone)
    async function testCamera() {
        try {
            // Show loading state
            testCameraBtn.textContent = '⏳ Testing Camera...';
            testCameraBtn.disabled = true;
            
            // Request ONLY camera, not microphone
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false  // Don't request microphone
            });
            
            previewVideo.srcObject = localStream;
            cameraPlaceholder.style.display = 'none';
            cameraTested = true;
            
            // Update requirement indicator
            const reqCamera = document.getElementById('reqCamera');
            if (reqCamera) {
                reqCamera.innerHTML = '<span class="req-icon">✅</span> Camera working!';
                reqCamera.style.background = '#48bb78';
                reqCamera.style.color = 'white';
            }
            
            // Enable next button
            if (cameraNextBtn) cameraNextBtn.disabled = false;
            
            // Show success message
            testCameraBtn.innerHTML = '✅ Camera Working';
            testCameraBtn.style.background = '#48bb78';
            testCameraBtn.style.color = 'white';
            testCameraBtn.disabled = false;
            
        } catch (error) {
            console.error('Camera error:', error);
            
            // Show specific error message
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                alert('❌ Camera access denied. Please allow camera access in your browser settings.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                alert('❌ No camera found. Please connect a camera and try again.');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                alert('❌ Your camera is already in use by another application.');
            } else {
                alert('❌ Unable to access camera. Please check your camera.');
            }
            
            testCameraBtn.innerHTML = '📷 Test Camera Again';
            testCameraBtn.style.background = '';
            testCameraBtn.style.color = '';
            testCameraBtn.disabled = false;
            cameraTested = false;
            
            // Disable next button
            if (cameraNextBtn) cameraNextBtn.disabled = true;
        }
    }
    
    testCameraBtn.addEventListener('click', testCamera);
    
    // Validate form before submission
    function validateForm(formData) {
        const errors = [];
        
        // Check username
        const username = formData.get('username');
        if (!username || username.trim() === '') {
            errors.push('Display name is required');
        } else if (username.length > 20) {
            errors.push('Display name must be less than 20 characters');
        } else if (username.length < 2) {
            errors.push('Display name must be at least 2 characters');
        }
        
        // Check age
        const age = formData.get('age');
        if (!age) {
            errors.push('Age is required');
        } else if (age < 13) {
            errors.push('You must be at least 13 years old to use Vyntra');
        } else if (age > 100) {
            errors.push('Please enter a valid age');
        }
        
        // Check gender
        const gender = formData.get('gender');
        if (!gender || gender === '') {
            errors.push('Please select your gender');
        }
        
        // Check country
        const country = formData.get('country');
        if (!country || country === '') {
            errors.push('Please select your country');
        }
        
        // Check terms
        if (!termsCheckbox.checked) {
            errors.push('You must agree to the Terms of Service and Community Guidelines');
        }
        
        // Check if camera was tested
        if (!cameraTested) {
            errors.push('Please test your camera before continuing');
        }
        
        return errors;
    }
    
    // Handle form submission
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(profileForm);
        
        // Validate form
        const errors = validateForm(formData);
        
        if (errors.length > 0) {
            // Show error messages
            alert('Please fix the following errors:\n\n• ' + errors.join('\n• '));
            return;
        }
        
        // Create profile object
        const profile = {
            username: formData.get('username').trim(),
            age: parseInt(formData.get('age')),
            gender: formData.get('gender'),
            country: formData.get('country') || 'US',
            avatar: localStorage.getItem('vyntra_avatar') || 'https://via.placeholder.com/120',
            createdAt: new Date().toISOString(),
            hasCompletedProfile: true
        };
        
        // Save to localStorage
        localStorage.setItem('vyntra_profile', JSON.stringify(profile));
        
        // Show success message
        alert('✅ Profile created successfully! Redirecting to chat...');
        
        // Redirect to main chat
        window.location.href = 'index.html';
    });
    
    // Clean up camera stream when leaving page
    window.addEventListener('beforeunload', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
    });
    
    // Load existing profile if available
    const existingProfile = localStorage.getItem('vyntra_profile');
    if (existingProfile) {
        const profile = JSON.parse(existingProfile);
        if (profile.hasCompletedProfile) {
            document.getElementById('username').value = profile.username || '';
            document.getElementById('age').value = profile.age || '';
            document.getElementById('gender').value = profile.gender || '';
            document.getElementById('country').value = profile.country || 'US';
            
            if (profile.avatar) {
                avatarImage.src = profile.avatar;
            }
            
            // Auto-check terms for returning users
            termsCheckbox.checked = true;
        }
    }
    
    // Real-time validation
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('input', () => {
        if (usernameInput.value.length > 20) {
            usernameInput.style.borderColor = '#f56565';
        } else if (usernameInput.value.length >= 2) {
            usernameInput.style.borderColor = '#48bb78';
        } else {
            usernameInput.style.borderColor = '#e0e0e0';
        }
    });
    
    const ageInput = document.getElementById('age');
    ageInput.addEventListener('input', () => {
        const age = parseInt(ageInput.value);
        if (age >= 13 && age <= 100) {
            ageInput.style.borderColor = '#48bb78';
        } else {
            ageInput.style.borderColor = '#f56565';
        }
    });
});
// ===== LOGOUT BUTTON IN PROFILE =====
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            // Stop camera if it's on
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            firebase.auth().signOut().then(function() {
                localStorage.clear();
                window.location.href = 'landing.html';
            }).catch(function() {
                localStorage.clear();
                window.location.href = 'landing.html';
            });
        }
    });
}