(function attachPortfolioMediaHelpers() {
  const DEFAULT_MEDIA_TYPE = "video";

  function getYouTubeVideoId(source) {
    if (!source) {
      return "";
    }

    if (/^[\w-]{11}$/.test(source)) {
      return source;
    }

    try {
      const url = new URL(source, window.location.origin);

      if (url.hostname.includes("youtu.be")) {
        return url.pathname.replace(/\//g, "");
      }

      if (url.searchParams.has("v")) {
        return url.searchParams.get("v") || "";
      }

      const embedMatch = url.pathname.match(/\/embed\/([\w-]{11})/);
      return embedMatch?.[1] || "";
    } catch (error) {
      return "";
    }
  }

  function getYouTubeThumbnailUrl(source) {
    const videoId = getYouTubeVideoId(source);

    if (!videoId) {
      return "";
    }

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function getYouTubeEmbedUrl(source) {
    const videoId = getYouTubeVideoId(source);

    if (!videoId) {
      return "";
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  }

  function getYouTubePreviewEmbedUrl(source) {
    const videoId = getYouTubeVideoId(source);

    if (!videoId) {
      return "";
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1`;
  }

  function getPortfolioCardMediaData(card) {
    if (!card) {
      return null;
    }

    const inlineVideo = card.querySelector(".portfolio-card-video");
    const sourceElement = inlineVideo?.querySelector("source");
    const titleElement = card.querySelector(".portfolio-card-title-text");
    const trigger = card.querySelector(".portfolio-card-title");
    const mediaType = card.dataset.mediaType || DEFAULT_MEDIA_TYPE;
    const mediaSource =
      card.dataset.mediaSrc ||
      sourceElement?.getAttribute("src") ||
      inlineVideo?.currentSrc ||
      "";

    return {
      card,
      trigger,
      inlineVideo,
      mediaType,
      mediaSource,
      posterSource: card.dataset.posterSrc || "",
      posterTime: Number(card.dataset.posterTime || "0"),
      title:
        card.dataset.mediaTitle ||
        titleElement?.textContent?.trim() ||
        trigger?.textContent?.trim() ||
        "",
    };
  }

  window.portfolioMedia = {
    getPortfolioCardMediaData,
    getYouTubeEmbedUrl,
    getYouTubePreviewEmbedUrl,
    getYouTubeThumbnailUrl,
  };
})();
