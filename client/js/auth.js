// Dynamically toggle NGO fields during registration
function toggleNGOFields() {
  const role = document.getElementById('role-select').value;
  const ngoBlock = document.getElementById('ngo-details-block');
  const ngoInput = document.getElementById('reg-ngo-no');
  
  if (role === 'ngo') {
    ngoBlock.classList.remove('d-none');
    ngoInput.setAttribute('required', 'true');
  } else {
    ngoBlock.classList.add('d-none');
    ngoInput.removeAttribute('required');
  }
}

// Handle login submissions
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe }
      });
      const data = await res.json();

      if (data.success) {
        setSession(data.token, data.user);
        showToast('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = `/${data.user.role}/dashboard.html`;
        }, 1000);
      } else {
        showToast(data.message || 'Invalid credentials', 'error');
      }
    } catch (err) {
      showToast('Network error, please check connection.', 'error');
    }
  });
}

// Handle registration submissions
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('role-select').value;
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const registrationNo = role === 'ngo' ? document.getElementById('reg-ngo-no').value : '';

    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: { role, name, email, password, registrationNo }
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message, 'success');
        // Cache email for verify step
        localStorage.setItem('pending_verification_email', email);
        // Switch blocks
        document.getElementById('register-form-block').classList.add('d-none');
        document.getElementById('verification-form-block').classList.remove('d-none');
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again.', 'error');
    }
  });
}

// Verify email activation code
const verifyEmailForm = document.getElementById('verify-email-form');
if (verifyEmailForm) {
  verifyEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = localStorage.getItem('pending_verification_email');
    const otp = document.getElementById('verification-otp').value;

    try {
      const res = await apiRequest('/auth/verify-email', {
        method: 'POST',
        body: { email, otp }
      });
      const data = await res.json();

      if (data.success) {
        showToast('Account activated! You can now sign in.', 'success');
        localStorage.removeItem('pending_verification_email');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
      } else {
        showToast(data.message || 'Activation failed', 'error');
      }
    } catch (err) {
      showToast('Activation failed, check verification code.', 'error');
    }
  });
}

// Forgot Password - Step 1: Send OTP
async function requestResetOTP() {
  const email = document.getElementById('reset-email').value;
  if (!email) {
    showToast('Please specify email address', 'error');
    return;
  }

  try {
    const res = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
    const data = await res.json();

    if (data.success) {
      showToast('Verification OTP sent to email!', 'success');
      localStorage.setItem('reset_pending_email', email);
      // Switch view
      document.getElementById('otp-step-1').classList.add('d-none');
      document.getElementById('otp-step-2').classList.remove('d-none');
    } else {
      showToast(data.message || 'OTP request failed', 'error');
    }
  } catch (err) {
    showToast('Network error requesting reset code.', 'error');
  }
}

// Forgot Password - Step 2: Submit OTP & New Password
async function verifyResetOTP() {
  const email = localStorage.getItem('reset_pending_email');
  const otp = document.getElementById('reset-otp').value;
  const newPassword = document.getElementById('reset-new-password').value;

  if (!otp || !newPassword) {
    showToast('Fields cannot be empty', 'error');
    return;
  }

  try {
    const res = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp, newPassword }
    });
    const data = await res.json();

    if (data.success) {
      showToast('Password updated! Please login.', 'success');
      localStorage.removeItem('reset_pending_email');
      
      // Close Modal bootstrap-style or reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast(data.message || 'Verification failed', 'error');
    }
  } catch (err) {
    showToast('Failed updating password, try again.', 'error');
  }
}
