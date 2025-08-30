// 1. INITIALIZE SUPABASE CLIENT
const SUPABASE_URL = 'https://hmlesfmtfqqrbjabkftt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbGVzZm10ZnFxcmJqYWJrZnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Njg2NzcsImV4cCI6MjA3MjE0NDY3N30.Eu9UA6tKXYJzFWMv0Yn67EU5JHM0IpargSUXdR8d3vE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');

// --- 2. GET HTML ELEMENTS ---
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const messageDiv = document.getElementById('message');
const userInfoDiv = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const authFormsDiv = document.getElementById('auth-forms');
const enrollMfaButton = document.getElementById('enroll-mfa-button');
const mfaQrCodeDiv = document.getElementById('mfa-qr-code');
const mfaVerifyForm = document.getElementById('mfa-verify-form');
const mfaChallengeForm = document.getElementById('mfa-challenge-form');

// Global variable to hold MFA factor details during enrollment
let mfaFactor = null;

// --- 3. EVENT LISTENERS ---

// --- SIGN UP ---
signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { data, error } = await _supabase.auth.signUp({ email, password });

    if (error) {
        messageDiv.textContent = `Error: ${error.message}`;
        messageDiv.style.color = 'red';
    } else {
        messageDiv.textContent = 'Sign up successful! A confirmation email has been sent.';
        messageDiv.style.color = 'green';
        signupForm.reset();
    }
});

// --- LOGIN ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        messageDiv.textContent = `Error: ${error.message}`;
        messageDiv.style.color = 'red';
    } else if (data.session) {
        // This runs if the user logs in successfully AND does NOT have MFA enabled.
        messageDiv.textContent = 'Logged in successfully!';
        messageDiv.style.color = 'green';
        loginForm.reset();
    } else {
        // This runs if the user's password is correct BUT they have MFA enabled.
        // We now need to show the MFA challenge form.
        authFormsDiv.classList.add('hidden');
        mfaChallengeForm.classList.remove('hidden');
        messageDiv.textContent = 'Please enter your authentication code.';
        messageDiv.style.color = 'blue';
    }
});

// --- MFA CHALLENGE (after password login) ---
mfaChallengeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = document.getElementById('mfa-challenge-code').value;
    // Supabase knows which factor to verify from the previous signInWithPassword call
    const { data, error } = await _supabase.auth.mfa.verify({ factorId: mfaFactor?.id, code });

    if (error) {
        messageDiv.textContent = `Error verifying MFA: ${error.message}`;
        messageDiv.style.color = 'red';
    } else {
        messageDiv.textContent = 'Login complete!';
        messageDiv.style.color = 'green';
        mfaChallengeForm.reset();
        mfaChallengeForm.classList.add('hidden');
        // onAuthStateChange will handle showing the user info now
    }
});

// --- LOGOUT ---
logoutButton.addEventListener('click', async () => {
    await _supabase.auth.signOut();
});

// --- MFA ENROLLMENT (for a logged-in user) ---
enrollMfaButton.addEventListener('click', async () => {
    const { data, error } = await _supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) {
        messageDiv.textContent = `MFA Enrollment Error: ${error.message}`;
        messageDiv.style.color = 'red';
        return;
    }
    mfaFactor = data; // Store the factor details
    mfaQrCodeDiv.innerHTML = data.totp.qr_code;
    mfaQrCodeDiv.classList.remove('hidden');
    mfaVerifyForm.classList.remove('hidden');
    enrollMfaButton.classList.add('hidden');
});

// --- MFA VERIFICATION (to complete enrollment) ---
mfaVerifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = document.getElementById('mfa-verify-code').value;
    const { data, error } = await _supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactor.id,
        code: code
    });

    if (error) {
        messageDiv.textContent = `MFA Verification Error: ${error.message}`;
        messageDiv.style.color = 'red';
    } else {
        messageDiv.textContent = 'MFA has been enabled successfully!';
        messageDiv.style.color = 'green';
        document.getElementById('mfa-enroll-section').classList.add('hidden');
    }
});

// --- 4. AUTH STATE CHANGE LISTENER ---
_supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    if (session) {
        authFormsDiv.classList.add('hidden');
        mfaChallengeForm.classList.add('hidden'); // Also hide MFA form if page reloads
        userInfoDiv.classList.remove('hidden');
        userEmailSpan.textContent = session.user.email;
        messageDiv.textContent = '';
    } else {
        authFormsDiv.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        userEmailSpan.textContent = '';
    }
});