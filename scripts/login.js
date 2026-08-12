// SERVER_URL comes from scripts/config.js loaded before this script.

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('password-toggle');

    // ── Password visibility toggle (hold to view + click to toggle) ──
    if (passwordInput && passwordToggle) {
        const eyeIcon = passwordToggle.querySelector('.icon-eye');
        const eyeSlashIcon = passwordToggle.querySelector('.icon-eye-slash');
        let visible = false;
        let holding = false;
        let holdTimer = null;

        function setVisible(isVisible) {
            visible = isVisible;
            passwordInput.type = isVisible ? 'text' : 'password';
            passwordToggle.setAttribute('aria-pressed', String(isVisible));
            passwordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
            if (eyeIcon) eyeIcon.style.display = isVisible ? 'none' : '';
            if (eyeSlashIcon) eyeSlashIcon.style.display = isVisible ? '' : 'none';
        }

        // Hold to view: show while pressed, hide on release.
        passwordToggle.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // keep focus in the input
            holding = true;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(() => {
                if (holding) setVisible(true);
            }, 200);
        });

        function endHold() {
            if (!holding) return;
            holding = false;
            clearTimeout(holdTimer);
            setVisible(false);
        }

        passwordToggle.addEventListener('pointerup', endHold);
        passwordToggle.addEventListener('pointerleave', endHold);
        passwordToggle.addEventListener('pointercancel', endHold);

        // Click to toggle (fallback for quick taps / desktop).
        passwordToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (holding) {
                // This click is the tail end of a hold; already handled.
                holding = false;
                clearTimeout(holdTimer);
                setVisible(false);
                return;
            }
            clearTimeout(holdTimer);
            setVisible(!visible);
        });

        // Prevent the long-press context menu from interrupting the hold.
        passwordToggle.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = loginForm.querySelector('button[type="submit"]');
        const loader = window.showActionLoader
            ? showActionLoader(submitButton, { placement: 'inside', variant: 'button' })
            : null;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const payload = {
            email: username,
            password: password
        };

        try {
            const response = await fetch(`${SERVER_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                const jwtToken = data.token;
                
                localStorage.setItem('jwt_token', jwtToken);

                window.location.href = 'admin.html';
            } else {
                loginError.style.display = 'block';
                console.error('Login failed:', response.status);
            }
        } catch (error) {
            loginError.style.display = 'block';
            console.error('An error occurred:', error);
        } finally {
            if (loader) loader.hide();
        }
    });
});