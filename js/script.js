"use strict";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("has-js");

  initSiteIntro();
  initProjectSliders();
  initExpandingPanels();
  initContactPanel();

  const backgroundScene = document.querySelector("[data-background-scene]");
  if (!backgroundScene) {
    return;
  }

  if (typeof window.renderBackgroundScene === "function") {
    window.renderBackgroundScene(backgroundScene);
  }

  initNetworkCanvas(backgroundScene);
});

function initSiteIntro() {
  const intro = document.querySelector("[data-site-intro]");
  const introBrand = intro ? intro.querySelector("[data-site-intro-brand]") : null;
  const targetBrand = document.querySelector(".brand");

  if (!intro || !introBrand || !targetBrand) {
    document.documentElement.classList.add("intro-complete");
    return;
  }

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isFinished = false;
  let fallbackTimerId = 0;
  let resizeTimerId = 0;

  const finishIntro = () => {
    if (isFinished) {
      return;
    }

    isFinished = true;
    window.clearTimeout(fallbackTimerId);
    window.clearTimeout(resizeTimerId);
    window.removeEventListener("resize", scheduleMotionSync);
    document.documentElement.classList.add("intro-complete");
    intro.classList.add("is-done");

    window.setTimeout(() => {
      intro.setAttribute("hidden", "");
    }, 500);
  };

  if (reduceMotionQuery.matches) {
    finishIntro();
    return;
  }

  const syncIntroMotion = () => {
    const introRect = introBrand.getBoundingClientRect();
    const targetRect = targetBrand.getBoundingClientRect();
    const scale = targetRect.width / Math.max(introRect.width, 1);
    const translateX = targetRect.left + targetRect.width / 2 - (introRect.left + introRect.width / 2);
    const translateY = targetRect.top + targetRect.height / 2 - (introRect.top + introRect.height / 2);

    introBrand.style.setProperty("--intro-move-x", `${translateX}px`);
    introBrand.style.setProperty("--intro-move-y", `${translateY}px`);
    introBrand.style.setProperty("--intro-scale", `${scale}`);
  };

  function scheduleMotionSync() {
    if (intro.classList.contains("is-flying")) {
      return;
    }

    window.clearTimeout(resizeTimerId);
    resizeTimerId = window.setTimeout(syncIntroMotion, 120);
  }

  const startIntro = () => {
    if (isFinished) {
      return;
    }

    syncIntroMotion();
    intro.classList.add("is-ready");

    window.setTimeout(() => {
      if (isFinished) {
        return;
      }

      syncIntroMotion();
      intro.classList.add("is-flying");
      fallbackTimerId = window.setTimeout(finishIntro, 1500);
    }, 2200);
  };

  introBrand.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform" && intro.classList.contains("is-flying")) {
      finishIntro();
    }
  });
  window.addEventListener("resize", scheduleMotionSync);

  if (document.fonts && typeof document.fonts.ready === "object") {
    document.fonts.ready.then(startIntro).catch(startIntro);
    return;
  }

  startIntro();
}

function initProjectSliders() {
  const sliders = document.querySelectorAll("[data-project-slider]");
  for (const slider of sliders) {
    initProjectSlider(slider);
  }
}

function initProjectSlider(slider) {
  const slides = Array.from(slider.querySelectorAll("[data-project-slide]"));
  if (slides.length < 2) {
    return;
  }

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const interval = Number(slider.dataset.sliderInterval) || 3200;
  let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains("is-active")), 0);
  let timerId = 0;

  const showSlide = (nextIndex) => {
    slides[activeIndex].classList.remove("is-active");
    slides[activeIndex].setAttribute("aria-hidden", "true");

    activeIndex = (nextIndex + slides.length) % slides.length;
    const activeSlide = slides[activeIndex];

    activeSlide.classList.add("is-active");
    activeSlide.removeAttribute("aria-hidden");
    slider.style.setProperty("--tile-bg", activeSlide.dataset.tileBg || "");
    slider.style.setProperty("--tile-hover-bg", activeSlide.dataset.tileHoverBg || "");
  };

  const pause = () => {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
    slider.classList.add("is-paused");
  };

  const start = () => {
    if (timerId || reduceMotionQuery.matches) {
      return;
    }
    slider.classList.remove("is-paused");
    timerId = window.setInterval(() => showSlide(activeIndex + 1), interval);
  };

  slider.addEventListener("mouseenter", pause);
  slider.addEventListener("mouseleave", start);
  slider.addEventListener("focusin", pause);
  slider.addEventListener("focusout", start);
  addMediaQueryListener(reduceMotionQuery, () => {
    if (reduceMotionQuery.matches) {
      pause();
      return;
    }
    start();
  });

  showSlide(activeIndex);
  if (reduceMotionQuery.matches) {
    pause();
    return;
  }
  start();
}

