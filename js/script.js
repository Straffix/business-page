'use strict'

document.addEventListener('DOMContentLoaded', () => {
	document.documentElement.classList.add('has-js')

	initTaglineRotator()
	initSiteIntro()
	initProjectSliders()
	initExpandingPanels()
	initContactPanel()
	initThemeSwitcherLatest()

	const backgroundScene = document.querySelector('[data-background-scene]')
	if (!backgroundScene) {
		return
	}

	if (typeof window.renderBackgroundScene === 'function') {
		window.renderBackgroundScene(backgroundScene)
	}

	initNetworkCanvas(backgroundScene)
})

function initTaglineRotator() {
	const tagline = document.querySelector('[data-tagline-rotator]')
	const taglineText = tagline ? tagline.querySelector('[data-tagline-text]') : null

	if (!tagline || !taglineText) {
		return
	}

	const phrases = String(tagline.dataset.taglinePhrases || '')
		.split('|')
		.map(phrase => phrase.trim())
		.filter(Boolean)

	if (!phrases.length) {
		return
	}

	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	let phraseIndex = 0
	let charIndex = 0
	let isDeleting = false
	let timerId = 0
	let started = false
	let introObserver = null

	// const writeDelay = 62
	// const deleteDelay = 18
	// const phrasePause = 420
	// const resetPause = 120

	const writeDelay = 50
	const deleteDelay = 18
	const phrasePause = 2500
	const resetPause = 120

	const setPhrase = value => {
		taglineText.textContent = value
		tagline.setAttribute('aria-label', value)
	}

	const clearTimer = () => {
		if (timerId) {
			window.clearTimeout(timerId)
			timerId = 0
		}
	}

	const renderStaticPhrase = () => {
		clearTimer()
		if (introObserver) {
			introObserver.disconnect()
			introObserver = null
		}

		started = false
		phraseIndex = 0
		charIndex = 0
		isDeleting = false
		setPhrase(phrases[0])
	}

	const step = () => {
		const currentPhrase = phrases[phraseIndex]

		if (!isDeleting) {
			charIndex += 1
			setPhrase(currentPhrase.slice(0, charIndex))

			if (charIndex >= currentPhrase.length) {
				isDeleting = true
				timerId = window.setTimeout(step, phrasePause)
				return
			}

			timerId = window.setTimeout(step, writeDelay)
			return
		}

		charIndex -= 1
		setPhrase(currentPhrase.slice(0, Math.max(charIndex, 0)))

		if (charIndex <= 0) {
			isDeleting = false
			phraseIndex = (phraseIndex + 1) % phrases.length
			timerId = window.setTimeout(step, resetPause)
			return
		}

		timerId = window.setTimeout(step, deleteDelay)
	}

	const start = () => {
		if (started || reduceMotionQuery.matches) {
			return
		}

		started = true
		clearTimer()
		setPhrase('')
		phraseIndex = 0
		charIndex = 0
		isDeleting = false
		timerId = window.setTimeout(step, 260)
	}

	const startWhenIntroIsDone = () => {
		if (reduceMotionQuery.matches) {
			renderStaticPhrase()
			return true
		}

		if (document.documentElement.classList.contains('intro-complete')) {
			start()
			return true
		}

		return false
	}

	if (!startWhenIntroIsDone()) {
		introObserver = new MutationObserver(() => {
			if (startWhenIntroIsDone() && introObserver) {
				introObserver.disconnect()
				introObserver = null
			}
		})

		introObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		})
	}

	addMediaQueryListener(reduceMotionQuery, () => {
		if (reduceMotionQuery.matches) {
			renderStaticPhrase()
			return
		}

		if (document.documentElement.classList.contains('intro-complete')) {
			start()
		}
	})
}

function initThemeSwitcher() {
	const page = document.querySelector('.page')
	const toggle = document.querySelector('[data-theme-toggle]')
	if (!page || !toggle) {
		return
	}

	const baseLayer = document.createElement('div')
	const incomingLayer = document.createElement('div')
	baseLayer.className = 'page-theme-layer page-theme-layer--base'
	incomingLayer.className = 'page-theme-layer page-theme-layer--incoming'
	baseLayer.setAttribute('aria-hidden', 'true')
	incomingLayer.setAttribute('aria-hidden', 'true')
	page.insertBefore(incomingLayer, page.firstChild)
	page.insertBefore(baseLayer, incomingLayer)

	const storageKey = 'folio-page-theme-v2'
	const themes = [
		{
			id: 'purple-official',
			label: 'Purple official',
			accent: '#b6628f',
		},
		{
			id: 'blue',
			label: 'Blue',
			accent: '#59a5ef',
		},
		{
			id: 'green',
			label: 'Green',
			accent: '#61c784',
		},
		{
			id: 'black',
			label: 'Black',
			accent: '#d8dce7',
		},
	]

	const viewportThemes = [
		{
			size: '2560x1440',
			query: window.matchMedia('(min-width: 1440px)'),
		},
		{
			size: '1920x1080',
			query: window.matchMedia('(min-width: 980px)'),
		},
		{
			size: '1280x800',
			query: window.matchMedia('(min-width: 621px)'),
		},
		{
			size: '768x1024',
			query: null,
		},
	]

	let currentTheme = getStoredTheme()

	const applyTheme = (themeId, persist = true) => {
		const theme = themes.find(entry => entry.id === themeId) || themes[0]
		const backgroundSize = getBackgroundSize()
		const variantSuffix = theme.id === 'purple-official' ? '' : ` ${theme.id}`
		const imagePath = `img/bg/bg_${backgroundSize}${variantSuffix}.jpg`

		currentTheme = theme.id
		page.dataset.pageTheme = theme.id
		page.style.setProperty('--page-bg-image', `url("${imagePath}")`)
		toggle.dataset.theme = theme.id
		toggle.style.setProperty('--theme-switcher-accent', theme.accent)
		toggle.setAttribute('aria-label', `Zmień wariant tła strony. Aktualnie: ${theme.label}`)
		toggle.setAttribute('title', `Tło: ${theme.label}. Kliknij, aby przełączyć.`)

		toggle.setAttribute('aria-label', `Zmien wariant tla strony. Aktualnie: ${theme.label}`)
		toggle.setAttribute('title', `Tlo: ${theme.label}. Kliknij, aby przelaczyc.`)

		if (!persist) {
			return
		}

		try {
			window.localStorage.setItem(storageKey, theme.id)
		} catch (error) {}
	}

	const handleToggle = () => {
		const activeIndex = themes.findIndex(theme => theme.id === currentTheme)
		const nextTheme = themes[(activeIndex + 1 + themes.length) % themes.length]
		applyTheme(nextTheme.id)
	}

	toggle.addEventListener('click', handleToggle)

	for (const viewportTheme of viewportThemes) {
		if (!viewportTheme.query) {
			continue
		}

		addMediaQueryListener(viewportTheme.query, () => {
			applyTheme(currentTheme, false)
		})
	}

	applyTheme(currentTheme, false)

	function getStoredTheme() {
		try {
			const storedTheme = window.localStorage.getItem(storageKey)
			if (themes.some(theme => theme.id === storedTheme)) {
				return storedTheme
			}
		} catch (error) {}

		return themes[0].id
	}

	function getBackgroundSize() {
		const activeViewport = viewportThemes.find(viewportTheme => viewportTheme.query && viewportTheme.query.matches)
		return activeViewport ? activeViewport.size : viewportThemes[viewportThemes.length - 1].size
	}
}

