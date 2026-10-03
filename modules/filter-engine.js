 <script>
        const themeToggle = document.getElementById('themeToggle');
        const htmlEl = document.documentElement;
        const savedTheme = localStorage.getItem('karsta-theme');

        if (savedTheme) {
            htmlEl.setAttribute('data-theme', savedTheme);
        }

        themeToggle.addEventListener('click', () => {
            const current = htmlEl.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            htmlEl.setAttribute('data-theme', next);
            localStorage.setItem('karsta-theme', next);
        });
    </script>
