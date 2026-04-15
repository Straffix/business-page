document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealDelay = prefersReducedMotion ? 150 : 1650;

  const revealSite = () => {
    body.classList.add("is-revealed");

    window.setTimeout(() => {
      body.classList.remove("is-intro-lock");
    }, prefersReducedMotion ? 0 : 450);
  };

  window.setTimeout(revealSite, revealDelay);

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-scroll-target");
      const target = targetId ? document.getElementById(targetId) : null;

      target?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  document.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("pointermove", (event) => {
      const bounds = tile.getBoundingClientRect();

      tile.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      tile.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    });

    tile.addEventListener("pointerleave", () => {
      tile.style.removeProperty("--spot-x");
      tile.style.removeProperty("--spot-y");
    });
  });

  const canvas = document.querySelector(".network-canvas");

  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.35,
    active: false,
    radius: 180
  };

  const points = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;

  const distanceBetween = (first, second) => {
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return Math.hypot(dx, dy);
  };

  const pointDistanceToPointer = (point) => {
    const dx = point.x - pointer.x;
    const dy = point.y - pointer.y;

    return Math.hypot(dx, dy);
  };

  const createPoints = () => {
    const total = Math.min(68, Math.max(18, Math.round((width * height) / 52000)));

    points.length = 0;

    for (let index = 0; index < total; index += 1) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.5 + 0.6
      });
    }
  };

  const drawLine = (from, to, color, lineWidth = 1) => {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.lineWidth = lineWidth;
    context.strokeStyle = color;
    context.stroke();
  };

  const drawDot = (x, y, size, color) => {
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  };

  const render = () => {
    context.clearRect(0, 0, width, height);

    if (!prefersReducedMotion) {
      points.forEach((point) => {
        point.x += point.vx;
        point.y += point.vy;

        if (point.x < -10 || point.x > width + 10) {
          point.vx *= -1;
        }

        if (point.y < -10 || point.y > height + 10) {
          point.vy *= -1;
        }
      });
    }

    for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
      const firstPoint = points[firstIndex];

      for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
        const secondPoint = points[secondIndex];
        const distance = distanceBetween(firstPoint, secondPoint);
        const activeZone =
          pointer.active &&
          (pointDistanceToPointer(firstPoint) < pointer.radius ||
            pointDistanceToPointer(secondPoint) < pointer.radius);
        const threshold = activeZone ? 165 : 82;

        if (distance < threshold) {
          const alpha = activeZone
            ? 0.28 * (1 - distance / threshold)
            : 0.08 * (1 - distance / threshold);

          drawLine(
            firstPoint,
            secondPoint,
            activeZone ? `rgba(255, 255, 255, ${alpha})` : `rgba(119, 170, 196, ${alpha})`
          );
        }
      }
    }

    const nearbyPoints = [];

    points.forEach((point) => {
      const distance = pointDistanceToPointer(point);
      const nearCursor = pointer.active && distance < pointer.radius;

      if (nearCursor) {
        nearbyPoints.push(point);
      }

      drawDot(
        point.x,
        point.y,
        nearCursor ? point.size + 0.8 : point.size,
        nearCursor ? "rgba(255, 255, 255, 0.82)" : "rgba(181, 200, 214, 0.28)"
      );
    });

    if (pointer.active) {
      nearbyPoints.slice(0, 10).forEach((point) => {
        const distance = pointDistanceToPointer(point);
        const alpha = 0.36 * (1 - distance / pointer.radius);

        drawLine(pointer, point, `rgba(255, 255, 255, ${alpha})`, 1.1);
      });

      drawDot(pointer.x, pointer.y, 2.2, "rgba(255, 255, 255, 0.88)");
    }
  };

  const resizeCanvas = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    root.style.setProperty("--cursor-global-x", `${pointer.x}px`);
    root.style.setProperty("--cursor-global-y", `${pointer.y}px`);

    createPoints();
    render();
  };

  const updatePointer = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;

    body.classList.add("has-pointer");
    root.style.setProperty("--cursor-global-x", `${pointer.x}px`);
    root.style.setProperty("--cursor-global-y", `${pointer.y}px`);

    if (prefersReducedMotion) {
      render();
    }
  };

  const handlePointerExit = (event) => {
    if (event.relatedTarget) {
      return;
    }

    pointer.active = false;
    body.classList.remove("has-pointer");

    if (prefersReducedMotion) {
      render();
    }
  };

  const animate = () => {
    render();
    animationFrame = window.requestAnimationFrame(animate);
  };

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerdown", updatePointer, { passive: true });
  window.addEventListener("mouseout", handlePointerExit);

  resizeCanvas();

  if (!prefersReducedMotion) {
    animationFrame = window.requestAnimationFrame(animate);
  }

  window.addEventListener("beforeunload", () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  });
});