function initExpandingPanels() {
  const triggers = document.querySelectorAll("[data-expand-trigger]");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  for (const trigger of triggers) {
    const panelId = trigger.dataset.expandTarget;
    const panel = panelId ? document.getElementById(panelId) : null;
    const closeButton = panel ? panel.querySelector("[data-expand-close]") : null;

    if (!panel || !closeButton) {
      continue;
    }

    initExpandingPanel(trigger, panel, closeButton, reduceMotionQuery, focusableSelector);
  }
}

function initExpandingPanel(trigger, panel, closeButton, reduceMotionQuery, focusableSelector) {
  let isOpen = false;
  let closeTimerId = 0;
  let focusTimerId = 0;
  let shouldReturnFocusToTrigger = false;

  const syncPanelStart = () => {
    const rect = trigger.getBoundingClientRect();
    const triggerStyle = window.getComputedStyle(trigger);
    const triggerBackground = triggerStyle.backgroundColor;

    panel.style.setProperty("--tile-panel-x", `${rect.left}px`);
    panel.style.setProperty("--tile-panel-y", `${rect.top}px`);
    panel.style.setProperty("--tile-panel-width", `${Math.max(rect.width, 1)}px`);
    panel.style.setProperty("--tile-panel-height", `${Math.max(rect.height, 1)}px`);
    panel.style.setProperty("--tile-panel-bg-start", triggerBackground);
  };

  const focusCloseButton = () => {
    closeButton.focus({ preventScroll: true });
  };

  const getFocusableElements = () =>
    Array.from(panel.querySelectorAll(focusableSelector)).filter(
      (element) => element.getClientRects().length > 0 && !element.closest("[inert]"),
    );

  const openPanel = (openedWithKeyboard = false) => {
    if (isOpen) {
      return;
    }

    isOpen = true;
    shouldReturnFocusToTrigger = openedWithKeyboard;
    window.clearTimeout(closeTimerId);
    window.clearTimeout(focusTimerId);
    syncPanelStart();

    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.classList.remove("is-closing");
    panel.classList.remove("is-open");
    panel.classList.add("is-visible");
    panel.dispatchEvent(new CustomEvent("tilepanel:open"));
    trigger.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("tile-panel-active");
    document.body.classList.add("tile-panel-active");

    if (reduceMotionQuery.matches) {
      panel.classList.add("is-open");
      if (openedWithKeyboard) {
        focusCloseButton();
      }
      return;
    }

    panel.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      panel.classList.add("is-open");
    });

    if (openedWithKeyboard) {
      focusTimerId = window.setTimeout(focusCloseButton, 720);
    }
  };

  const finishClose = () => {
    if (isOpen) {
      return;
    }

    window.clearTimeout(closeTimerId);
    window.clearTimeout(focusTimerId);
    panel.classList.remove("is-closing");
    panel.classList.remove("is-visible");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.dispatchEvent(new CustomEvent("tilepanel:closed"));
    document.documentElement.classList.remove("tile-panel-active");
    document.body.classList.remove("tile-panel-active");

    if (shouldReturnFocusToTrigger) {
      trigger.focus({ preventScroll: true });
    }
  };

  const closePanel = () => {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    window.clearTimeout(focusTimerId);
    syncPanelStart();
    panel.dispatchEvent(new CustomEvent("tilepanel:close-start"));
    trigger.setAttribute("aria-expanded", "false");
    panel.classList.add("is-closing");
    panel.classList.remove("is-open");

    if (reduceMotionQuery.matches) {
      finishClose();
      return;
    }

    closeTimerId = window.setTimeout(finishClose, 900);
  };

  trigger.addEventListener("click", () => {
    openPanel(false);
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openPanel(true);
  });

  closeButton.addEventListener("click", closePanel);
  panel.addEventListener("transitionend", (event) => {
    if (event.target === panel && !isOpen && (event.propertyName === "width" || event.propertyName === "height")) {
      finishClose();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      closePanel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus({ preventScroll: true });
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus({ preventScroll: true });
    }
  });
}