function initThemeSwitcher() {
	const page = document.querySelector('.page')
	const toggle = document.querySelector('[data-theme-toggle]')
	if (!page || !toggle) {
		return
	}

	const storageKey = 'folio-page-theme-v2'
	const themes = [
		{ id: 'purple-official', label: 'Purple official', accent: '#b6628f' },
		{ id: 'blue', label: 'Blue', accent: '#59a5ef' },
		{ id: 'green', label: 'Green', accent: '#61c784' },
		{ id: 'black', label: 'Black', accent: '#d8dce7' },
	]
	const viewportThemes = [
		{ size: '2560x1440', query: window.matchMedia('(min-width: 1440px)') },
		{ size: '1920x1080', query: window.matchMedia('(min-width: 980px)') },
		{ size: '1280x800', query: window.matchMedia('(min-width: 621px)') },
		{ size: '768x1024', query: null },
	]

	let currentTheme = getStoredTheme()
	let themeRequestId = 0
	let activeLayerImage = ''
	let layerTransitionTimerId = 0

	const clearLayerTransition = () => {
		if (!layerTransitionTimerId) {
			return
		}

		window.clearTimeout(layerTransitionTimerId)
		layerTransitionTimerId = 0
	}

	const hideIncomingLayer = () => {
		incomingLayer.classList.remove('is-visible')
		incomingLayer.style.backgroundImage = ''
	}

	const applyTheme = (themeId, persist = true) => {
		const theme = themes.find(entry => entry.id === themeId) || themes[0]
		const backgroundSize = getBackgroundSize()
		const variantSuffix = theme.id === 'purple-official' ? '' : ` ${theme.id}`
		const imageUrl = new URL(`img/bg/bg_${backgroundSize}${variantSuffix}.jpg`, window.location.href).href
		const requestId = themeRequestId + 1

		currentTheme = theme.id
		themeRequestId = requestId
		toggle.dataset.theme = theme.id
		toggle.style.setProperty('--theme-switcher-accent', theme.accent)
		toggle.setAttribute('aria-label', `Zmien wariant tla strony. Aktualnie: ${theme.label}`)
		toggle.setAttribute('title', `Tlo: ${theme.label}. Kliknij, aby przelaczyc.`)

		const previewImage = new Image()
		previewImage.onload = () => {
			if (requestId !== themeRequestId) {
				return
			}

			const backgroundValue = `url("${imageUrl}")`
			page.dataset.pageTheme = theme.id
			page.style.setProperty('--page-bg-image', backgroundValue)
			page.style.backgroundImage = backgroundValue

			if (!activeLayerImage) {
				baseLayer.style.backgroundImage = backgroundValue
				activeLayerImage = backgroundValue
			} else if (activeLayerImage !== backgroundValue) {
				incomingLayer.classList.remove('is-visible')
				incomingLayer.style.backgroundImage = backgroundValue
				void incomingLayer.offsetWidth
				incomingLayer.classList.add('is-visible')

				window.setTimeout(() => {
					if (requestId !== themeRequestId) {
						return
					}

					baseLayer.style.backgroundImage = backgroundValue
					activeLayerImage = backgroundValue
					incomingLayer.classList.remove('is-visible')
				}, 820)
			}

			if (!persist) {
				return
			}

			try {
				window.localStorage.setItem(storageKey, theme.id)
			} catch (error) {}
		}

		previewImage.onerror = () => {
			if (requestId !== themeRequestId) {
				return
			}

			if (theme.id !== themes[0].id) {
				applyTheme(themes[0].id, persist)
			}
		}

		previewImage.src = imageUrl
	}

	toggle.addEventListener('click', () => {
		const activeIndex = themes.findIndex(theme => theme.id === currentTheme)
		const nextTheme = themes[(activeIndex + 1 + themes.length) % themes.length]
		applyTheme(nextTheme.id)
	})

	for (const viewportTheme of viewportThemes) {
		if (!viewportTheme.query) {
			continue
		}

		addMediaQueryListener(viewportTheme.query, () => {
			applyTheme(currentTheme, false)
		})
	}

	applyTheme(currentTheme, false)

	function getStoredTheme() {
		try {
			const storedTheme = window.localStorage.getItem(storageKey)
			if (themes.some(theme => theme.id === storedTheme)) {
				return storedTheme
			}
		} catch (error) {}

		return themes[0].id
	}

	function getBackgroundSize() {
		const activeViewport = viewportThemes.find(viewportTheme => viewportTheme.query && viewportTheme.query.matches)
		return activeViewport ? activeViewport.size : viewportThemes[viewportThemes.length - 1].size
	}
}

