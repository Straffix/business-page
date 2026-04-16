"use strict";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("has-js");

  const backgroundScene = document.querySelector("[data-background-scene]");
  if (!backgroundScene) {
    return;
  }

  if (typeof window.renderBackgroundScene === "function") {
    window.renderBackgroundScene(backgroundScene);
  }

  initNetworkCanvas(backgroundScene);
});

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
