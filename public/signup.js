// Wait for Firebase to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Signup page loaded');
    
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
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('User logged in:', user);
            
            // Check if admin
            const isAdminUser = ADMIN_EMAILS.includes(user.email);
            
            // Create user profile
            const userProfile = {
                uid: user.uid,
                username: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email,
                avatar: user.photoURL || 'https://via.placeholder.com/120',
                isAdmin: isAdminUser,
                hasCompletedProfile: true,
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
        signupWithGoogleBtn.addEventListener('click', function() {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then(function(result) {
                    console.log('Google sign-up successful:', result.user);
                })
                .catch(function(error) {
                    console.error('Google sign-up error:', error);
                    alert('Erreur: ' + error.message);
                });
        });
    }
    
    // Email Sign-Up
    if (signupWithEmailBtn) {
        signupWithEmailBtn.addEventListener('click', function() {
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
                .then(function(userCredential) {
                    // Update profile with display name
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(function() {
                        console.log('Email sign-up successful:', userCredential.user);
                    });
                })
                .catch(function(error) {
                    console.error('Email sign-up error:', error);
                    
                    let errorMessage = 'Erreur d\'inscription: ';
                    
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'Cet email est déjà utilisé. Veuillez vous connecter.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email invalide';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
                    } else if (error.code === 'auth/api-key-not-valid') {
                        errorMessage = 'Erreur de configuration Firebase. Veuillez contacter l\'administrateur.';
                    } else {
                        errorMessage = 'Erreur: ' + error.message;
                    }
                    
                    alert(errorMessage);
                });
        });
    }
});