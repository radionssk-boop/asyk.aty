import * as PIXI from 'pixi.js';

const app = new PIXI.Application();

async function init() {
    await app.init({
        background: '#06718b4f',
        resizeTo: window,
        antialias: true
    });
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.appendChild(app.canvas);
    }

    // === ЗАГРУЗКА ТЕКСТУРЫ ===
    // Функция загрузки асетов
    const loadAssets = async () => {
        return await PIXI.Assets.load('/asyk.png');
    };

    const asykTexture = await loadAssets();

    let score = 0;
    const asyks: PIXI.Sprite[] = []; // Теперь используем массив Спрайтов
    const sakaStartPos = { x: app.screen.width / 2, y: app.screen.height - 150 };

    // Стили текста
    const style = new PIXI.TextStyle({
        fontFamily: 'Verdana',
        fontSize: 36,
        fill: '#ffffff',
        fontWeight: 'bold',
        dropShadow: {
            color: '#000000',
            blur: 4,
            distance: 2,
        },
    });

    const scoreText = new PIXI.Text({ text: `ВЫБИТО: ${score} / 5`, style });
    scoreText.x = 20; scoreText.y = 20;
    app.stage.addChild(scoreText);

    const winText = new PIXI.Text({ 
        text: 'НАУРЫЗ МЕЙРАМЫ ҚҰТТЫ БОЛСЫН!', 
        style: { ...style, fontSize: 50, fill: '#ffd700' } 
    });
    winText.anchor.set(0.5);
    winText.x = app.screen.width / 2;
    winText.y = app.screen.height / 2;
    winText.visible = false;
    app.stage.addChild(winText);

    // === УДАЛЕНА ФУНКЦИЯ РИСОВАНИЯ ГРАФИКИ ===

    // === НОВАЯ ФУНКЦИЯ СОЗДАНИЯ СПРАЙТА ===
    const createAsykSprite = (x: number, y: number, isSaka = false) => {
        const asyk = new PIXI.Sprite(asykTexture);
        asyk.anchor.set(0.5); // Центрируем изображение

        // Масштабирование: если asyk.png маленькая, увеличь это число (например, 1.5)
        // Если asyk.png огромная, уменьши это число (например, 0.2)
        asyk.scale.set(0.4); 
        
        asyk.x = x;
        asyk.y = y;

        if (isSaka) {
            asyk.tint = 0x00aaff; // Подкрашиваем Сака в синий
        }

        (asyk as any).isSaka = isSaka;
        (asyk as any).active = true;
        (asyk as any).velocity = { x: 0, y: 0 };
        app.stage.addChild(asyk);
        return asyk;
    };

    // Создаем цели
    function setupTargets() {
        asyks.forEach(a => app.stage.removeChild(a));
        asyks.length = 0;
        for (let i = 0; i < 5; i++) {
            // Используем новую функцию создания спрайта
            asyks.push(createAsykSprite(app.screen.width / 2 - 140 + i * 70, app.screen.height / 3));
        }
        score = 0;
        scoreText.text = `ВЫБИТО: ${score} / 5`;
        winText.visible = false;
        winText.y = app.screen.height / 2;
    }

    setupTargets();

    // Создаем Сака
    // Используем новую функцию создания спрайта
    const saka = createAsykSprite(sakaStartPos.x, sakaStartPos.y, true);
    saka.eventMode = 'static';
    saka.cursor = 'pointer';

    // Полоска натяга/траектории
    const aimPowerBar = new PIXI.Graphics();
    app.stage.addChild(aimPowerBar);

    let dragStart: PIXI.Point | null = null;

    saka.on('pointerdown', (e) => {
        dragStart = e.global.clone();
        (saka as any).active = false; // Отключаем столкновения пока тянем
    });

    window.addEventListener('pointermove', (e) => {
        if (!dragStart) return;
        
        const dx = saka.x - e.clientX;
        const dy = saka.y - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const maxDist = 250;
        const limitedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        
        aimPowerBar.clear();
        
        const barColor = dist > maxDist * 0.7 ? 0xff4444 : 0x44ff44;
        
        aimPowerBar.setStrokeStyle({ width: limitedDist / 10 + 2, color: barColor, alpha: 0.7 });
        aimPowerBar.moveTo(saka.x, saka.y);
        aimPowerBar.lineTo(saka.x + Math.cos(angle) * limitedDist, saka.y + Math.sin(angle) * limitedDist);
        
        // Удалены Graphics-многоугольники, рисуем только линию натяга
    });

    window.addEventListener('pointerup', (e) => {
        if (!dragStart) return;
        
        const dx = saka.x - e.clientX;
        const dy = saka.y - e.clientY;
        
        const speedMultiplier = 0.5;
        (saka as any).velocity = { x: dx * speedMultiplier, y: dy * speedMultiplier };
        
        dragStart = null;
        aimPowerBar.clear();
        (saka as any).active = true; // Включаем столкновения при полете
    });

    // Игровой цикл
    app.ticker.add(() => {
        // Движение Сака
        const vel = (saka as any).velocity;
        saka.x += vel.x;
        saka.y += vel.y;
        
        vel.x *= 0.985;
        vel.y *= 0.985;

        // --- ЛОГИКА СТОЛКНОВЕНИЙ ---
        if ((saka as any).active) {
            asyks.forEach((asyk) => {
                if (!(asyk as any).active) return; // Если уже выбит

                const dx = asyk.x - saka.x;
                const dy = asyk.y - saka.y;
                
                // Расстояние столкновения (подстрой под размер спрайта)
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Поскольку асыки стали спрайтами, 45 - хорошее значение по умолчанию.
                if (dist < 45) { // Сака коснулся асыка
                    (asyk as any).active = false;
                    app.stage.removeChild(asyk); // Мгновенно убираем с экрана
                    score++;
                    scoreText.text = `ВЫБИТО: ${score} / 5`;
                    
                    if (score === 5) {
                        winText.visible = true;
                        (saka as any).active = false; // Останавливаем Сака
                        (saka as any).velocity = { x: 0, y: 0 };
                    }
                }
            });
        }
        // ---------------------------------

        // Возврат Сака, если он остановился или вылетел за экран
        const sVel = (saka as any).velocity;
        const sSpeed = Math.sqrt(sVel.x * sVel.x + sVel.y * sVel.y);
        
        if (!dragStart && sSpeed < 0.5) { // Если почти остановился
             resetSaka();
        }

        if (!dragStart && (saka.x < -100 || saka.x > app.screen.width + 100 || saka.y < -100 || saka.y > app.screen.height + 100)) {
             resetSaka(); // Если улетел далеко
        }
    });

    function resetSaka() {
        if (score === 5) return; // Не возвращаем если победили
        saka.x = sakaStartPos.x;
        saka.y = sakaStartPos.y;
        (saka as any).velocity = { x: 0, y: 0 };
        (saka as any).active = false;
    }

    // Кнопка рестарта (улучшим вид)
    const restartBtn = new PIXI.Graphics()
        .rect(0,0,140,45).fill(0xffd700)
        .stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
    restartBtn.x = app.screen.width - 160;
    restartBtn.y = 20;
    restartBtn.eventMode = 'static';
    restartBtn.cursor = 'pointer';
    restartBtn.on('pointerdown', () => setupTargets());
    app.stage.addChild(restartBtn);

    const btnText = new PIXI.Text({ text: 'ЗАНОВО', style: { ...style, fontSize: 18, fill: '#000', fontWeight: 'bold' } });
    btnText.anchor.set(0.5);
    btnText.x = restartBtn.x + 70;
    btnText.y = restartBtn.y + 22;
    app.stage.addChild(btnText);
}

init();