function initSiteIntro() {
	const intro = document.querySelector('[data-site-intro]')
	const introBrand = intro ? intro.querySelector('[data-site-intro-brand]') : null
	const targetBrand = document.querySelector('.brand')

	if (!intro || !introBrand || !targetBrand) {
		document.documentElement.classList.add('intro-complete')
		return
	}

	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	let isFinished = false
	let fallbackTimerId = 0
	let resizeTimerId = 0
	let startQueued = false

	const finishIntro = () => {
		if (isFinished) {
			return
		}

		isFinished = true
		window.clearTimeout(fallbackTimerId)
		window.clearTimeout(resizeTimerId)
		window.removeEventListener('resize', scheduleMotionSync)
		document.documentElement.classList.add('intro-complete')
		intro.classList.add('is-done')

		window.setTimeout(() => {
			intro.setAttribute('hidden', '')
		}, 280)
	}

	if (reduceMotionQuery.matches) {
		finishIntro()
		return
	}

	const syncIntroMotion = () => {
		const introRect = introBrand.getBoundingClientRect()
		const targetRect = targetBrand.getBoundingClientRect()
		const scale = targetRect.width / Math.max(introRect.width, 1)
		const translateX = targetRect.left + targetRect.width / 2 - (introRect.left + introRect.width / 2)
		const translateY = targetRect.top + targetRect.height / 2 - (introRect.top + introRect.height / 2)

		introBrand.style.setProperty('--intro-move-x', `${translateX}px`)
		introBrand.style.setProperty('--intro-move-y', `${translateY}px`)
		introBrand.style.setProperty('--intro-scale', `${scale}`)
	}

	function scheduleMotionSync() {
		if (intro.classList.contains('is-flying')) {
			return
		}

		window.clearTimeout(resizeTimerId)
		resizeTimerId = window.setTimeout(syncIntroMotion, 120)
	}

	const queueIntroStart = () => {
		if (startQueued || isFinished) {
			return
		}

		startQueued = true
		window.requestAnimationFrame(startIntro)
	}

	const startIntro = () => {
		if (isFinished) {
			return
		}

		syncIntroMotion()
		intro.classList.add('is-ready')

		window.setTimeout(() => {
			if (isFinished) {
				return
			}

			syncIntroMotion()
			intro.classList.add('is-flying')
			fallbackTimerId = window.setTimeout(finishIntro, 900)
		}, 850)
	}

	introBrand.addEventListener('transitionend', event => {
		if (event.propertyName === 'transform' && intro.classList.contains('is-flying')) {
			finishIntro()
		}
	})
	window.addEventListener('resize', scheduleMotionSync)

	if (document.fonts && typeof document.fonts.ready === 'object') {
		document.fonts.ready
			.then(() => {
				if (!isFinished && !intro.classList.contains('is-flying')) {
					syncIntroMotion()
				}
			})
			.catch(() => {})
	}

	if (document.fonts && typeof document.fonts.ready === 'object') {
		Promise.race([
			document.fonts.ready.catch(() => undefined),
			new Promise(resolve => window.setTimeout(resolve, 700)),
		]).then(() => {
			queueIntroStart()
		})
	} else {
		queueIntroStart()
	}
}

function initProjectSliders() {
	const sliders = document.querySelectorAll('[data-project-slider]')
	for (const slider of sliders) {
		initProjectSlider(slider)
	}
}

function initProjectSlider(slider) {
	const slides = Array.from(slider.querySelectorAll('[data-project-slide]'))
	if (slides.length < 2) {
		return
	}

	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	const interval = Number(slider.dataset.sliderInterval) || 3200
	const preloadDelay = Math.max(interval - 1200, 1000)
	let activeIndex = Math.max(
		slides.findIndex(slide => slide.classList.contains('is-active')),
		0,
	)
	let timerId = 0
	let preloadTimerId = 0

	const loadSlideMedia = slide => {
		const lazyImages = slide.querySelectorAll('img[data-src]')

		for (const image of lazyImages) {
			image.src = image.dataset.src
			image.removeAttribute('data-src')
		}
	}

	const preloadNextSlide = () => {
		window.clearTimeout(preloadTimerId)
		if (reduceMotionQuery.matches) {
			return
		}

		preloadTimerId = window.setTimeout(() => {
			loadSlideMedia(slides[(activeIndex + 1) % slides.length])
		}, preloadDelay)
	}

	const showSlide = nextIndex => {
		slides[activeIndex].classList.remove('is-active')
		slides[activeIndex].setAttribute('aria-hidden', 'true')
		slides[activeIndex].setAttribute('tabindex', '-1')

		activeIndex = (nextIndex + slides.length) % slides.length
		const activeSlide = slides[activeIndex]

		loadSlideMedia(activeSlide)
		activeSlide.classList.add('is-active')
		activeSlide.removeAttribute('aria-hidden')
		activeSlide.removeAttribute('tabindex')
		slider.style.setProperty('--tile-bg', activeSlide.dataset.tileBg || '')
		slider.style.setProperty('--tile-hover-bg', activeSlide.dataset.tileHoverBg || '')
		preloadNextSlide()
	}

	const pause = () => {
		if (timerId) {
			window.clearInterval(timerId)
			timerId = 0
		}
		window.clearTimeout(preloadTimerId)
		slider.classList.add('is-paused')
	}

	const start = () => {
		if (timerId || reduceMotionQuery.matches) {
			return
		}
		slider.classList.remove('is-paused')
		timerId = window.setInterval(() => showSlide(activeIndex + 1), interval)
	}

	slider.addEventListener('mouseenter', pause)
	slider.addEventListener('mouseleave', start)
	slider.addEventListener('focusin', pause)
	slider.addEventListener('focusout', start)
	addMediaQueryListener(reduceMotionQuery, () => {
		if (reduceMotionQuery.matches) {
			pause()
			return
		}
		start()
	})

	showSlide(activeIndex)
	if (reduceMotionQuery.matches) {
		pause()
		return
	}
	start()
}

