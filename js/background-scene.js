"use strict";

(() => {
  const backgroundSceneMarkup = `
    <div class="ambient ambient--left"></div>
    <div class="ambient ambient--center"></div>
    <div class="ambient ambient--right"></div>

    <div class="city">
      <div class="horizon"></div>
      <div class="road road--1"></div>
      <div class="road road--2"></div>
      <div class="road road--3"></div>
      <div class="road road--4"></div>

      <span class="building building--1"></span>
      <span class="building building--2"></span>
      <span class="building building--3"></span>
      <span class="building building--4"></span>
      <span class="building building--5"></span>
      <span class="building building--6"></span>
      <span class="building building--7"></span>
      <span class="building building--8"></span>

      <span class="light-cluster light-cluster--1"></span>
      <span class="light-cluster light-cluster--2"></span>
      <span class="light-cluster light-cluster--3"></span>
      <span class="light-cluster light-cluster--4"></span>
    </div>

    <canvas class="network" data-network-canvas aria-hidden="true"></canvas>
  `;

  window.renderBackgroundScene = (container) => {
    if (!container || container.dataset.sceneReady === "true") {
      return;
    }

    container.innerHTML = backgroundSceneMarkup.trim();
    container.dataset.sceneReady = "true";
  };
})();
