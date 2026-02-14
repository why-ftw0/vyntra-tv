// Wait for Firebase to load
document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elements
    const signupWithGoogleBtn = document.getElementById('signupWithGoogleBtn');
    const signupWithEmailBtn = document.getElementById('signupWithEmailBtn');
    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const signupConfirmPassword = document.getElementById('signupConfirmPassword');
    
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
                username: user.displayName || user.email?.split('@')[0] || 'User',
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
    
    // Google Sign-Up
    if (signupWithGoogleBtn) {
        signupWithGoogleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    console.log('Google sign-up successful:', result.user);
                })
                .catch((error) => {
                    console.error('Google sign-up error:', error);
                    alert('Erreur d\'inscription Google: ' + error.message);
                });
        });
    }
    
    // Email Sign-Up
    if (signupWithEmailBtn) {
        signupWithEmailBtn.addEventListener('click', () => {
            const name = signupName.value.trim();
            const email = signupEmail.value.trim();
            const password = signupPassword.value;
            const confirmPassword = signupConfirmPassword.value;
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                alert('Veuillez remplir tous les champs');
                return;
            }
            
            if (name.length < 2) {
                alert('Le nom doit contenir au moins 2 caractères');
                return;
            }
            
            if (password.length < 6) {
                alert('Le mot de passe doit contenir au moins 6 caractères');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Les mots de passe ne correspondent pas');
                return;
            }
            
            // Create user with email and password
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update profile with display name
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(() => {
                        console.log('Email sign-up successful:', userCredential.user);
                    });
                })
                .catch((error) => {
                    console.error('Email sign-up error:', error);
                    
                    if (error.code === 'auth/email-already-in-use') {
                        alert('Cet email est déjà utilisé. Veuillez vous connecter.');
                    } else if (error.code === 'auth/invalid-email') {
                        alert('Email invalide');
                    } else if (error.code === 'auth/weak-password') {
                        alert('Mot de passe trop faible');
                    } else {
                        alert('Erreur d\'inscription: ' + error.message);
                    }
                });
        });
    }
});