function initExpandingPanels() {
	const triggers = document.querySelectorAll('[data-expand-trigger]')
	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	const focusableSelector =
		'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const panelHistoryStateKey = 'tilePanelId'
	const panelHistoryStateMarker = 'lisieckidev-tile-panel'

	const getHistoryPanelId = state => {
		if (!state || typeof state !== 'object') {
			return null
		}

		return state.__tilePanelMarker === panelHistoryStateMarker ? state[panelHistoryStateKey] || null : null
	}

	const createPanelHistoryState = panelId => ({
		__tilePanelMarker: panelHistoryStateMarker,
		[panelHistoryStateKey]: panelId,
	})

	for (const trigger of triggers) {
		const panelId = trigger.dataset.expandTarget
		const panel = panelId ? document.getElementById(panelId) : null
		const closeButton = panel ? panel.querySelector('[data-expand-close]') : null

		if (!panel || !closeButton) {
			continue
		}

		initExpandingPanel(trigger, panel, closeButton, reduceMotionQuery, focusableSelector, {
			getHistoryPanelId,
			createPanelHistoryState,
		})
	}
}

function initExpandingPanel(trigger, panel, closeButton, reduceMotionQuery, focusableSelector, historyApi) {
	const instantPanelQuery = panel.id === 'contact-panel' ? window.matchMedia('(max-width: 640px)') : null
	let isOpen = false
	let closeTimerId = 0
	let focusTimerId = 0
	let shouldReturnFocusToTrigger = false
	let isHashFallbackActive = false
	let swipeCloseDelta = 0
	let swipeResetTimerId = 0

	const shouldSkipPanelMotion = () =>
		reduceMotionQuery.matches || Boolean(instantPanelQuery && instantPanelQuery.matches)

	const syncPanelStart = () => {
		const rect = trigger.getBoundingClientRect()
		const triggerStyle = window.getComputedStyle(trigger)
		const triggerBackground = triggerStyle.backgroundColor

		panel.style.setProperty('--tile-panel-x', `${rect.left}px`)
		panel.style.setProperty('--tile-panel-y', `${rect.top}px`)
		panel.style.setProperty('--tile-panel-width', `${Math.max(rect.width, 1)}px`)
		panel.style.setProperty('--tile-panel-height', `${Math.max(rect.height, 1)}px`)
		panel.style.setProperty('--tile-panel-bg-start', triggerBackground)
	}

	const focusCloseButton = () => {
		closeButton.focus({ preventScroll: true })
	}

	const getHashPanelId = () => {
		const hashValue = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ''
		return hashValue || null
	}

	const resetSwipeCloseGesture = () => {
		swipeCloseDelta = 0
		window.clearTimeout(swipeResetTimerId)
		swipeResetTimerId = 0
	}

	const scheduleSwipeReset = () => {
		window.clearTimeout(swipeResetTimerId)
		swipeResetTimerId = window.setTimeout(resetSwipeCloseGesture, 180)
	}

	const getFocusableElements = () =>
		Array.from(panel.querySelectorAll(focusableSelector)).filter(
			element => element.getClientRects().length > 0 && !element.closest('[inert]'),
		)

	const syncHistoryOnOpen = () => {
		const activeHashPanelId = getHashPanelId()
		if (activeHashPanelId === panel.id) {
			return
		}

		isHashFallbackActive = true

		try {
			const nextUrl = `${window.location.pathname}${window.location.search}#${encodeURIComponent(panel.id)}`
			window.history.pushState(historyApi.createPanelHistoryState(panel.id), '', nextUrl)
			return
		} catch (error) {}

		window.location.hash = encodeURIComponent(panel.id)
	}

	const openPanel = (openedWithKeyboard = false, syncHistory = true) => {
		if (isOpen) {
			return
		}

		isOpen = true
		shouldReturnFocusToTrigger = openedWithKeyboard
		window.clearTimeout(closeTimerId)
		window.clearTimeout(focusTimerId)
		syncPanelStart()

		panel.hidden = false
		panel.setAttribute('aria-hidden', 'false')
		panel.classList.remove('is-closing')
		panel.classList.remove('is-open')
		panel.classList.add('is-visible')
		panel.dispatchEvent(new CustomEvent('tilepanel:open'))
		trigger.setAttribute('aria-expanded', 'true')
		document.documentElement.classList.add('tile-panel-active')
		document.body.classList.add('tile-panel-active')

		if (syncHistory) {
			syncHistoryOnOpen()
		}

		if (shouldSkipPanelMotion()) {
			panel.classList.add('is-open')
			if (openedWithKeyboard) {
				focusCloseButton()
			}
			return
		}

		panel.getBoundingClientRect()
		window.requestAnimationFrame(() => {
			panel.classList.add('is-open')
		})

		if (openedWithKeyboard) {
			focusTimerId = window.setTimeout(focusCloseButton, 720)
		}
	}

	const finishClose = () => {
		if (isOpen) {
			return
		}

		window.clearTimeout(closeTimerId)
		window.clearTimeout(focusTimerId)
		resetSwipeCloseGesture()
		isHashFallbackActive = false
		panel.classList.remove('is-closing')
		panel.classList.remove('is-visible')
		panel.hidden = true
		panel.setAttribute('aria-hidden', 'true')
		panel.dispatchEvent(new CustomEvent('tilepanel:closed'))
		document.documentElement.classList.remove('tile-panel-active')
		document.body.classList.remove('tile-panel-active')

		if (shouldReturnFocusToTrigger) {
			trigger.focus({ preventScroll: true })
		}
	}

	const startClosePanel = () => {
		if (!isOpen) {
			return
		}

		isOpen = false
		window.clearTimeout(focusTimerId)
		syncPanelStart()
		panel.dispatchEvent(new CustomEvent('tilepanel:close-start'))
		trigger.setAttribute('aria-expanded', 'false')
		panel.classList.add('is-closing')
		panel.classList.remove('is-open')

		if (shouldSkipPanelMotion()) {
			finishClose()
			return
		}

		closeTimerId = window.setTimeout(finishClose, 900)
	}

	const closePanel = (syncHistory = true) => {
		if (!isOpen) {
			return
		}

		const activeHistoryPanelId = historyApi.getHistoryPanelId(window.history.state)
		const activeHashPanelId = getHashPanelId()
		if (syncHistory && (activeHistoryPanelId === panel.id || activeHashPanelId === panel.id)) {
			window.history.back()
			return
		}

		startClosePanel()
	}

	const handleWheelSwipeClose = event => {
		if (!isOpen || event.ctrlKey) {
			return
		}

		const horizontalDelta = event.deltaX
		const verticalDelta = event.deltaY
		const isStrongHorizontalSwipe =
			Math.abs(horizontalDelta) >= 8 && Math.abs(horizontalDelta) > Math.abs(verticalDelta) * 1.15

		if (!isStrongHorizontalSwipe) {
			if (Math.abs(verticalDelta) > Math.abs(horizontalDelta)) {
				resetSwipeCloseGesture()
			}
			return
		}

		event.preventDefault()
		swipeCloseDelta += Math.abs(horizontalDelta)
		scheduleSwipeReset()

		if (swipeCloseDelta >= 140) {
			resetSwipeCloseGesture()
			closePanel()
		}
	}

	trigger.addEventListener('click', () => {
		openPanel(false)
	})
	trigger.addEventListener('keydown', event => {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return
		}

		event.preventDefault()
		openPanel(true)
	})

	closeButton.addEventListener('click', closePanel)
	window.addEventListener('wheel', handleWheelSwipeClose, { passive: false, capture: true })
	panel.addEventListener('transitionend', event => {
		if (event.target === panel && !isOpen && (event.propertyName === 'width' || event.propertyName === 'height')) {
			finishClose()
		}
	})

	window.addEventListener('popstate', event => {
		const activeHistoryPanelId = historyApi.getHistoryPanelId(event.state)

		if (activeHistoryPanelId === panel.id) {
			if (!isOpen) {
				openPanel(false, false)
			}
			return
		}

		if (isOpen) {
			closePanel(false)
		}
	})

	window.addEventListener('hashchange', () => {
		const activeHashPanelId = getHashPanelId()

		if (activeHashPanelId === panel.id) {
			if (!isOpen) {
				openPanel(false, false)
			}
			return
		}

		if (isOpen) {
			closePanel(false)
		}
	})

	document.addEventListener('keydown', event => {
		if (!isOpen) {
			return
		}

		if (event.key === 'Escape') {
			closePanel()
			return
		}

		if (event.key !== 'Tab') {
			return
		}

		const focusableElements = getFocusableElements()
		if (!focusableElements.length) {
			event.preventDefault()
			panel.focus({ preventScroll: true })
			return
		}

		const firstElement = focusableElements[0]
		const lastElement = focusableElements[focusableElements.length - 1]

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault()
			lastElement.focus({ preventScroll: true })
			return
		}

		if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault()
			firstElement.focus({ preventScroll: true })
		}
	})

	if (historyApi.getHistoryPanelId(window.history.state) === panel.id || getHashPanelId() === panel.id) {
		openPanel(false, false)
	}
}

