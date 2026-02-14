// Wait for Firebase to load
document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const loginWithEmailBtn = document.getElementById('loginWithEmailBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const phoneNumber = document.getElementById('phoneNumber');
    const countryCode = document.getElementById('countryCode');
    const verificationCode = document.getElementById('verificationCode');
    const verificationSection = document.getElementById('verificationCodeSection');
    const adminNotice = document.getElementById('adminNotice');
    
    let confirmationResult = null;
    
    // Admin emails
    const ADMIN_EMAILS = ['chapanzisagir@gmail.com'];
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User logged in:', user);
            
            // Check if admin
            const isAdminUser = ADMIN_EMAILS.includes(user.email);
            
            // Create user profile
            const userProfile = {
                uid: user.uid,
                username: user.displayName || user.phoneNumber || user.email?.split('@')[0] || 'User',
                email: user.email,
                phoneNumber: user.phoneNumber,
                avatar: user.photoURL || 'https://via.placeholder.com/120',
                isAdmin: isAdminUser,
                hasCompletedProfile: true,
                loginMethod: user.providerData[0]?.providerId || 'unknown',
                createdAt: new Date().toISOString()
            };
            
            // If admin, set premium forever
            if (isAdminUser) {
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 100);
                
                localStorage.setItem('vyntra_premium', 'true');
                localStorage.setItem('vyntra_expiry', expiryDate.toISOString());
                localStorage.setItem('vyntra_is_admin', 'true');
                
                userProfile.isPremium = true;
                userProfile.premiumExpiry = expiryDate.toISOString();
            }
            
            // Save profile
            localStorage.setItem('vyntra_profile', JSON.stringify(userProfile));
            
            // Redirect to main chat
            window.location.href = 'index.html';
        }
    });
    
    // Google Sign-In
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    console.log('Google sign-in successful:', result.user);
                })
                .catch((error) => {
                    console.error('Google sign-in error:', error);
                    alert('Erreur de connexion Google: ' + error.message);
                });
        });
    }
    
    // Email Sign-In
    if (loginWithEmailBtn) {
        loginWithEmailBtn.addEventListener('click', () => {
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            
            if (!email || !password) {
                alert('Veuillez entrer votre email et mot de passe');
                return;
            }
            
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Email sign-in successful:', userCredential.user);
                })
                .catch((error) => {
                    console.error('Email sign-in error:', error);
                    
                    if (error.code === 'auth/user-not-found') {
                        alert('Aucun compte trouvé avec cet email');
                    } else if (error.code === 'auth/wrong-password') {
                        alert('Mot de passe incorrect');
                    } else {
                        alert('Erreur de connexion: ' + error.message);
                    }
                });
        });
    }
    
    // Send SMS Code
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', () => {
            const phone = countryCode.value + phoneNumber.value;
            
            if (!phoneNumber.value) {
                alert('Veuillez entrer votre numéro de téléphone');
                return;
            }
            
            // Configure reCAPTCHA
            const appVerifier = new firebase.auth.RecaptchaVerifier('sendCodeBtn', {
                size: 'invisible'
            });
            
            // Send verification code
            firebase.auth().signInWithPhoneNumber(phone, appVerifier)
                .then((confirmation) => {
                    confirmationResult = confirmation;
                    verificationSection.style.display = 'block';
                    sendCodeBtn.style.display = 'none';
                    alert('Code de vérification envoyé à ' + phone);
                })
                .catch((error) => {
                    console.error('SMS send error:', error);
                    alert('Erreur d\'envoi du code: ' + error.message);
                });
        });
    }
    
    // Verify Code
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', () => {
            const code = verificationCode.value;
            
            if (!code || code.length < 6) {
                alert('Veuillez entrer le code à 6 chiffres');
                return;
            }
            
            confirmationResult.confirm(code)
                .then((result) => {
                    console.log('Phone verification successful:', result.user);
                })
                .catch((error) => {
                    console.error('Verification error:', error);
                    alert('Code de vérification invalide. Veuillez réessayer.');
                });
        });
    }
    
    // Show admin notice
    if (adminNotice) {
        adminNotice.style.display = 'flex';
    }
});