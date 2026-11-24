/* =========================================================
   DÚN & DUSK: site config + interactions
   ========================================================= */

/* ---- SITE CONFIG: update links here once confirmed ---- */
const SITE = {
  // External booking platform URL (Fresha, Treatwell, Booksy, etc.).
  // Leave empty to send "Book" buttons to WhatsApp instead.
  // Treatwell booking menu (venue 551344). UTM tags match Treatwell's own "Book now" widget.
  bookingUrl: "https://widget.treatwell.ie/place/551344/menu/?utm_source=widget&utm_medium=partners&utm_campaign=website_booknow",
  instagramUrl: "https://www.instagram.com/dundusknails",   // e.g. "https://www.instagram.com/dunanddusk"
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=D%C3%BAn+%26+Dusk+Nail+Studio",  // Google Maps share link
  // WhatsApp: international format, digits only, no + or spaces. e.g. Irish mobile 087 123 4567 → "353871234567"
  whatsappNumber: "353894558383",
  whatsappMessage: "Hi Dún & Dusk, I'd like to ask about an appointment.",
  // Promo bar at the top of the home page. Leave text empty to switch it off.
  // endsOn: last day of the offer (YYYY-MM-DD, Irish time); the bar disappears after that day. "" = no end date.
  promo: {
    text: "30% off · Until 4 December",
    startsOn: "2026-11-17", // first day of the offer (YYYY-MM-DD); "" = show straight away
    endsOn: "2026-12-04",
    // Pre-filled WhatsApp message when someone taps the bar
    whatsappMessage: "Hi Dún & Dusk, I'd like to claim the 30% off offer.",
  },
};

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) root.classList.add("js-motion");

  /* ---- Promo bar: shown until dismissed (per offer text) or until endsOn has passed ---- */
  const promo = document.querySelector("[data-promo]");
  if (promo && SITE.promo && SITE.promo.text) {
    const key = "dd-promo-dismissed:" + SITE.promo.text;
    let dismissed = false;
    try { dismissed = localStorage.getItem(key) === "1"; } catch (_) {}
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date()); // YYYY-MM-DD
    const notYet = SITE.promo.startsOn && today < SITE.promo.startsOn;
    const expired = SITE.promo.endsOn && today > SITE.promo.endsOn;
    if (!dismissed && !notYet && !expired) {
      promo.querySelector("[data-promo-text]").textContent = SITE.promo.text;
      // Tapping the bar opens WhatsApp with an offer-specific message
      if (SITE.whatsappNumber) {
        const link = promo.querySelector("[data-promo-link]");
        link.href = `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(SITE.promo.whatsappMessage || SITE.whatsappMessage)}`;
        link.target = "_blank";
        link.rel = "noopener";
      }
      promo.hidden = false;
      root.classList.add("has-promo");
      promo.querySelector("[data-promo-close]").addEventListener("click", () => {
        promo.hidden = true;
        root.classList.remove("has-promo");
        try { localStorage.setItem(key, "1"); } catch (_) {}
      });
    }
  }

  /* ---- Links from config ---- */
  const setExternal = (selector, url) => {
    if (!url) return;
    document.querySelectorAll(selector).forEach((a) => {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
    });
  };
  setExternal("[data-instagram]", SITE.instagramUrl);
  setExternal("[data-directions]", SITE.directionsUrl);

  // WhatsApp: until a number is set, the button scrolls to the Visit section
  const whatsappUrl = SITE.whatsappNumber
    ? `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(SITE.whatsappMessage)}`
    : "";
  setExternal("[data-whatsapp]", whatsappUrl);

  // Book buttons: booking platform if set, otherwise WhatsApp
  setExternal("[data-book]", SITE.bookingUrl || whatsappUrl);

  // Treatwell: on desktop open the booking menu in a centred popup (as Treatwell's
  // widget does) so the site stays behind it; on touch/small screens, or if the
  // popup is blocked, the link's normal new-tab behaviour takes over.
  if (SITE.bookingUrl) {
    const popupOk = () => window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    document.querySelectorAll("[data-book]").forEach((a) => {
      a.addEventListener("click", (e) => {
        if (!popupOk() || e.metaKey || e.ctrlKey || e.shiftKey) return;
        const w = 970, h = 760;
        const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
        const win = window.open(SITE.bookingUrl, "treatwell-booking",
          `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        if (win) { e.preventDefault(); win.focus(); }
      });
    });
  }

  // With neither set, the main booking button points to the section itself
  if (!SITE.bookingUrl && !whatsappUrl) {
    document.querySelectorAll("[data-book-external]").forEach((a) => (a.href = "#book"));
  }

  /* ---- WhatsApp nudge bubble: once per visit, 4s after arrival, auto-hides after 10s ---- */
  const bubble = document.querySelector("[data-wa-bubble]");
  if (bubble) {
    const SEEN = "dd-wa-bubble-seen";
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch (_) {}
    const hide = () => {
      bubble.classList.remove("is-visible");
      setTimeout(() => (bubble.hidden = true), 600);
      try { sessionStorage.setItem(SEEN, "1"); } catch (_) {}
    };
    if (!seen) {
      const show = () => {
        if (bubble.dataset.shown) return;
        bubble.dataset.shown = "1";
        bubble.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => bubble.classList.add("is-visible")));
        setTimeout(() => bubble.classList.contains("is-visible") && hide(), 10000);
      };
      // Phones: the bubble would sit over the hero headline, so wait until the hero has scrolled away
      const heroEl = document.querySelector(".hero");
      const small = window.matchMedia("(max-width: 767px)").matches;
      setTimeout(() => {
        if (!small || !heroEl || !("IntersectionObserver" in window)) return show();
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) { io.disconnect(); setTimeout(show, 600); }
        }, { threshold: 0.35 });
        io.observe(heroEl);
      }, 4000);
      bubble.querySelector("[data-wa-bubble-close]").addEventListener("click", hide);
      bubble.querySelector(".wa-bubble__msg").addEventListener("click", hide);
      document.querySelector(".wa-float")?.addEventListener("click", hide);
    }
  }

  /* ---- Footer year ---- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---- Hero entrance ---- */
  const hero = document.querySelector(".hero");
  requestAnimationFrame(() => requestAnimationFrame(() => hero && hero.classList.add("is-loaded")));
  /* ---- Hero headline: alternate phrases every 6s (static under reduced motion) ---- */
  const heroTitle = hero && hero.querySelector(".hero__title");
  if (heroTitle && !reduceMotion) {
    const phrases = [...new Set([...heroTitle.querySelectorAll("[data-phrase]")].map((el) => el.dataset.phrase))];
    let current = 0;
    const swap = () => {
      if (document.hidden) return;                  // don't animate in a background tab
      const next = (current + 1) % phrases.length;
      heroTitle.classList.add("is-cycling");
      heroTitle.querySelectorAll("[data-phrase]").forEach((el) => {
        if (el.dataset.phrase === phrases[current]) {
          el.classList.remove("is-active");
          el.classList.add("is-out");
        } else if (el.dataset.phrase === phrases[next]) {
          // Park the incoming line below the mask without animating, then let it rise
          el.classList.add("is-reset");
          el.classList.remove("is-out");
          void el.offsetHeight;
          el.classList.remove("is-reset");
          el.classList.add("is-active");
        }
      });
      current = next;
    };
    setInterval(swap, 6000);
  }

  // Respect reduced motion: hold the hero video on its poster frame
  const heroVideo = hero && hero.querySelector("video");
  if (heroVideo && reduceMotion) { heroVideo.removeAttribute("autoplay"); heroVideo.pause(); }

  /* ---- Header state on scroll ---- */
  const header = document.querySelector("[data-header]");
  // Pages without a hero (e.g. policy.html) keep the solid light header throughout
  const onScroll = () => {
    if (!hero) return header.classList.add("is-scrolled");
    header.classList.toggle("is-scrolled", window.scrollY > hero.offsetHeight - 80);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  const label = toggle.querySelector(".nav__toggle-label");

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    label.textContent = open ? "Close" : "Menu";
    if (open) menu.querySelector("a").focus();
  };

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => e.matches && setMenu(false));

  /* ---- Scroll reveals (once only) ---- */
  const revealEls = document.querySelectorAll(".reveal, .reveal-media");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            io.unobserve(el);
            // Images: wait until the file has loaded and decoded, so the fade never shows a half-loaded picture
            const img = el.classList.contains("reveal-media") && el.querySelector("img");
            if (!img || (img.complete && img.naturalWidth)) { el.classList.add("is-visible"); return; }
            let done = false;
            const show = () => { if (!done) { done = true; el.classList.add("is-visible"); } };
            img.addEventListener("load", () => (img.decode ? img.decode().then(show, show) : show()), { once: true });
            img.addEventListener("error", show, { once: true });
            setTimeout(show, 3000); // never leave it hidden on a very slow connection
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---- Gallery: rolling strip ---- */
  const track = document.querySelector("[data-gallery-track]");
  if (track) {
    // Duplicate the set once so the strip can loop without a visible jump
    const originals = [...track.children];
    originals.forEach((el) => {
      const clone = el.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
    // Cloned videos don't pick up autoplay, so start them explicitly (muted is required for autoplay)
    track.querySelectorAll("video").forEach((v) => {
      v.muted = true;
      v.play().catch(() => {});
    });

    if (!reduceMotion) {
      const speed = 35; // px per second
      let pos = 0;
      let last = 0;
      let paused = false;
      let onScreen = true;
      let resumeTimer;
      const period = () => track.children[originals.length].offsetLeft - originals[0].offsetLeft;
      const pause = () => { clearTimeout(resumeTimer); paused = true; };
      const resume = (delay = 0) => {
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => { pos = track.scrollLeft % period(); paused = false; }, delay);
      };

      track.addEventListener("mouseenter", pause);
      track.addEventListener("mouseleave", () => resume());
      track.addEventListener("touchstart", pause, { passive: true });
      track.addEventListener("touchend", () => resume(2500));
      new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting)).observe(track);

      const tick = (t) => {
        const dt = last ? (t - last) / 1000 : 0;
        last = t;
        if (!paused && onScreen) {
          pos = (pos + speed * dt) % period();
          track.scrollLeft = pos;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---- Services hover preview (desktop) ---- */
  const preview = document.querySelector("[data-service-preview]");
  const previewLabel = document.querySelector("[data-service-preview-label]");
  const previewImg = document.querySelector("[data-service-preview-img]");
  const index = document.querySelector("[data-service-index]");
  if (preview && index) {
    const show = (item) => {
      previewLabel.textContent = item.dataset.preview || "";
      if (previewImg && item.dataset.image) previewImg.src = item.dataset.image;
      preview.classList.add("is-active");
    };
    index.querySelectorAll(".service-index__item").forEach((item) => {
      item.addEventListener("mouseenter", () => show(item));
    });
    index.addEventListener("mouseleave", () => preview.classList.remove("is-active"));
  }

})();