function initContactPanel() {
	const panel = document.getElementById('contact-panel')
	if (!panel) {
		return
	}

	const focusField = panel.querySelector('[data-contact-focus]')
	const form = panel.querySelector('[data-contact-form]')
	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	const mobileContactQuery = window.matchMedia('(max-width: 640px)')
	let focusTimerId = 0

	const focusContactField = () => {
		window.clearTimeout(focusTimerId)

		if (!focusField || mobileContactQuery.matches) {
			return
		}

		const focusDelay = reduceMotionQuery.matches ? 0 : 620
		focusTimerId = window.setTimeout(() => {
			focusField.focus({ preventScroll: true })
		}, focusDelay)
	}

	panel.addEventListener('tilepanel:open', focusContactField)

	panel.addEventListener('tilepanel:closed', () => {
		window.clearTimeout(focusTimerId)
	})

	if (!form) {
		return
	}

	const fileInput = form.querySelector('input[name="attachments"]')
	const fileLabel = form.querySelector('[data-file-label]')

	if (fileInput && fileLabel) {
		fileInput.addEventListener('change', () => {
			const count = fileInput.files ? fileInput.files.length : 0
			fileLabel.textContent = count === 0 ? 'Dołącz grafiki, brief albo projekt' : `Wybrane pliki: ${count}`
		})
	}

	form.addEventListener('submit', event => {
		event.preventDefault()

		if (!form.reportValidity()) {
			return
		}

		const formData = new FormData(form)
		const name = String(formData.get('name') || '').trim()
		const email = String(formData.get('email') || '').trim()
		const subject = String(formData.get('subject') || '').trim()
		const message = String(formData.get('message') || '').trim()
		const attachments = fileInput && fileInput.files ? Array.from(fileInput.files) : []
		const targetEmail = form.dataset.contactMail || 'kontakt@lisieckidev.pl'
		const mailSubject = subject || `Zapytanie ze strony od ${name}`
		const bodyLines = [`Imię / firma: ${name}`, `Email: ${email}`, '', 'Wiadomość:', message]

		if (attachments.length > 0) {
			bodyLines.push(
				'',
				'Pliki wybrane w formularzu:',
				...attachments.map(file => `- ${file.name}`),
				'',
				'Uwaga: formularz otwiera klienta poczty. Dołącz wybrane pliki w wiadomości email.',
			)
		}

		window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(
			bodyLines.join('\n'),
		)}`
	})
}

function initNetworkCanvas(backgroundScene) {
	const canvas = backgroundScene.querySelector('[data-network-canvas]')
	if (!canvas) {
		return
	}

	const context = canvas.getContext('2d')
	if (!context) {
		return
	}

	const tiles = document.querySelector('.tiles')
	const strategicTile = document.querySelector('.tile--strategic')
	const root = document.documentElement
	const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	const desktopQuery = window.matchMedia('(min-width: 801px)')

	const target = { x: 0, y: 0 }
	let width = 0
	let height = 0
	let networkLimitY = 0
	let networkDrawHeight = 0
	let strategicRegion = null
	let scale = 1
	let animationFrameId = 0
	let animateNetwork = true
	let isEnabled = false
	let sceneRect = backgroundScene.getBoundingClientRect()
	let points = []

	const syncEnabledState = () => {
		const shouldEnable =
			desktopQuery.matches && !reduceMotionQuery.matches && !root.classList.contains('tile-panel-active')
		if (shouldEnable === isEnabled) {
			if (isEnabled) {
				resizeCanvas()
			} else {
				clearCanvas()
			}
			return
		}

		isEnabled = shouldEnable
		backgroundScene.classList.toggle('background--network-active', isEnabled)

		if (isEnabled) {
			resizeCanvas()
			startAnimation()
			return
		}

		stopAnimation()
		clearCanvas()
	}

	const resizeCanvas = () => {
		sceneRect = backgroundScene.getBoundingClientRect()
		width = Math.max(Math.round(sceneRect.width), 1)
		height = Math.max(Math.round(sceneRect.height), 1)
		networkLimitY = getNetworkLimitY()
		strategicRegion = getStrategicRegion()
		networkDrawHeight = getNetworkDrawHeight()
		scale = Math.min(window.devicePixelRatio || 1, 2)

		canvas.width = Math.round(width * scale)
		canvas.height = Math.round(height * scale)
		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`

		context.setTransform(scale, 0, 0, scale, 0, 0)
		target.x = width / 2
		target.y = Math.max(networkLimitY / 2, 1)
		points = createPoints(width, Math.max(networkDrawHeight, 1))
	}

	const handleMouseMove = event => {
		if (!isEnabled) {
			return
		}

		const pointerX = event.clientX - sceneRect.left
		const pointerY = event.clientY - sceneRect.top
		const isPointerInUpperArea = pointerY >= 0 && pointerY < networkLimitY
		const isPointerInStrategicArea = isPointInsideRect(pointerX, pointerY, strategicRegion)
		const isPointerInInteractiveArea = isPointerInUpperArea || isPointerInStrategicArea

		backgroundScene.classList.toggle('background--network-muted', !isPointerInInteractiveArea)

		if (!isPointerInInteractiveArea) {
			return
		}

		target.x = pointerX
		target.y = pointerY
	}

	const handleScroll = () => {
		sceneRect = backgroundScene.getBoundingClientRect()
		networkLimitY = getNetworkLimitY()
		strategicRegion = getStrategicRegion()
		networkDrawHeight = getNetworkDrawHeight()
		animateNetwork = window.scrollY <= window.innerHeight
	}

	const handleResize = () => {
		handleScroll()
		if (isEnabled) {
			resizeCanvas()
		}
	}

	const animate = now => {
		if (!isEnabled) {
			animationFrameId = 0
			return
		}

		updatePointShift(points, now)
		context.clearRect(0, 0, width, height)

		if (animateNetwork && hasVisibleNetworkArea()) {
			context.save()
			context.beginPath()
			context.rect(0, 0, width, networkLimitY)
			if (strategicRegion) {
				context.rect(strategicRegion.x, strategicRegion.y, strategicRegion.width, strategicRegion.height)
			}
			context.clip()
			drawNetwork(context, points, target)
			context.restore()
		}

		animationFrameId = window.requestAnimationFrame(animate)
	}

	window.addEventListener('mousemove', handleMouseMove, { passive: true })
	window.addEventListener('resize', handleResize)
	window.addEventListener('scroll', handleScroll, { passive: true })
	addMediaQueryListener(desktopQuery, syncEnabledState)
	addMediaQueryListener(reduceMotionQuery, syncEnabledState)

	const panelStateObserver = new MutationObserver(syncEnabledState)
	panelStateObserver.observe(root, { attributes: true, attributeFilter: ['class'] })

	handleScroll()
	syncEnabledState()

	function startAnimation() {
		if (!animationFrameId) {
			animationFrameId = window.requestAnimationFrame(animate)
		}
	}

	function stopAnimation() {
		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId)
			animationFrameId = 0
		}
	}

	function clearCanvas() {
		context.clearRect(0, 0, width, height)
	}

	function getNetworkLimitY() {
		if (!tiles) {
			return height
		}

		const tilesRect = tiles.getBoundingClientRect()
		return clamp(Math.round(tilesRect.top - sceneRect.top), 0, height)
	}

	function getStrategicRegion() {
		if (!strategicTile) {
			return null
		}

		const strategicRect = strategicTile.getBoundingClientRect()
		const x = clamp(Math.round(strategicRect.left - sceneRect.left), 0, width)
		const y = clamp(Math.round(strategicRect.top - sceneRect.top), 0, height)
		const right = clamp(Math.round(strategicRect.right - sceneRect.left), 0, width)
		const bottom = clamp(Math.round(strategicRect.bottom - sceneRect.top), 0, height)
		const rectWidth = Math.max(right - x, 0)
		const rectHeight = Math.max(bottom - y, 0)

		if (!rectWidth || !rectHeight) {
			return null
		}

		return {
			x,
			y,
			width: rectWidth,
			height: rectHeight,
		}
	}

	function getNetworkDrawHeight() {
		if (!strategicRegion) {
			return networkLimitY
		}

		return Math.max(networkLimitY, strategicRegion.y + strategicRegion.height)
	}

	function hasVisibleNetworkArea() {
		return networkLimitY > 0 || Boolean(strategicRegion)
	}

	function isPointInsideRect(x, y, rect) {
		if (!rect) {
			return false
		}

		return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
	}
}