function initContactPanel() {
  const panel = document.getElementById("contact-panel");
  if (!panel) {
    return;
  }

  const focusField = panel.querySelector("[data-contact-focus]");
  const form = panel.querySelector("[data-contact-form]");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileContactQuery = window.matchMedia("(max-width: 640px)");
  let focusTimerId = 0;

  const focusContactField = () => {
    window.clearTimeout(focusTimerId);

    if (!focusField || mobileContactQuery.matches) {
      return;
    }

    const focusDelay = reduceMotionQuery.matches ? 0 : 620;
    focusTimerId = window.setTimeout(() => {
      focusField.focus({ preventScroll: true });
    }, focusDelay);
  };

  panel.addEventListener("tilepanel:open", focusContactField);

  panel.addEventListener("tilepanel:closed", () => {
    window.clearTimeout(focusTimerId);
  });

  if (!form) {
    return;
  }

  const fileInput = form.querySelector('input[name="attachments"]');
  const fileLabel = form.querySelector("[data-file-label]");

  if (fileInput && fileLabel) {
    fileInput.addEventListener("change", () => {
      const count = fileInput.files ? fileInput.files.length : 0;
      fileLabel.textContent =
        count === 0 ? "Dołącz grafiki, brief albo projekt" : `Wybrane pliki: ${count}`;
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const attachments = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
    const targetEmail = form.dataset.contactMail || "kontakt@lisieckidev.pl";
    const mailSubject = subject || `Zapytanie ze strony od ${name}`;
    const bodyLines = [
      `Imię / firma: ${name}`,
      `Email: ${email}`,
      "",
      "Wiadomość:",
      message,
    ];

    if (attachments.length > 0) {
      bodyLines.push(
        "",
        "Pliki wybrane w formularzu:",
        ...attachments.map((file) => `- ${file.name}`),
        "",
        "Uwaga: formularz otwiera klienta poczty. Dołącz wybrane pliki w wiadomości email.",
      );
    }

    window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(
      bodyLines.join("\n"),
    )}`;
  });
}

function initNetworkCanvas(backgroundScene) {
  const canvas = backgroundScene.querySelector("[data-network-canvas]");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const tiles = document.querySelector(".tiles");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopQuery = window.matchMedia("(min-width: 801px)");

  const target = { x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let networkLimitY = 0;
  let scale = 1;
  let animationFrameId = 0;
  let animateNetwork = true;
  let isEnabled = false;
  let sceneRect = backgroundScene.getBoundingClientRect();
  let points = [];

  const syncEnabledState = () => {
    const shouldEnable = desktopQuery.matches && !reduceMotionQuery.matches;
    if (shouldEnable === isEnabled) {
      if (isEnabled) {
        resizeCanvas();
      } else {
        clearCanvas();
      }
      return;
    }

    isEnabled = shouldEnable;
    backgroundScene.classList.toggle("background--network-active", isEnabled);

    if (isEnabled) {
      resizeCanvas();
      startAnimation();
      return;
    }

    stopAnimation();
    clearCanvas();
  };

  const resizeCanvas = () => {
    sceneRect = backgroundScene.getBoundingClientRect();
    width = Math.max(Math.round(sceneRect.width), 1);
    height = Math.max(Math.round(sceneRect.height), 1);
    networkLimitY = getNetworkLimitY();
    scale = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    target.x = width / 2;
    target.y = Math.max(networkLimitY / 2, 1);
    points = createPoints(width, Math.max(networkLimitY, 1));
  };

  const handleMouseMove = (event) => {
    if (!isEnabled) {
      return;
    }

    const pointerX = event.clientX - sceneRect.left;
    const pointerY = event.clientY - sceneRect.top;
    const isPointerInUpperArea = pointerY >= 0 && pointerY < networkLimitY;

    backgroundScene.classList.toggle("background--network-muted", !isPointerInUpperArea);

    if (!isPointerInUpperArea) {
      return;
    }

    target.x = pointerX;
    target.y = pointerY;
  };

  const handleScroll = () => {
    sceneRect = backgroundScene.getBoundingClientRect();
    networkLimitY = getNetworkLimitY();
    animateNetwork = window.scrollY <= window.innerHeight;
  };

  const handleResize = () => {
    handleScroll();
    if (isEnabled) {
      resizeCanvas();
    }
  };

  const animate = (now) => {
    if (!isEnabled) {
      animationFrameId = 0;
      return;
    }

    updatePointShift(points, now);
    context.clearRect(0, 0, width, height);

    if (animateNetwork && networkLimitY > 0) {
      context.save();
      context.beginPath();
      context.rect(0, 0, width, networkLimitY);
      context.clip();
      drawNetwork(context, points, target);
      context.restore();
    }

    animationFrameId = window.requestAnimationFrame(animate);
  };

  window.addEventListener("mousemove", handleMouseMove, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", handleScroll, { passive: true });
  addMediaQueryListener(desktopQuery, syncEnabledState);
  addMediaQueryListener(reduceMotionQuery, syncEnabledState);

  handleScroll();
  syncEnabledState();

  function startAnimation() {
    if (!animationFrameId) {
      animationFrameId = window.requestAnimationFrame(animate);
    }
  }

  function stopAnimation() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function clearCanvas() {
    context.clearRect(0, 0, width, height);
  }

  function getNetworkLimitY() {
    if (!tiles) {
      return height;
    }

    const tilesRect = tiles.getBoundingClientRect();
    return clamp(Math.round(tilesRect.top - sceneRect.top), 0, height);
  }
}

function createPoints(width, height) {
  const points = [];
  const stepX = width / 20;
  const stepY = height / 20;

  for (let x = 0; x < width; x += stepX) {
    for (let y = 0; y < height; y += stepY) {
      const pointX = x + Math.random() * stepX;
      const pointY = y + Math.random() * stepY;
      points.push(createPoint(pointX, pointY));
    }
  }

  for (const point of points) {
    point.closest = findClosestPoints(point, points);
  }

  return points;
}

function createPoint(x, y) {
  const point = {
    x,
    y,
    originX: x,
    originY: y,
    active: 0,
    circleActive: 0,
    radius: 2 + Math.random() * 2,
    closest: [],
    shiftStart: 0,
    shiftDuration: 0,
    shiftFromX: x,
    shiftFromY: y,
    shiftToX: x,
    shiftToY: y,
  };

  setNextPointShift(point, performance.now(), true);
  return point;
}

function findClosestPoints(point, points) {
  const closest = [];

  for (const candidate of points) {
    if (candidate === point) {
      continue;
    }

    let inserted = false;
    for (let index = 0; index < 4; index += 1) {
      if (closest[index] === undefined) {
        closest[index] = candidate;
        inserted = true;
        break;
      }
    }

    if (inserted) {
      continue;
    }

    for (let index = 0; index < 4; index += 1) {
      if (getDistance(point, candidate) < getDistance(point, closest[index])) {
        closest[index] = candidate;
        break;
      }
    }
  }

  return closest;
}

function updatePointShift(points, now) {
  for (const point of points) {
    const duration = Math.max(point.shiftDuration, 1);
    const progress = clamp((now - point.shiftStart) / duration, 0, 1);
    const eased = easeInOutCirc(progress);

    point.x = point.shiftFromX + (point.shiftToX - point.shiftFromX) * eased;
    point.y = point.shiftFromY + (point.shiftToY - point.shiftFromY) * eased;

    if (progress >= 1) {
      setNextPointShift(point, now, false);
    }
  }
}

function setNextPointShift(point, now, seed) {
  if (seed) {
    point.x = point.originX;
    point.y = point.originY;
  }

  point.shiftFromX = point.x;
  point.shiftFromY = point.y;
  point.shiftToX = point.originX - 50 + Math.random() * 100;
  point.shiftToY = point.originY - 50 + Math.random() * 100;
  point.shiftDuration = 1000 + Math.random() * 1000;
  point.shiftStart = seed ? now - Math.random() * point.shiftDuration : now;
}

function drawNetwork(context, points, target) {
  for (const point of points) {
    const distance = Math.abs(getDistance(target, point));

    if (distance < 1000) {
      point.active = 0.3;
      point.circleActive = 0.6;
    } else if (distance < 25000) {
      point.active = 0.1;
      point.circleActive = 0.3;
    } else if (distance < 50000) {
      point.active = 0.02;
      point.circleActive = 0.1;
    } else {
      point.active = 0;
      point.circleActive = 0;
    }

    drawLines(context, point);
    drawCircle(context, point);
  }
}

function drawLines(context, point) {
  if (!point.active) {
    return;
  }

  for (const closestPoint of point.closest) {
    if (!closestPoint) {
      continue;
    }

    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(closestPoint.x, closestPoint.y);
    context.strokeStyle = `rgba(255, 255, 255, ${point.active})`;
    context.stroke();
  }
}

function drawCircle(context, point) {
  if (!point.circleActive) {
    return;
  }

  context.beginPath();
  context.arc(point.x, point.y, point.radius, 0, Math.PI * 2, false);
  context.fillStyle = `rgba(255, 255, 255, ${point.circleActive})`;
  context.fill();
}

function getDistance(pointA, pointB) {
  return Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2);
}

function easeInOutCirc(value) {
  if (value < 0.5) {
    return (1 - Math.sqrt(1 - Math.pow(2 * value, 2))) / 2;
  }

  return (Math.sqrt(1 - Math.pow(-2 * value + 2, 2)) + 1) / 2;
}

function addMediaQueryListener(query, handler) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", handler);
    return;
  }

  query.addListener(handler);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
