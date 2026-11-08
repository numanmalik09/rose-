document.addEventListener('DOMContentLoaded', () => {

    const triggerOverlay = document.getElementById('triggerOverlay');
    const startButton = document.getElementById('startButton');
    const loadingBar = document.getElementById('loadingBar');
    const statusText = document.getElementById('statusText');
    const ambientLight = document.getElementById('ambientLight');
    const roseWrapper = document.getElementById('roseWrapper');
    const roseHead = document.getElementById('roseHead');
    const calyx = document.getElementById('calyx');
    const stem = document.getElementById('stem');
    const leafLeft = document.getElementById('leafLeft');
    const leafRight = document.getElementById('leafRight');
    const endText = document.getElementById('endText');
    const fallingPetalsEl = document.getElementById('fallingPetals');
    const scene = document.querySelector('.scene');
    const musicToggle = document.getElementById('musicToggle');
    const musicIcon = document.getElementById('musicIcon');
    const btnYes = document.getElementById('btnYes');
    const btnAlways = document.getElementById('btnAlways');
    const replayBtn = document.getElementById('replayBtn');
    const loveModalOverlay = document.getElementById('loveModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const fxCanvas = document.getElementById('fxCanvas');

    const PETAL_LAYERS = [
        { count: 4, w: 24, h: 46, curl: 78, delayBase: 0, tz: 2, cls: 'petal-bud' },
        { count: 5, w: 34, h: 58, curl: 65, delayBase: 0.45, tz: 9, cls: 'petal-core' },
        { count: 6, w: 46, h: 72, curl: 48, delayBase: 1.00, tz: 18, cls: 'petal-inner' },
        { count: 7, w: 58, h: 88, curl: 22, delayBase: 1.65, tz: 30, cls: 'petal-mid-inner' },
        { count: 8, w: 72, h: 104, curl: -5, delayBase: 2.40, tz: 44, cls: 'petal-mid' },
        { count: 9, w: 86, h: 118, curl: -25, delayBase: 3.25, tz: 60, cls: 'petal-outer' },
        { count: 10, w: 98, h: 130, curl: -48, delayBase: 4.15, tz: 76, cls: 'petal-blush' },
    ];

    const SEPALS_COUNT = 5;

    const FALLING_PETAL_COLORS = [
        ['#9a001d', '#3d0008'],
        ['#850018', '#2b0005'],
        ['#ad0022', '#480008'],
        ['#bf0028', '#52000c'],
    ];

    let fallingPetalInterval = null;

    // --- Interactive 3D Orbit Controls ---
    let rotX = -22;
    let rotY = 0;
    let isDragging = false;
    let isRotating = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    function updateRoseTransform() {
        roseWrapper.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    function onPointerDown(e) {
        isDragging = true;
        roseWrapper.classList.add('grabbing');
        lastPointerX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
        lastPointerY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
        const dx = clientX - lastPointerX;
        const dy = clientY - lastPointerY;
        lastPointerX = clientX;
        lastPointerY = clientY;

        rotY += dx * 0.45;
        rotX = Math.max(-65, Math.min(25, rotX - dy * 0.4));
        updateRoseTransform();
    }

    function onPointerUp() {
        if (isDragging) {
            isDragging = false;
            roseWrapper.classList.remove('grabbing');
        }
    }

    roseWrapper.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    roseWrapper.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    function animateRotationLoop() {
        if (isRotating && !isDragging) {
            rotY = (rotY + 0.18) % 360;
            updateRoseTransform();
        }
        requestAnimationFrame(animateRotationLoop);
    }
    requestAnimationFrame(animateRotationLoop);


    // --- Procedural Romantic Web Audio API Synth ---
    let audioCtx = null;
    let isMusicPlaying = false;
    let musicInterval = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playArpNote(freq, time, dur = 1.3) {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const oscSub = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            oscSub.type = 'triangle';
            oscSub.frequency.setValueAtTime(freq * 0.5, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, time);

            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.07, time + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

            osc.connect(filter);
            oscSub.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(time);
            oscSub.start(time);
            osc.stop(time + dur + 0.1);
            oscSub.stop(time + dur + 0.1);
        } catch (_) {}
    }

    const ROMANTIC_CHORDS = [
        [261.63, 329.63, 392.00, 493.88, 659.25], // Cmaj9
        [220.00, 261.63, 329.63, 392.00, 523.25], // Am9
        [174.61, 261.63, 329.63, 440.00, 523.25], // Fmaj7
        [196.00, 293.66, 392.00, 493.88, 587.33], // G6
    ];

    let chordIdx = 0;
    let noteIdx = 0;

    function stepMusic() {
        if (!isMusicPlaying || !audioCtx) return;
        const chord = ROMANTIC_CHORDS[chordIdx];
        const freq = chord[noteIdx % chord.length];
        playArpNote(freq, audioCtx.currentTime);

        noteIdx++;
        if (noteIdx >= chord.length * 2) {
            noteIdx = 0;
            chordIdx = (chordIdx + 1) % ROMANTIC_CHORDS.length;
        }
    }

    function startMusic() {
        initAudio();
        if (isMusicPlaying) return;
        isMusicPlaying = true;
        musicToggle.classList.remove('muted');
        musicIcon.textContent = '🎵';
        if (!musicInterval) {
            musicInterval = setInterval(stepMusic, 420);
        }
    }

    function stopMusic() {
        isMusicPlaying = false;
        musicToggle.classList.add('muted');
        musicIcon.textContent = '🔇';
        if (musicInterval) {
            clearInterval(musicInterval);
            musicInterval = null;
        }
    }

    musicToggle.addEventListener('click', () => {
        if (isMusicPlaying) {
            stopMusic();
        } else {
            startMusic();
        }
    });


    // --- Canvas Fireflies & Celebratory Hearts ---
    const ctx = fxCanvas.getContext('2d');
    let fireflies = [];
    let hearts = [];

    function resizeFXCanvas() {
        fxCanvas.width = window.innerWidth;
        fxCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeFXCanvas);
    resizeFXCanvas();

    for (let i = 0; i < 22; i++) {
        fireflies.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: 1.2 + Math.random() * 1.8,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.25 - 0.08,
            alpha: 0.2 + Math.random() * 0.6,
            dAlpha: (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1)
        });
    }

    function spawnHeartBurst(x, y) {
        const symbols = ['💖', '❤️', '🌹', '✨', '💕', '🌷'];
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 5.5;
            hearts.push({
                x: x || window.innerWidth / 2,
                y: y || window.innerHeight / 2,
                symbol: symbols[Math.floor(Math.random() * symbols.length)],
                size: 14 + Math.random() * 18,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.5,
                gravity: 0.12,
                alpha: 1,
                decay: 0.009 + Math.random() * 0.012,
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.14
            });
        }
    }

    function renderFX() {
        ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

        // Fireflies
        for (let f of fireflies) {
            f.x += f.vx;
            f.y += f.vy;
            f.alpha += f.dAlpha;
            if (f.alpha > 0.85 || f.alpha < 0.15) f.dAlpha = -f.dAlpha;

            if (f.x < 0) f.x = fxCanvas.width;
            if (f.x > fxCanvas.width) f.x = 0;
            if (f.y < 0) f.y = fxCanvas.height;
            if (f.y > fxCanvas.height) f.y = 0;

            ctx.save();
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 170, ${f.alpha})`;
            ctx.shadowColor = 'rgba(255, 80, 130, 0.7)';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();
        }

        // Hearts
        for (let i = hearts.length - 1; i >= 0; i--) {
            const h = hearts[i];
            h.x += h.vx;
            h.y += h.vy;
            h.vy += h.gravity;
            h.rot += h.vRot;
            h.alpha -= h.decay;

            if (h.alpha <= 0) {
                hearts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.rot);
            ctx.globalAlpha = Math.max(0, h.alpha);
            ctx.font = `${h.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(h.symbol, 0, 0);
            ctx.restore();
        }

        requestAnimationFrame(renderFX);
    }
    requestAnimationFrame(renderFX);


    // --- Card Loader ---
    function startCardLoader() {
        const duration = 2400;
        const steps = [
            { threshold: 20, text: 'Loading Love.css...' },
            { threshold: 50, text: 'Growing digital petals...' },
            { threshold: 80, text: 'Adding velvet textures...' },
            { threshold: 95, text: 'Optimizing 3D rendering...' },
            { threshold: 100, text: 'Ready to bloom!' }
        ];

        let startTimestamp = null;

        function animateLoader(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const percent = Math.floor(progress * 100);

            loadingBar.style.width = `${percent}%`;
            const activeStep = steps.find(s => percent <= s.threshold) || steps[steps.length - 1];
            statusText.textContent = activeStep.text;

            if (progress < 1) {
                requestAnimationFrame(animateLoader);
            } else {
                startButton.removeAttribute('disabled');
            }
        }

        requestAnimationFrame(animateLoader);
    }


    // --- Botanical Rose Generation ---
    function createSepals() {
        calyx.innerHTML = '';
        const step = 360 / SEPALS_COUNT;
        for (let i = 0; i < SEPALS_COUNT; i++) {
            const sepal = document.createElement('div');
            sepal.className = 'sepal';
            const angle = i * step + (Math.random() - 0.5) * 5;
            const delay = 0.3 + i * 0.08;
            const curl = 18 + Math.random() * 8;

            sepal.style.setProperty('--sepal-angle', `${angle}deg`);
            sepal.style.setProperty('--sepal-curl', `${curl}deg`);
            sepal.style.setProperty('--sepal-delay', `${delay}s`);
            calyx.appendChild(sepal);
        }
    }

    function createPetals() {
        // Keep the glow divs while clearing any old petals
        const glow = roseHead.querySelector('.rose-glow');
        const glowInner = roseHead.querySelector('.rose-glow-inner');
        roseHead.innerHTML = '';
        if (glow) roseHead.appendChild(glow);
        if (glowInner) roseHead.appendChild(glowInner);

        PETAL_LAYERS.forEach((layer, li) => {
            const angleStep = 360 / layer.count;
            const layerOffset = li * 24 + (Math.random() - 0.5) * 8;

            for (let i = 0; i < layer.count; i++) {
                const petal = document.createElement('div');
                petal.className = `petal ${layer.cls}`;

                const angle = layerOffset + i * angleStep + (Math.random() - 0.5) * 5;
                const delay = layer.delayBase + i * 0.07;
                const curlJitter = (Math.random() - 0.5) * 6;
                const scaleJitter = 0.94 + Math.random() * 0.12;
                const bloomDur = 3.6 + Math.random() * 0.5;

                petal.style.width = `${layer.w}px`;
                petal.style.height = `${layer.h}px`;
                petal.style.setProperty('--angle', `${angle}deg`);
                petal.style.setProperty('--curl', `${layer.curl + curlJitter}deg`);
                petal.style.setProperty('--scale', scaleJitter);
                petal.style.setProperty('--delay', `${delay}s`);
                petal.style.setProperty('--tz', `${layer.tz}px`);
                petal.style.setProperty('--bloom-dur', `${bloomDur}s`);

                roseHead.appendChild(petal);
            }
        });
    }

    function growStem() {
        return new Promise(resolve => {
            stem.classList.add('grow');

            setTimeout(() => {
                leafLeft.classList.add('visible');
            }, 1000);

            setTimeout(() => {
                leafRight.classList.add('visible');
            }, 1500);

            setTimeout(resolve, 2800);
        });
    }

    function bloom() {
        calyx.classList.add('visible');
        ambientLight.classList.add('visible');
        roseHead.classList.add('blooming');
    }

    function spawnFallingPetal() {
        if (fallingPetalsEl.childElementCount > 10) return;

        const petal = document.createElement('div');
        petal.className = 'falling-petal';

        const w = 10 + Math.random() * 12;
        const h = w * (1.25 + Math.random() * 0.15);
        const x = 20 + Math.random() * 60;
        const y = 3 + Math.random() * 10;
        const dur = 5.5 + Math.random() * 3.5;
        const delay = Math.random() * 0.6;

        const colors = FALLING_PETAL_COLORS[Math.floor(Math.random() * FALLING_PETAL_COLORS.length)];

        const sign = () => (Math.random() > 0.5 ? 1 : -1);
        const s1 = sign() * (15 + Math.random() * 25);
        const s2 = sign() * (10 + Math.random() * 20);
        const s3 = sign() * (20 + Math.random() * 30);
        const s4 = sign() * (10 + Math.random() * 15);

        petal.style.left = `${x}vw`;
        petal.style.top = `${y}vh`;
        petal.style.setProperty('--fp-w', `${w}px`);
        petal.style.setProperty('--fp-h', `${h}px`);
        petal.style.setProperty('--fp-c1', colors[0]);
        petal.style.setProperty('--fp-c2', colors[1]);
        petal.style.setProperty('--f-dur', `${dur}s`);
        petal.style.setProperty('--f-delay', `${delay}s`);
        petal.style.setProperty('--s1', `${s1}px`);
        petal.style.setProperty('--s2', `${s2}px`);
        petal.style.setProperty('--s3', `${s3}px`);
        petal.style.setProperty('--s4', `${s4}px`);

        fallingPetalsEl.appendChild(petal);

        setTimeout(() => {
            if (petal.parentNode) petal.remove();
        }, (dur + delay) * 1000 + 300);
    }

    function startFallingPetals() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => spawnFallingPetal(), i * 300);
        }

        if (fallingPetalInterval) clearInterval(fallingPetalInterval);
        fallingPetalInterval = setInterval(() => {
            spawnFallingPetal();
        }, 2200);
    }


    // --- Master Animation Sequence ---
    async function startAnimationSequence() {
        await growStem();
        await delay(300);
        bloom();

        // Enable smooth 3D rotation once in full bloom
        setTimeout(() => {
            isRotating = true;
        }, 8200);

        // Falling petals drift gently once fully bloomed
        setTimeout(() => startFallingPetals(), 8600);

        // Elevate rose smoothly to create dedicated space for the tagline card
        setTimeout(() => {
            scene.classList.add('bloomed');
        }, 8800);

        // Reveal the romantic tagline card after full bloom
        setTimeout(() => {
            endText.classList.add('visible');
        }, 9600);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // --- Celebratory Responses & Replay ---
    function celebrateProposal(e) {
        const rect = e.target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        spawnHeartBurst(cx, cy);
        setTimeout(() => spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2), 250);
        setTimeout(() => spawnHeartBurst(window.innerWidth / 2, window.innerHeight * 0.38), 650);

        roseHead.classList.add('celebrating');
        setTimeout(() => {
            loveModalOverlay.classList.add('open');
        }, 550);
    }

    btnYes.addEventListener('click', celebrateProposal);
    btnAlways.addEventListener('click', celebrateProposal);

    modalCloseBtn.addEventListener('click', () => {
        loveModalOverlay.classList.remove('open');
    });

    loveModalOverlay.addEventListener('click', (e) => {
        if (e.target === loveModalOverlay) {
            loveModalOverlay.classList.remove('open');
        }
    });

    function resetAndReplay() {
        loveModalOverlay.classList.remove('open');
        endText.classList.remove('visible');
        scene.classList.remove('bloomed');
        roseHead.classList.remove('blooming', 'celebrating');
        calyx.classList.remove('visible');
        ambientLight.classList.remove('visible');
        stem.classList.remove('grow');
        leafLeft.classList.remove('visible');
        leafRight.classList.remove('visible');

        isRotating = false;
        rotX = -22;
        rotY = 0;
        updateRoseTransform();

        fallingPetalsEl.innerHTML = '';
        if (fallingPetalInterval) {
            clearInterval(fallingPetalInterval);
            fallingPetalInterval = null;
        }

        // Re-generate fresh petals to reset CSS transitions
        createPetals();
        createSepals();

        setTimeout(() => {
            startAnimationSequence();
        }, 400);
    }

    replayBtn.addEventListener('click', resetAndReplay);


    // --- Startup ---
    startButton.addEventListener('click', () => {
        triggerOverlay.classList.add('fade-out');
        startMusic();

        setTimeout(() => {
            startAnimationSequence();
        }, 800);
    });

    createSepals();
    createPetals();

    setTimeout(() => {
        startCardLoader();
    }, 400);

});