function createPoints(width, height) {
	const points = []
	const stepX = width / 20
	const stepY = height / 20

	for (let x = 0; x < width; x += stepX) {
		for (let y = 0; y < height; y += stepY) {
			const pointX = x + Math.random() * stepX
			const pointY = y + Math.random() * stepY
			points.push(createPoint(pointX, pointY))
		}
	}

	for (const point of points) {
		point.closest = findClosestPoints(point, points)
	}

	return points
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
	}

	setNextPointShift(point, performance.now(), true)
	return point
}

function findClosestPoints(point, points) {
	const closest = []

	for (const candidate of points) {
		if (candidate === point) {
			continue
		}

		let inserted = false
		for (let index = 0; index < 4; index += 1) {
			if (closest[index] === undefined) {
				closest[index] = candidate
				inserted = true
				break
			}
		}

		if (inserted) {
			continue
		}

		for (let index = 0; index < 4; index += 1) {
			if (getDistance(point, candidate) < getDistance(point, closest[index])) {
				closest[index] = candidate
				break
			}
		}
	}

	return closest
}

function updatePointShift(points, now) {
	for (const point of points) {
		const duration = Math.max(point.shiftDuration, 1)
		const progress = clamp((now - point.shiftStart) / duration, 0, 1)
		const eased = easeInOutCirc(progress)

		point.x = point.shiftFromX + (point.shiftToX - point.shiftFromX) * eased
		point.y = point.shiftFromY + (point.shiftToY - point.shiftFromY) * eased

		if (progress >= 1) {
			setNextPointShift(point, now, false)
		}
	}
}

