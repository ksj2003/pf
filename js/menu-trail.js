(function attachMenuTrailController() {

  const GSAP_ENABLED = Boolean(window.gsap);
  const TRAIL_CONFIG = {
    segmentCount: 10,
    minScale: 0.35,
    scaleStep: 0.04,
    segmentOpacityStart: 0.72,
    segmentOpacityStep: 0.025,
    segmentOpacityMin: 0.28,
    segmentStagger: 0.004,
    followEaseStart: 0.9,
    followEaseStep: 0.045,
    followEaseMin: 0.32,
    speedScaleMin: 1,
    speedScaleMax: 1.12,
    speedScaleFactor: 0.006,
    speedThreshold: 0.01,
    speedDurationFast: 0.06,
    speedDurationIdle: 0.08,
    linkHoverScale: 1.12,
  };

  function createTrailSegments(container) {
    return Array.from({ length: TRAIL_CONFIG.segmentCount }, (_, index) => {
      const segment = document.createElement("span");
      const scale = Math.max(
        TRAIL_CONFIG.minScale,
        1 - index * TRAIL_CONFIG.scaleStep,
      );
      segment.className = "menu-trail-segment";
      segment.style.transform = `translate(-50%, -50%) scale(${scale})`;
      segment.style.opacity = "0";
      container.appendChild(segment);
      return segment;
    });
  }

  window.createMenuTrailController = function createMenuTrailController({
    menuOverlay,
    menuTrailChain,
    menuTrailMain,
    isMenuOpen,
  }) {
    if (!menuOverlay || !menuTrailMain || !GSAP_ENABLED) {
      return {
        reset() {},
        hide() {},
        handleLinkEnter() {},
        handleLinkLeave() {},
        mount() {},
      };
    }

    const trailSegments = menuTrailChain
      ? createTrailSegments(menuTrailChain)
      : [];
    const trailPoints = trailSegments.map(() => ({ x: -9999, y: -9999 }));
    let lastPointerX = Number.NaN;
    let lastPointerY = Number.NaN;
    let trailFrame = null;

    const reset = () => {
      if (trailFrame) {
        cancelAnimationFrame(trailFrame);
        trailFrame = null;
      }

      lastPointerX = Number.NaN;
      lastPointerY = Number.NaN;

      gsap.set(menuTrailMain, {
        autoAlpha: 0,
        scale: 0.72,
        xPercent: -50,
        yPercent: -50,
        x: -9999,
        y: -9999,
      });

      if (!trailSegments.length) {
        return;
      }

      trailPoints.forEach((point) => {
        point.x = -9999;
        point.y = -9999;
      });
      gsap.set(trailSegments, {
        autoAlpha: 0,
        xPercent: -50,
        yPercent: -50,
        x: -9999,
        y: -9999,
      });
    };

    const show = () => {
      gsap.to(menuTrailMain, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.18,
        overwrite: "auto",
      });

      if (!trailSegments.length) {
        return;
      }

      gsap.to(trailSegments, {
        autoAlpha: (index) =>
          Math.max(
            TRAIL_CONFIG.segmentOpacityMin,
            TRAIL_CONFIG.segmentOpacityStart -
              index * TRAIL_CONFIG.segmentOpacityStep,
          ),
        duration: 0.18,
        overwrite: "auto",
        stagger: TRAIL_CONFIG.segmentStagger,
      });
    };

    const hide = () => {
      gsap.to(menuTrailMain, {
        autoAlpha: 0,
        scale: 0.76,
        duration: 0.14,
        overwrite: "auto",
      });

      if (!trailSegments.length) {
        return;
      }

      gsap.to(trailSegments, {
        autoAlpha: 0,
        duration: 0.12,
        overwrite: "auto",
      });
    };

    const seedTrail = (x, y) => {
      trailPoints.forEach((point) => {
        point.x = x;
        point.y = y;
      });
      gsap.set(trailSegments, { x, y });
    };

    const place = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const shouldSeed =
        !Number.isFinite(lastPointerX) || !Number.isFinite(lastPointerY);
      lastPointerX = x;
      lastPointerY = y;

      gsap.set(menuTrailMain, { x, y });

      if (shouldSeed && trailSegments.length) {
        seedTrail(x, y);
      }
    };

    const runTrail = () => {
      if (!isMenuOpen()) {
        trailFrame = null;
        return;
      }

      if (
        trailSegments.length &&
        Number.isFinite(lastPointerX) &&
        Number.isFinite(lastPointerY)
      ) {
        let leaderX = lastPointerX;
        let leaderY = lastPointerY;

        trailSegments.forEach((segment, index) => {
          const point = trailPoints[index];
          const ease = Math.max(
            TRAIL_CONFIG.followEaseMin,
            TRAIL_CONFIG.followEaseStart - index * TRAIL_CONFIG.followEaseStep,
          );
          point.x += (leaderX - point.x) * ease;
          point.y += (leaderY - point.y) * ease;
          leaderX = point.x;
          leaderY = point.y;
          gsap.set(segment, { x: point.x, y: point.y });
        });
      }

      trailFrame = requestAnimationFrame(runTrail);
    };

    const updateTrailScale = (event) => {
      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      const speed = Math.hypot(deltaX, deltaY);
      const targetScale =
        speed > TRAIL_CONFIG.speedThreshold
          ? gsap.utils.clamp(
              TRAIL_CONFIG.speedScaleMin,
              TRAIL_CONFIG.speedScaleMax,
              1 + speed * TRAIL_CONFIG.speedScaleFactor,
            )
          : TRAIL_CONFIG.speedScaleMin;

      gsap.to(menuTrailMain, {
        scale: targetScale,
        duration:
          speed > TRAIL_CONFIG.speedThreshold
            ? TRAIL_CONFIG.speedDurationFast
            : TRAIL_CONFIG.speedDurationIdle,
        ease: "none",
        overwrite: "auto",
      });
    };

    const handlePointerMove = (event) => {
      if (!isMenuOpen()) {
        return;
      }

      const prevX = lastPointerX;
      const prevY = lastPointerY;

      place(event.clientX, event.clientY);
      show();

      if (Number.isFinite(prevX) && Number.isFinite(prevY)) {
        updateTrailScale(event);
      }
    };

    const handleLinkEnter = (event, link) => {
      const rect = link.getBoundingClientRect();
      const centerX = Number.isFinite(lastPointerX)
        ? lastPointerX
        : event.clientX || rect.left + rect.width / 2;
      const centerY = Number.isFinite(lastPointerY)
        ? lastPointerY
        : event.clientY || rect.top + rect.height / 2;

      place(centerX, centerY);
      show();
      gsap.to(menuTrailMain, {
        scale: TRAIL_CONFIG.linkHoverScale,
        duration: 0.16,
        overwrite: "auto",
      });
    };

    const handleLinkLeave = () => {
      gsap.to(menuTrailMain, {
        scale: 1,
        duration: 0.14,
        overwrite: "auto",
      });
    };

    const handlePointerEnter = (event) => {
      if (!isMenuOpen()) {
        return;
      }

      place(event.clientX, event.clientY);
      show();

      if (!trailFrame) {
        trailFrame = requestAnimationFrame(runTrail);
      }
    };

    const mount = () => {
      window.addEventListener("pointermove", handlePointerMove);
      menuOverlay.addEventListener("pointerenter", handlePointerEnter);
      menuOverlay.addEventListener("mouseleave", hide);
    };

    return {
      reset,
      hide,
      handleLinkEnter,
      handleLinkLeave,
      mount,
    };
  };
})();
