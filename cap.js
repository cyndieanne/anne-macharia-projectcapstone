// cap.js
// Handles: section switching, keyboard nav, theme persistence, and video modal
(function () {
    // --- Elements ---
    const controls = Array.from(document.querySelectorAll(".control"));
    const themeBtn = document.querySelector(".theme-btn");
    const body = document.body;

    // Fail fast if essential UI isn't present
    if (!controls.length) {
        // No sections/controls found - nothing to wire
        console.warn("cap.js: no navigation controls found");
    }

    // --- SECTION SWITCHING (with accessibility) ---
    function activateSectionById(id) {
        if (!id) return;
        const prevBtn = document.querySelector(".control.active-btn");
        if (prevBtn) prevBtn.classList.remove("active-btn");

        const newBtn = controls.find(c => c.dataset.id === id);
        if (newBtn) newBtn.classList.add("active-btn");

        const prevSection = document.querySelector(".container.active");
        if (prevSection) prevSection.classList.remove("active");

        const nextSection = document.getElementById(id);
        if (nextSection) {
            nextSection.classList.add("active");
            // make programmatically focusable & focus
            nextSection.setAttribute("tabindex", "-1");
            setTimeout(() => nextSection.focus(), 20);
        }
    }

    // Attach click listeners to controls
    controls.forEach(btn => {
        btn.addEventListener("click", function () {
            const id = this.dataset.id;
            activateSectionById(id);
        });
    });

    // Ensure initial focusable active container
    const firstActive = document.querySelector(".container.active");
    if (firstActive) {
        firstActive.setAttribute("tabindex", "-1");
    }

    // --- THEME TOGGLE & PERSISTENCE ---
    const THEME_KEY = "site-theme";
    function setTheme(isLight) {
        body.classList.toggle("light-mode", Boolean(isLight));
        try {
            localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
        } catch (e) {
            // ignore storage errors (private mode)
        }
    }

    // Initialize theme
    try {
        const saved = localStorage.getItem(THEME_KEY);
        setTheme(saved === "light");
    } catch (e) {}

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isLight = body.classList.toggle("light-mode");
            try {
                localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
            } catch (e) {}
        });
    }

    // --- KEYBOARD NAVIGATION (Arrow keys) ---
    document.addEventListener("keydown", (e) => {
        if (!controls.length) return;
        const activeIndex = controls.findIndex(c => c.classList.contains("active-btn"));
        if (activeIndex === -1) return;

        let nextIndex = null;
        if (["ArrowRight", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            nextIndex = (activeIndex + 1) % controls.length;
        } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            nextIndex = (activeIndex - 1 + controls.length) % controls.length;
        }

        if (nextIndex !== null) {
            // simulate click via dispatchEvent for better consistency
            controls[nextIndex].dispatchEvent(new Event("click", { bubbles: true }));
        }
    });

    // --- VIDEO MODAL ---
    const modal = document.getElementById("videoModal");
    const closeBtn = document.getElementById("closeVideo");
    const videoHolder = document.getElementById("videoHolder");
    let lastFocused = null;

    function isYouTubeUrl(url) {
        return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(url);
    }
    function toYouTubeEmbed(url) {
        // Accept both watch?v=VIDEO_ID and youtu.be/VIDEO_ID
        const matchWatch = url.match(/[?&]v=([^&]+)/);
        if (matchWatch && matchWatch[1]) return `https://www.youtube.com/embed/${matchWatch[1]}`;
        const matchShort = url.match(/youtu\.be\/([^?&]+)/);
        if (matchShort && matchShort[1]) return `https://www.youtube.com/embed/${matchShort[1]}`;
        const matchEmbed = url.match(/youtube\.com\/embed\/([^?&]+)/);
        if (matchEmbed && matchEmbed[1]) return `https://www.youtube.com/embed/${matchEmbed[1]}`;
        // fallback: return original
        return url;
    }

    // Focus trap helper
    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    function openModalWithVideo(videoUrl) {
        if (!modal || !videoHolder) return;
        // Save last focused element to restore later
        lastFocused = document.activeElement;

        // Prepare content
        videoHolder.innerHTML = ""; // clear previous
        
        // Add focus trap
        modal.addEventListener('keydown', trapFocus);

        if (isYouTubeUrl(videoUrl)) {
            const embed = toYouTubeEmbed(videoUrl);
            const iframe = document.createElement("iframe");
            iframe.setAttribute("src", embed + "?rel=0&autoplay=1");
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
            iframe.setAttribute("allowfullscreen", "");
            iframe.setAttribute("title", "Video player");
            videoHolder.appendChild(iframe);
        } else if (/\.mp4(\?.*)?$/i.test(videoUrl) || videoUrl.startsWith("/")) {
            // Local or direct mp4
            const video = document.createElement("video");
            video.setAttribute("src", videoUrl);
            video.setAttribute("controls", "");
            video.setAttribute("autoplay", "");
            video.setAttribute("playsinline", "");
            videoHolder.appendChild(video);
            // play guard (some browsers block autoplay with sound)
            video.muted = true;
            video.play().catch(()=>{ /* ignore autoplay block */ });
        } else {
            // Generic embed (iframe)
            const iframe = document.createElement("iframe");
            iframe.setAttribute("src", videoUrl);
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
            iframe.setAttribute("allowfullscreen", "");
            iframe.setAttribute("title", "Video player");
            videoHolder.appendChild(iframe);
        }

        // Show modal
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        // focus close button for keyboard users
        setTimeout(() => {
            closeBtn?.focus();
        }, 50);
    }

    function closeModal() {
        if (!modal || !videoHolder) return;
        
        // Remove focus trap
        modal.removeEventListener('keydown', trapFocus);
        
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        // stop & remove media
        videoHolder.innerHTML = "";

        // restore focus
        if (lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus();
            lastFocused = null;
        }
    }

    // click handler for any element with class video-trigger (delegation)
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".video-trigger");
        if (!trigger) return;
        e.preventDefault();
        const videoUrl = trigger.dataset.video;
        if (!videoUrl) return console.warn("video-trigger missing data-video");
        openModalWithVideo(videoUrl);
    });

    // close interactions
    closeBtn?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && modal.getAttribute("aria-hidden") === "false") {
            closeModal();
        }
    });

    // --- END ---
})();