function setNextPointShift(point, now, seed) {
	if (seed) {
		point.x = point.originX
		point.y = point.originY
	}

	point.shiftFromX = point.x
	point.shiftFromY = point.y
	point.shiftToX = point.originX - 50 + Math.random() * 100
	point.shiftToY = point.originY - 50 + Math.random() * 100
	point.shiftDuration = 1000 + Math.random() * 1000
	point.shiftStart = seed ? now - Math.random() * point.shiftDuration : now
}

function drawNetwork(context, points, target) {
	for (const point of points) {
		const distance = Math.abs(getDistance(target, point))

		if (distance < 1000) {
			point.active = 0.3
			point.circleActive = 0.6
		} else if (distance < 25000) {
			point.active = 0.1
			point.circleActive = 0.3
		} else if (distance < 50000) {
			point.active = 0.02
			point.circleActive = 0.1
		} else {
			point.active = 0
			point.circleActive = 0
		}

		drawLines(context, point)
		drawCircle(context, point)
	}
}

function drawLines(context, point) {
	if (!point.active) {
		return
	}

	for (const closestPoint of point.closest) {
		if (!closestPoint) {
			continue
		}

		context.beginPath()
		context.moveTo(point.x, point.y)
		context.lineTo(closestPoint.x, closestPoint.y)
		context.strokeStyle = `rgba(255, 255, 255, ${point.active})`
		context.stroke()
	}
}

function drawCircle(context, point) {
	if (!point.circleActive) {
		return
	}

	context.beginPath()
	context.arc(point.x, point.y, point.radius, 0, Math.PI * 2, false)
	context.fillStyle = `rgba(255, 255, 255, ${point.circleActive})`
	context.fill()
}

function getDistance(pointA, pointB) {
	return Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
}

function easeInOutCirc(value) {
	if (value < 0.5) {
		return (1 - Math.sqrt(1 - Math.pow(2 * value, 2))) / 2
	}

	return (Math.sqrt(1 - Math.pow(-2 * value + 2, 2)) + 1) / 2
}

function addMediaQueryListener(query, handler) {
	if (typeof query.addEventListener === 'function') {
		query.addEventListener('change', handler)
		return
	}

	query.addListener(handler)
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max)
}

