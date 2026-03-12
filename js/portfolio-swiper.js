(function attachPortfolioSliderInitializer() {
  const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";
  const PORTFOLIO_SWIPER_BREAKPOINTS = {
    0: {
      slidesPerView: 1,
      centeredSlides: false,
      spaceBetween: 12,
    },
    768: {
      slidesPerView: 1,
      centeredSlides: false,
      spaceBetween: 16,
    },
    1024: {
      slidesPerView: "auto",
      centeredSlides: true,
      spaceBetween: 28,
    },
  };
  const posterCache = new Map();
  const PREVIEW_SELECTOR = ".portfolio-card-preview";
  const CARD_MEDIA_SELECTOR = ".portfolio-card-media";
  const EMBED_SELECTOR = ".portfolio-card-embed";

  function getCardMediaData(card) {
    if (window.portfolioMedia?.getPortfolioCardMediaData) {
      return window.portfolioMedia.getPortfolioCardMediaData(card);
    }

    const inlineVideo = card.querySelector(".portfolio-card-video");
    const sourceElement = inlineVideo?.querySelector("source");

    return {
      card,
      inlineVideo,
      mediaType: card.dataset.mediaType || "video",
      mediaSource:
        card.dataset.mediaSrc ||
        sourceElement?.getAttribute("src") ||
        inlineVideo?.currentSrc ||
        "",
      posterSource: card.dataset.posterSrc || "",
      posterTime: Number(card.dataset.posterTime || "0"),
    };
  }

  function capturePosterFromVideo(video, posterTime = 0) {
    const source = video.currentSrc || video.querySelector("source")?.src;
    const cacheKey = `${source}::${posterTime}`;

    if (!source) {
      return Promise.resolve(null);
    }

    if (posterCache.has(cacheKey)) {
      return posterCache.get(cacheKey);
    }

    const posterPromise = new Promise((resolve) => {
      const finalize = () => {
        if (!video.videoWidth || !video.videoHeight) {
          resolve(null);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      const seekToPosterTime = () => {
        const targetTime = Math.min(
          Math.max(posterTime, 0),
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.max(video.duration - 0.1, 0)
            : posterTime,
        );

        if (!targetTime || Math.abs(video.currentTime - targetTime) < 0.05) {
          finalize();
          return;
        }

        const handleSeeked = () => {
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
          finalize();
        };

        video.addEventListener("seeked", handleSeeked, { once: true });

        try {
          video.currentTime = targetTime;
        } catch (error) {
          video.removeEventListener("seeked", handleSeeked);
          finalize();
        }
      };

      if (video.readyState >= 2) {
        seekToPosterTime();
        return;
      }

      const handleLoadedData = () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        seekToPosterTime();
      };

      const handleError = () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        resolve(null);
      };

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.load();
    });

    posterCache.set(cacheKey, posterPromise);
    return posterPromise;
  }

  function ensureCardPreview(card, posterSource) {
    const mediaElement = card.querySelector(CARD_MEDIA_SELECTOR);

    if (!mediaElement || !posterSource) {
      return;
    }

    const inlineVideo = mediaElement.querySelector(".portfolio-card-video");
    const existingPreview = mediaElement.querySelector(PREVIEW_SELECTOR);

    if (inlineVideo) {
      inlineVideo.setAttribute("poster", posterSource);
      return;
    }

    if (existingPreview) {
      existingPreview.src = posterSource;
      return;
    }

    const previewImage = document.createElement("img");
    previewImage.className = "portfolio-card-preview";
    previewImage.alt = "";
    previewImage.src = posterSource;
    mediaElement.prepend(previewImage);
  }

  function ensureCardEmbed(card) {
    const mediaElement = card.querySelector(CARD_MEDIA_SELECTOR);

    if (!mediaElement) {
      return null;
    }

    const existingEmbed = mediaElement.querySelector(EMBED_SELECTOR);

    if (existingEmbed) {
      return existingEmbed;
    }

    const embedFrame = document.createElement("iframe");
    embedFrame.className = "portfolio-card-embed";
    embedFrame.title = "Portfolio card preview";
    embedFrame.allow = "autoplay; encrypted-media; picture-in-picture";
    embedFrame.allowFullscreen = true;
    embedFrame.referrerPolicy = "strict-origin-when-cross-origin";
    embedFrame.hidden = true;
    mediaElement.prepend(embedFrame);
    return embedFrame;
  }

  function initializePortfolioCardMedia(cards) {
    cards.forEach((card) => {
      const mediaData = getCardMediaData(card);

      if (!mediaData) {
        return;
      }

      if (mediaData.posterSource) {
        ensureCardPreview(card, mediaData.posterSource);
        return;
      }

      if (
        mediaData.mediaType === "youtube" &&
        window.portfolioMedia?.getYouTubeThumbnailUrl
      ) {
        ensureCardEmbed(card);
        const youtubePoster = window.portfolioMedia.getYouTubeThumbnailUrl(
          mediaData.mediaSource,
        );

        if (youtubePoster) {
          ensureCardPreview(card, youtubePoster);
        }
        return;
      }

      if (mediaData.mediaType !== "video" || !mediaData.inlineVideo) {
        return;
      }

      capturePosterFromVideo(mediaData.inlineVideo, mediaData.posterTime).then(
        (poster) => {
          if (!poster) {
            return;
          }

          ensureCardPreview(card, poster);
        },
      );
    });
  }

  function initializePortfolioSlider() {
    if (typeof window.Swiper !== "function") {
      return;
    }

    const sliderElement = document.querySelector(".portfolio-swiper");

    if (!sliderElement) {
      return;
    }

    const portfolioCards = Array.from(
      sliderElement.querySelectorAll(".portfolio-card"),
    );
    const allVideos = portfolioCards
      .map((card) => getCardMediaData(card)?.inlineVideo)
      .filter(Boolean);

    initializePortfolioCardMedia(portfolioCards);

    let currentActiveCard = null;
    const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncCardTriggerState = (activeSlide) => {
      const restrictToActiveCard = desktopMediaQuery.matches;

      portfolioCards.forEach((card) => {
        const trigger = card.querySelector(".portfolio-card-title");

        if (!trigger) {
          return;
        }

        const isInteractive = !restrictToActiveCard || card === activeSlide;
        trigger.disabled = !isInteractive;
        trigger.setAttribute("aria-disabled", String(!isInteractive));
      });
    };

    const playInlineVideo = (video, restart = false) => {
      const startPlayback = () => {
        if (restart) {
          video.currentTime = 0;
        }
        video.muted = true;
        video.playsInline = true;

        if (!restart && !video.paused && video.currentTime > 0.08) {
          return;
        }

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      };

      if (video.readyState >= 2) {
        startPlayback();
        return;
      }

      const handleLoadedData = () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        startPlayback();
      };

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.load();
    };

    const stopYouTubePreview = (card) => {
      const embed = card.querySelector(EMBED_SELECTOR);
      const preview = card.querySelector(PREVIEW_SELECTOR);

      if (preview) {
        preview.hidden = false;
      }

      if (!embed) {
        return;
      }

      embed.hidden = true;
      embed.removeAttribute("src");
    };

    const stopInlineVideo = (video) => {
      if (!video) {
        return;
      }

      video.pause();
      video.currentTime = 0;
    };

    const synchronizeCardMediaState = (card, isActive, restartActiveMedia) => {
      const mediaData = getCardMediaData(card);

      if (!mediaData) {
        return;
      }

      if (
        mediaData.mediaType === "youtube" &&
        window.portfolioMedia?.getYouTubePreviewEmbedUrl
      ) {
        const embed = ensureCardEmbed(card);
        const preview = card.querySelector(PREVIEW_SELECTOR);
        const previewEmbedUrl = window.portfolioMedia.getYouTubePreviewEmbedUrl(
          mediaData.mediaSource,
        );

        stopInlineVideo(mediaData.inlineVideo);

        if (!isActive || !embed || !previewEmbedUrl) {
          stopYouTubePreview(card);
          return;
        }

        if (preview) {
          preview.hidden = true;
        }

        if (embed.src !== previewEmbedUrl) {
          embed.src = previewEmbedUrl;
        }

        embed.hidden = false;
        return;
      }

      stopYouTubePreview(card);

      if (!mediaData.inlineVideo) {
        return;
      }

      if (!isActive) {
        stopInlineVideo(mediaData.inlineVideo);
        return;
      }

      playInlineVideo(mediaData.inlineVideo, restartActiveMedia);
    };

    const syncPortfolioMediaState = (swiper) => {
      const activeSlide =
        swiper.slides[swiper.activeIndex] ||
        sliderElement.querySelector(".swiper-slide-active");
      const restartActiveMedia = activeSlide !== currentActiveCard;

      syncCardTriggerState(activeSlide);

      portfolioCards.forEach((card) => {
        synchronizeCardMediaState(
          card,
          card === activeSlide,
          restartActiveMedia,
        );
      });

      currentActiveCard = activeSlide || null;
    };

    const stopAllPortfolioMedia = () => {
      portfolioCards.forEach((card) => {
        const mediaData = getCardMediaData(card);

        if (mediaData?.inlineVideo) {
          stopInlineVideo(mediaData.inlineVideo);
        }

        stopYouTubePreview(card);
      });

      syncCardTriggerState(null);

      currentActiveCard = null;
    };

    const portfolioSwiper = new Swiper(sliderElement, {
      slidesPerView: "auto",
      centeredSlides: true,
      spaceBetween: 28,
      speed: 700,
      grabCursor: false,
      allowTouchMove: true,
      simulateTouch: true,
      followFinger: true,
      touchEventsTarget: "container",
      touchStartPreventDefault: true,
      touchMoveStopPropagation: false,
      touchRatio: 1.15,
      shortSwipes: true,
      longSwipes: true,
      longSwipesRatio: 0.12,
      longSwipesMs: 220,
      loop: false,
      rewind: false,
      watchSlidesProgress: true,
      watchOverflow: false,
      preventClicks: true,
      preventClicksPropagation: true,
      noSwiping: false,
      resistanceRatio: 0.85,
      threshold: 2,
      navigation: {
        nextEl: ".portfolio-next",
        prevEl: ".portfolio-prev",
      },
      breakpoints: PORTFOLIO_SWIPER_BREAKPOINTS,
      on: {
        init(swiper) {
          stopAllPortfolioMedia();
          requestAnimationFrame(() => syncPortfolioMediaState(swiper));
        },
        slideChange(swiper) {
          syncPortfolioMediaState(swiper);
        },
        slideChangeTransitionEnd(swiper) {
          syncPortfolioMediaState(swiper);
        },
      },
    });

    window.addEventListener("pagehide", () => {
      stopAllPortfolioMedia();
      portfolioSwiper.destroy(true, true);
    });

    desktopMediaQuery.addEventListener("change", () => {
      syncPortfolioMediaState(portfolioSwiper);
    });
  }

  window.initializePortfolioSlider = initializePortfolioSlider;
})();
