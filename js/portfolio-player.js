(function attachPortfolioPlayerInitializer() {
  const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";
  const PLAYER_SELECTOR = "#portfolio-player";
  const TRIGGER_SELECTOR = ".portfolio-card-play-trigger";
  const INLINE_VIDEO_SELECTOR = ".portfolio-card-video";
  const INLINE_EMBED_SELECTOR = ".portfolio-card-embed";
  const ACTIVE_CARD_SELECTOR = ".portfolio-swiper .swiper-slide-active";

  function getCardMediaData(card) {
    if (window.portfolioMedia?.getPortfolioCardMediaData) {
      return window.portfolioMedia.getPortfolioCardMediaData(card);
    }

    const inlineVideo = card?.querySelector(INLINE_VIDEO_SELECTOR);
    const sourceElement = inlineVideo?.querySelector("source");
    const titleElement = card?.querySelector(".portfolio-card-title-text");
    const trigger = card?.querySelector(".portfolio-card-title");

    return {
      card,
      trigger,
      inlineVideo,
      mediaType: card?.dataset.mediaType || "video",
      mediaSource:
        card?.dataset.mediaSrc ||
        sourceElement?.getAttribute("src") ||
        inlineVideo?.currentSrc ||
        "",
      posterSource: card?.dataset.posterSrc || "",
      title:
        card?.dataset.mediaTitle ||
        titleElement?.textContent?.trim() ||
        trigger?.textContent?.trim() ||
        "",
    };
  }

  function pauseInlinePortfolioVideos() {
    document.querySelectorAll(INLINE_VIDEO_SELECTOR).forEach((video) => {
      video.pause();
    });

    document.querySelectorAll(INLINE_EMBED_SELECTOR).forEach((embed) => {
      embed.hidden = true;
      embed.removeAttribute("src");
    });
  }

  function resumeActiveInlinePortfolioMedia() {
    const activeCard = document.querySelector(ACTIVE_CARD_SELECTOR);
    const activeMediaData = getCardMediaData(activeCard);

    if (!activeMediaData) {
      return;
    }

    if (
      activeMediaData.mediaType === "youtube" &&
      window.portfolioMedia?.getYouTubePreviewEmbedUrl
    ) {
      const activeEmbed = activeCard?.querySelector(INLINE_EMBED_SELECTOR);
      const previewEmbedUrl = window.portfolioMedia.getYouTubePreviewEmbedUrl(
        activeMediaData.mediaSource,
      );

      if (!activeEmbed || !previewEmbedUrl) {
        return;
      }

      activeEmbed.src = previewEmbedUrl;
      activeEmbed.hidden = false;
      return;
    }

    const activeVideo = activeMediaData.inlineVideo;

    if (!activeVideo) {
      return;
    }

    activeVideo.muted = true;
    activeVideo.playsInline = true;

    const playPromise = activeVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function initializePortfolioPlayer() {
    const playerRoot = document.querySelector(PLAYER_SELECTOR);
    const playerTitle = playerRoot?.querySelector(".portfolio-player-title");
    const playerVideo = playerRoot?.querySelector(".portfolio-player-video");
    const playerFrame = playerRoot?.querySelector(".portfolio-player-iframe");
    const triggerButtons = Array.from(
      document.querySelectorAll(TRIGGER_SELECTOR),
    );

    if (
      !playerRoot ||
      !playerTitle ||
      !playerVideo ||
      !playerFrame ||
      !triggerButtons.length
    ) {
      return;
    }

    let activeTrigger = null;
    let hideTimerId = 0;

    const isTriggerEnabled = (triggerButton) => {
      if (!triggerButton || triggerButton.disabled) {
        return false;
      }

      const portfolioCard = triggerButton.closest(".portfolio-card");

      if (!portfolioCard) {
        return false;
      }

      if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
        return true;
      }

      return portfolioCard.classList.contains("swiper-slide-active");
    };

    const closePlayer = () => {
      playerRoot.classList.remove("is-open");
      playerRoot.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-portfolio-player-open");

      playerVideo.pause();
      playerVideo.currentTime = 0;
      playerVideo.hidden = true;
      playerVideo.removeAttribute("src");
      playerVideo.load();

      playerFrame.hidden = true;
      playerFrame.removeAttribute("src");

      window.clearTimeout(hideTimerId);
      hideTimerId = window.setTimeout(() => {
        playerRoot.hidden = true;
      }, 180);

      resumeActiveInlinePortfolioMedia();

      if (activeTrigger) {
        activeTrigger.focus();
      }
    };

    const openPlayer = (triggerButton) => {
      if (!isTriggerEnabled(triggerButton)) {
        return;
      }

      const portfolioCard = triggerButton.closest(".portfolio-card");
      const mediaData = getCardMediaData(portfolioCard);

      if (!mediaData?.mediaSource) {
        return;
      }

      let playerMode = mediaData.mediaType;
      let resolvedSource = mediaData.mediaSource;

      if (playerMode === "youtube") {
        resolvedSource = window.portfolioMedia?.getYouTubeEmbedUrl(
          mediaData.mediaSource,
        );

        if (!resolvedSource) {
          return;
        }
      } else {
        playerMode = "video";
      }

      window.clearTimeout(hideTimerId);
      activeTrigger = triggerButton;

      pauseInlinePortfolioVideos();

      playerTitle.textContent = mediaData.title || triggerButton.textContent.trim();

      playerVideo.pause();
      playerVideo.hidden = true;
      playerVideo.removeAttribute("src");
      playerVideo.load();
      playerFrame.hidden = true;
      playerFrame.removeAttribute("src");

      if (playerMode === "youtube") {
        playerFrame.src = resolvedSource;
        playerFrame.hidden = false;
      } else {
        playerVideo.src = resolvedSource;
        playerVideo.poster =
          mediaData.posterSource ||
          mediaData.inlineVideo?.getAttribute("poster") ||
          "";
        playerVideo.muted = false;
        playerVideo.controls = true;
        playerVideo.playsInline = true;
        playerVideo.currentTime = 0;
        playerVideo.hidden = false;
      }

      playerRoot.hidden = false;
      playerRoot.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-portfolio-player-open");

      requestAnimationFrame(() => {
        playerRoot.classList.add("is-open");
      });

      if (playerMode !== "youtube") {
        const playPromise = playerVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      }
    };

    triggerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        openPlayer(button);
      });
    });

    playerRoot.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-player-close='true']");

      if (!closeTarget) {
        return;
      }

      closePlayer();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || playerRoot.hidden) {
        return;
      }

      closePlayer();
    });

    window.addEventListener("pagehide", () => {
      if (playerRoot.hidden) {
        return;
      }

      closePlayer();
    });
  }

  window.initializePortfolioPlayer = initializePortfolioPlayer;
})();
