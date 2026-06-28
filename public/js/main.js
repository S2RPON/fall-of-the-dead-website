document.addEventListener('DOMContentLoaded', () => {
    // --- Custom Crosshair Cursor ---
    const cursor = document.querySelector('.cursor-dot');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });

    // --- Bottom Scroll Progress Bar ---
    const progressBar = document.getElementById('scroll-progress');
    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });

    // --- Wishlist Logic (Fixed to update instantly without reload) ---
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/wishlist', { method: 'POST' });
                if (response.status === 401) {
                    alert('You must be logged in to add to your wishlist.');
                    window.location.href = '/login';
                    return;
                }
                const data = await response.json();
                const countSpan = document.getElementById('wishlistCount');
                let currentCount = parseInt(countSpan.innerText.replace(/[^\d]/g, ''));

                if (data.status === 'added') {
                    wishlistBtn.innerHTML = `Wishlisted ✓ <span id="wishlistCount">(${currentCount + 1})</span>`;
                    wishlistBtn.classList.add('wishlisted');
                } else {
                    wishlistBtn.innerHTML = `Wishlist <span id="wishlistCount">(${currentCount - 1})</span>`;
                    wishlistBtn.classList.remove('wishlisted');
                }
            } catch (err) {
                console.error('Error toggling wishlist:', err);
            }
        });
    }

    // --- Form Validation ---
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            let valid = true;
            inputs.forEach(input => {
                if (!input.value.trim()) valid = false;
            });
            if (!valid) e.preventDefault();
        });
    });
});