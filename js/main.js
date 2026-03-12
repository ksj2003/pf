const GSAP_ENABLED = Boolean(window.gsap);

const SELECTORS = {
  heroTitle: ".hero-title",
  interactiveTitle: ".interactive-title",
  contentFlow: ".content-flow",
  contentFlowInner: ".content-flow-inner",
  siteFooter: ".site-footer",
  menuButton: ".menu-btn",
  menuOverlay: ".menu-overlay",
  menuCloseButton: ".menu-close-btn",
  menuLink: ".menu-link",
  menuTrailChain: ".menu-trail-chain",
  menuTrailMain: ".menu-trail-main",
  baseTitleLine: ".title-base .title-line",
  revealTitleLine: ".title-reveal .title-line",
};

const TITLE_REVEAL_RADIUS = "7.4rem";

function animateHeroTitleOnLoad() {
  if (!GSAP_ENABLED) {
    return;
  }

  gsap.from(SELECTORS.heroTitle, {
    y: 6,
    duration: 0.6,
    ease: "power2.out",
    delay: 0.08,
    clearProps: "transform",
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initializeMenu() {
  const menuButton = document.querySelector(SELECTORS.menuButton);
  const menuOverlay = document.querySelector(SELECTORS.menuOverlay);

  if (!menuButton || !menuOverlay) {
    return;
  }

  const menuCloseButton = document.querySelector(SELECTORS.menuCloseButton);
  const menuLinks = menuOverlay.querySelectorAll(SELECTORS.menuLink);
  const menuTrailChain = document.querySelector(SELECTORS.menuTrailChain);
  const menuTrailMain = document.querySelector(SELECTORS.menuTrailMain);

  let menuOpen = false;
  let menuTimeline = null;
  const menuTrail =
    typeof window.createMenuTrailController === "function"
      ? window.createMenuTrailController({
          menuOverlay,
          menuTrailChain,
          menuTrailMain,
          isMenuOpen: () => menuOpen,
        })
      : null;

  const setMenuState = (open) => {
    menuOpen = open;
    document.body.classList.toggle("menu-open", open);
    menuOverlay.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-hidden", String(open));
    menuOverlay.setAttribute("aria-hidden", String(!open));
  };

  const initializeMenuAnimation = () => {
    if (!GSAP_ENABLED) {
      return;
    }

    gsap.set(menuOverlay, {
      opacity: 0,
      pointerEvents: "none",
    });
    gsap.set(menuLinks, {
      y: 26,
      opacity: 0,
    });
    menuTrail?.reset();

    menuTimeline = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
      onReverseComplete: () => {
        setMenuState(false);
        menuTrail?.reset();
      },
    });

    menuTimeline
      .to(menuOverlay, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.42,
      })
      .to(
        menuLinks,
        {
          y: 0,
          opacity: 1,
          stagger: 0.07,
          duration: 0.38,
        },
        "-=0.16",
      );
  };

  const openMenu = () => {
    if (menuOpen) {
      return;
    }

    setMenuState(true);

    if (menuTimeline) {
      menuTimeline.play(0);
    }
  };

  const closeMenu = () => {
    if (!menuOpen) {
      return;
    }

    if (menuTimeline) {
      menuTrail?.hide();
      menuTimeline.reverse();
      return;
    }

    setMenuState(false);
    menuTrail?.reset();
  };

  initializeMenuAnimation();

  menuButton.addEventListener("click", () => {
    if (menuOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  if (menuCloseButton) {
    menuCloseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeMenu();
    });
  }

  menuOverlay.addEventListener("click", (event) => {
    if (event.target === menuOverlay) {
      closeMenu();
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
    if (menuTrail) {
      link.addEventListener("mouseenter", (event) =>
        menuTrail.handleLinkEnter(event, link),
      );
      link.addEventListener("mouseleave", menuTrail.handleLinkLeave);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  menuTrail?.mount();
}

function initializeInteractiveTitle() {
  const interactiveTitle = document.querySelector(SELECTORS.interactiveTitle);

  if (!interactiveTitle) {
    return;
  }

  const baseLines = interactiveTitle.querySelectorAll(SELECTORS.baseTitleLine);
  const revealLines = interactiveTitle.querySelectorAll(
    SELECTORS.revealTitleLine,
  );
  let pointerInside = false;

  const setPointer = (event) => {
    const rect = interactiveTitle.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    interactiveTitle.style.setProperty("--mx", `${clamp(x, -12, 112)}%`);
    interactiveTitle.style.setProperty("--my", `${clamp(y, -12, 112)}%`);
  };

  const resetReveal = () => {
    pointerInside = false;
    interactiveTitle.classList.remove("is-hover");
    interactiveTitle.style.setProperty("--reveal-size", "0rem");
    interactiveTitle.style.setProperty("--mx", "50%");
    interactiveTitle.style.setProperty("--my", "50%");

    if (!GSAP_ENABLED) {
      return;
    }

    gsap.killTweensOf(baseLines);
    gsap.killTweensOf(revealLines);
    gsap.set(baseLines, {
      clearProps: "x,y,scale,opacity",
    });
    gsap.set(revealLines, {
      clearProps: "x,y,rotate,scale,opacity,filter",
    });
  };

  const activateReveal = (event) => {
    interactiveTitle.classList.add("is-hover");
    setPointer(event);

    if (!GSAP_ENABLED) {
      interactiveTitle.style.setProperty("--reveal-size", TITLE_REVEAL_RADIUS);
      return;
    }

    gsap.to(baseLines, {
      x: (index) => (index === 0 ? -3 : 3),
      y: 2,
      scale: 0.95,
      opacity: 0.88,
      duration: 0.34,
      ease: "power2.out",
      overwrite: true,
    });
    gsap.set(revealLines, {
      x: (index) => (index === 0 ? -10 : 10),
      y: 16,
      rotate: (index) => (index === 0 ? -2 : 2),
      scale: 0.82,
      opacity: 0,
      filter: "blur(0.35rem)",
    });
    gsap.to(interactiveTitle, {
      "--reveal-size": TITLE_REVEAL_RADIUS,
      duration: 0.36,
      ease: "power3.out",
      overwrite: true,
    });
    gsap.to(revealLines, {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0rem)",
      duration: 0.44,
      stagger: 0.06,
      ease: "back.out(1.5)",
      overwrite: true,
    });
  };

  interactiveTitle.addEventListener("mouseenter", () => {
    pointerInside = true;
  });

  interactiveTitle.addEventListener("pointermove", (event) => {
    setPointer(event);

    if (!pointerInside) {
      pointerInside = true;
    }

    if (!interactiveTitle.classList.contains("is-hover")) {
      activateReveal(event);
    }
  });

  interactiveTitle.addEventListener("mouseleave", () => {
    pointerInside = false;

    if (!GSAP_ENABLED) {
      resetReveal();
      return;
    }

    gsap.to(baseLines, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 0.24,
      ease: "power2.out",
      overwrite: true,
    });
    gsap.to(revealLines, {
      x: 0,
      y: 6,
      rotate: 0,
      scale: 0.95,
      opacity: 0,
      filter: "blur(0.2rem)",
      duration: 0.16,
      stagger: 0.02,
      ease: "power1.out",
      overwrite: true,
    });
    gsap.to(interactiveTitle, {
      "--reveal-size": "0rem",
      "--mx": "50%",
      "--my": "50%",
      duration: 0.2,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: resetReveal,
    });
  });

  window.addEventListener("pagehide", resetReveal);
  window.addEventListener("beforeunload", resetReveal);

  resetReveal();
}

function initializeFooterVisibility() {
  const contentFlow = document.querySelector(SELECTORS.contentFlow);
  const contentFlowInner = document.querySelector(SELECTORS.contentFlowInner);
  const siteFooter = document.querySelector(SELECTORS.siteFooter);

  if (!contentFlow || !contentFlowInner || !siteFooter) {
    return;
  }

  let ticking = false;

  const updateFooterVisibility = () => {
    ticking = false;

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const viewportHeight = window.innerHeight || 0;
    const documentHeight = document.documentElement.scrollHeight || 0;
    const contentFlowInnerRect = contentFlowInner.getBoundingClientRect();
    const contentFlowEnteredViewport =
      contentFlowInnerRect.top < viewportHeight - 24;
    const footerRevealThreshold = 24;
    const isAtDocumentEnd =
      scrollTop + viewportHeight >= documentHeight - footerRevealThreshold;
    const shouldHideFooter = contentFlowEnteredViewport && !isAtDocumentEnd;

    siteFooter.classList.toggle("is-hidden", shouldHideFooter);
  };

  const requestFooterUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateFooterVisibility);
  };

  updateFooterVisibility();
  window.addEventListener("scroll", requestFooterUpdate, { passive: true });
  window.addEventListener("resize", requestFooterUpdate);
  window.addEventListener("load", requestFooterUpdate);
}

function initializeApp() {
  animateHeroTitleOnLoad();
  initializeMenu();
  initializeInteractiveTitle();
  initializeFooterVisibility();
  if (typeof window.initializePortfolioSlider === "function") {
    window.initializePortfolioSlider();
  }
  if (typeof window.initializePortfolioPlayer === "function") {
    window.initializePortfolioPlayer();
  }
}

initializeApp();
