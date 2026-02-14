document.addEventListener('DOMContentLoaded', () => {
    // Check if user has completed profile first
    const userProfile = localStorage.getItem('vyntra_profile');
    const profileComplete = userProfile ? JSON.parse(userProfile).hasCompletedProfile : false;
    
    if (!profileComplete) {
        // Redirect to profile page with message
        alert('Please complete your profile before subscribing to Premium.');
        window.location.href = 'profile.html';
        return;
    }
    
    // DOM Elements
    const subscribeBtn = document.getElementById('subscribePremiumBtn');
    const paymentModal = document.getElementById('paymentModal');
    const successModal = document.getElementById('successModal');
    const processPaymentBtn = document.getElementById('processPaymentBtn');
    const goToChatBtn = document.getElementById('goToChatBtn');
    const closeButtons = document.querySelectorAll('.close-modal');
    
    // Form inputs
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const cardName = document.getElementById('cardName');
    const cardCountry = document.getElementById('cardCountry');
    
    // Check if already premium
    const isPremium = localStorage.getItem('vyntra_premium') === 'true';
    if (isPremium) {
        const expiry = localStorage.getItem('vyntra_expiry');
        if (expiry && new Date() > new Date(expiry)) {
            localStorage.setItem('vyntra_premium', 'false');
        } else {
            // Show already premium message and redirect
            alert('You are already a Premium member! Enjoy your benefits.');
            window.location.href = 'index.html';
            return;
        }
    }
    
    // Format card number
    if (cardNumber) {
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            if (value.length > 0) {
                value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
            }
            e.target.value = value;
            
            // Validate card number (simple validation)
            if (value.replace(/\s/g, '').length === 16) {
                cardNumber.style.borderColor = '#48bb78';
            } else {
                cardNumber.style.borderColor = '#f56565';
            }
        });
    }
    
    // Format expiry
    if (expiryDate) {
        expiryDate.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
            
            // Validate expiry (simple check)
            if (value.length === 5) {
                const [month, year] = value.split('/');
                if (month >= 1 && month <= 12 && year >= 23) {
                    expiryDate.style.borderColor = '#48bb78';
                } else {
                    expiryDate.style.borderColor = '#f56565';
                }
            } else {
                expiryDate.style.borderColor = '#f56565';
            }
        });
    }
    
    // Format CVV
    if (cvv) {
        cvv.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
            
            // Validate CVV
            if (e.target.value.length === 3) {
                cvv.style.borderColor = '#48bb78';
            } else {
                cvv.style.borderColor = '#f56565';
            }
        });
    }
    
    // Validate card name
    if (cardName) {
        cardName.addEventListener('input', (e) => {
            if (e.target.value.length >= 3) {
                cardName.style.borderColor = '#48bb78';
            } else {
                cardName.style.borderColor = '#f56565';
            }
        });
    }
    
    // Validate all payment fields
    function validatePaymentForm() {
        const errors = [];
        
        // Card number validation
        const cardNum = cardNumber?.value.replace(/\s/g, '') || '';
        if (!cardNum || cardNum.length !== 16) {
            errors.push('Valid 16-digit card number is required');
        }
        
        // Expiry validation
        const expiry = expiryDate?.value || '';
        if (!expiry || expiry.length !== 5) {
            errors.push('Valid expiry date (MM/YY) is required');
        } else {
            const [month, year] = expiry.split('/');
            if (month < 1 || month > 12 || year < 23) {
                errors.push('Invalid expiry date');
            }
        }
        
        // CVV validation
        const cvvVal = cvv?.value || '';
        if (!cvvVal || cvvVal.length !== 3) {
            errors.push('Valid 3-digit CVV is required');
        }
        
        // Name validation
        const name = cardName?.value || '';
        if (!name || name.length < 3) {
            errors.push('Full name on card is required');
        }
        
        // Country validation
        const country = cardCountry?.value || '';
        if (!country) {
            errors.push('Please select your country');
        }
        
        return errors;
    }
    
    // Show payment modal with validation
    subscribeBtn.addEventListener('click', () => {
        // Double-check profile before showing payment
        const currentProfile = localStorage.getItem('vyntra_profile');
        const currentProfileComplete = currentProfile ? JSON.parse(currentProfile).hasCompletedProfile : false;
        
        if (!currentProfileComplete) {
            alert('Please complete your profile first!');
            window.location.href = 'profile.html';
            return;
        }
        
        paymentModal.style.display = 'flex';
    });
    
    // Close modal
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
            successModal.style.display = 'none';
        });
    });
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.style.display = 'none';
        }
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
    
    // Process payment with validation
    processPaymentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Validate profile again
        const currentProfile = localStorage.getItem('vyntra_profile');
        const currentProfileComplete = currentProfile ? JSON.parse(currentProfile).hasCompletedProfile : false;
        
        if (!currentProfileComplete) {
            alert('Profile incomplete! Please complete your profile first.');
            window.location.href = 'profile.html';
            return;
        }
        
        // Validate payment form
        const errors = validatePaymentForm();
        
        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n• ' + errors.join('\n• '));
            return;
        }
        
        // Show processing state
        processPaymentBtn.disabled = true;
        processPaymentBtn.innerHTML = '<span class="spinner-small"></span> Processing...';
        
        // Simulate payment processing
        setTimeout(() => {
            // Calculate expiry date (1 month from now)
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            
            // Save premium status
            localStorage.setItem('vyntra_premium', 'true');
            localStorage.setItem('vyntra_expiry', expiryDate.toISOString());
            localStorage.setItem('vyntra_subscription_date', new Date().toISOString());
            
            // Hide payment modal
            paymentModal.style.display = 'none';
            
            // Show success modal
            successModal.style.display = 'flex';
            
            // Reset button
            processPaymentBtn.disabled = false;
            processPaymentBtn.innerHTML = 'Pay $0.99 & Subscribe';
        }, 2000);
    });
    
    // Go to chat button
    goToChatBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Add real-time validation indicators
    const addValidationListener = (input, validator) => {
        input.addEventListener('input', () => {
            if (validator(input.value)) {
                input.classList.add('valid');
                input.classList.remove('invalid');
            } else {
                input.classList.add('invalid');
                input.classList.remove('valid');
            }
        });
    };
});