function initThemeSwitcherLatest() {
	const page = document.querySelector('.page')
	const toggle = document.querySelector('[data-theme-toggle]')
	if (!page || !toggle) {
		return
	}

	const backgroundScene = page.querySelector('.background')
	const baseLayer = document.createElement('div')
	const incomingLayer = document.createElement('div')
	baseLayer.className = 'page-theme-layer page-theme-layer--base'
	incomingLayer.className = 'page-theme-layer page-theme-layer--incoming'
	baseLayer.setAttribute('aria-hidden', 'true')
	incomingLayer.setAttribute('aria-hidden', 'true')

	const insertTarget = backgroundScene || page.firstChild
	page.insertBefore(incomingLayer, insertTarget)
	page.insertBefore(baseLayer, incomingLayer)

	const storageKey = 'folio-page-theme-v3'
	const legacyStorageKey = 'folio-page-theme-v2'
	const themes = [
		{ id: 'purple-official', label: 'Purple official', accent: '#b6628f' },
		{ id: 'blue', label: 'Blue', accent: '#59a5ef' },
		{ id: 'green', label: 'Green', accent: '#61c784' },
		{ id: 'black', label: 'Black', accent: '#202122' },
	]
	const viewportThemes = [
		{ size: '2560x1440', query: window.matchMedia('(min-width: 1440px)') },
		{ size: '1920x1080', query: window.matchMedia('(min-width: 980px)') },
		{ size: '1280x800', query: window.matchMedia('(min-width: 621px)') },
		{ size: '768x1024', query: null },
	]

	let currentTheme = getStoredTheme()
	let themeRequestId = 0
	let activeLayerImage = ''
	let layerTransitionTimerId = 0

	const clearLayerTransition = () => {
		if (!layerTransitionTimerId) {
			return
		}

		window.clearTimeout(layerTransitionTimerId)
		layerTransitionTimerId = 0
	}

	const hideIncomingLayer = () => {
		incomingLayer.classList.remove('is-visible')
		incomingLayer.style.backgroundImage = ''
	}

	const applyTheme = (themeId, persist = true) => {
		const theme = themes.find(entry => entry.id === themeId) || themes[0]
		const backgroundSize = getBackgroundSize()
		const variantSuffix = theme.id === 'purple-official' ? '' : ` ${theme.id}`
		const imageUrl = new URL(`img/bg/bg_${backgroundSize}${variantSuffix}.jpg`, window.location.href).href
		const requestId = themeRequestId + 1

		currentTheme = theme.id
		themeRequestId = requestId
		toggle.dataset.theme = theme.id
		toggle.style.setProperty('--theme-switcher-accent', theme.accent)
		toggle.setAttribute('aria-label', `Zmien wariant tla strony. Aktualnie: ${theme.label}`)
		toggle.setAttribute('title', `Tlo: ${theme.label}. Kliknij, aby przelaczyc.`)

		if (persist) {
			storeTheme(theme.id)
		}

		const previewImage = new Image()
		previewImage.onload = () => {
			if (requestId !== themeRequestId) {
				return
			}

			const backgroundValue = `url("${imageUrl}")`
			page.dataset.pageTheme = theme.id
			page.style.setProperty('--page-bg-image', backgroundValue)
			page.style.backgroundImage = backgroundValue
			clearLayerTransition()

			if (!activeLayerImage) {
				baseLayer.style.backgroundImage = backgroundValue
				activeLayerImage = backgroundValue
				hideIncomingLayer()
				return
			}

			if (activeLayerImage === backgroundValue) {
				hideIncomingLayer()
				return
			}

			incomingLayer.classList.remove('is-visible')
			incomingLayer.style.backgroundImage = backgroundValue
			void incomingLayer.offsetWidth
			incomingLayer.classList.add('is-visible')

			layerTransitionTimerId = window.setTimeout(() => {
				if (requestId !== themeRequestId) {
					return
				}

				baseLayer.style.backgroundImage = backgroundValue
				activeLayerImage = backgroundValue
				hideIncomingLayer()
				layerTransitionTimerId = 0
			}, 820)
		}

		previewImage.onerror = () => {
			if (requestId !== themeRequestId) {
				return
			}

			if (theme.id !== themes[0].id) {
				if (persist) {
					storeTheme(themes[0].id)
				}

				applyTheme(themes[0].id, false)
			}
		}

		previewImage.src = imageUrl
	}

	toggle.addEventListener('click', () => {
		const activeIndex = themes.findIndex(theme => theme.id === currentTheme)
		const nextTheme = themes[(activeIndex + 1 + themes.length) % themes.length]
		applyTheme(nextTheme.id)
	})

	for (const viewportTheme of viewportThemes) {
		if (!viewportTheme.query) {
			continue
		}

		addMediaQueryListener(viewportTheme.query, () => {
			applyTheme(currentTheme, false)
		})
	}

	applyTheme(currentTheme, false)

	function getStoredTheme() {
		for (const key of [storageKey, legacyStorageKey]) {
			const storedTheme = getLocalStorageTheme(key) || getCookieTheme(key)
			if (!themes.some(theme => theme.id === storedTheme)) {
				continue
			}

			if (key !== storageKey) {
				storeTheme(storedTheme)
			}

			return storedTheme
		}

		return themes[0].id
	}

	function getBackgroundSize() {
		const activeViewport = viewportThemes.find(viewportTheme => viewportTheme.query && viewportTheme.query.matches)
		return activeViewport ? activeViewport.size : viewportThemes[viewportThemes.length - 1].size
	}

	function storeTheme(themeId) {
		try {
			window.localStorage.setItem(storageKey, themeId)
		} catch (error) {}

		try {
			document.cookie = `${storageKey}=${encodeURIComponent(themeId)}; max-age=31536000; path=/; SameSite=Lax`
		} catch (error) {}
	}

	function getLocalStorageTheme(key) {
		try {
			return window.localStorage.getItem(key)
		} catch (error) {
			return ''
		}
	}

	function getCookieTheme(key) {
		try {
			const storedValue = document.cookie.split('; ').find(entry => entry.startsWith(`${key}=`))

			return storedValue ? decodeURIComponent(storedValue.slice(key.length + 1)) : ''
		} catch (error) {
			return ''
		}
	}
}
