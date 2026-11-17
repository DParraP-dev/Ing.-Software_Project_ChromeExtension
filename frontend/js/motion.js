/*
 * FillPro — movimiento de la web (solo presentación).
 *
 *  - [data-reveal]: el elemento entra suavemente al aparecer en pantalla.
 *    Los hermanos con data-reveal se escalonan solos.
 *  - [data-count-to="N"]: la cifra cuenta de 0 a N una vez.
 *  - .topbar: gana una sombra leve cuando la página se desplaza.
 *
 * Con "reducir movimiento" activado o sin IntersectionObserver no se anima
 * nada y todo queda visible desde el principio.
 */
(function () {
    "use strict";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Barra superior al desplazar ──
    const bar = document.querySelector(".topbar");
    if (bar) {
        const update = () => bar.classList.toggle("is-scrolled", window.scrollY > 8);
        update();
        window.addEventListener("scroll", update, { passive: true });
    }

    if (reduce || !("IntersectionObserver" in window)) return;

    // ── Entradas al hacer scroll ──
    document.documentElement.classList.add("js-motion");

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    for (const element of document.querySelectorAll("[data-reveal]")) {
        const siblings = [...element.parentElement.children].filter((child) => child.hasAttribute("data-reveal"));
        element.style.setProperty("--i", String(Math.max(0, siblings.indexOf(element))));
        observer.observe(element);
    }

    // ── Cifras que cuentan ──
    window.FillProMotion = {
        countTo(element, target, suffix = "") {
            if (!element || !Number.isFinite(target)) return;
            const start = performance.now();
            const duration = 900;
            const tick = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - t, 3);
                element.textContent = Math.round(target * eased) + suffix;
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }
    };
})();
