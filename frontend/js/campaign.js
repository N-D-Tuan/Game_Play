import { SKILL_CAMPAIGN_CONFIG, evolveSkill } from './skills.js';

export class CampaignScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CampaignScene' });
    }

    preload() {
        this.load.image('puddle1', '../assets/puddle1.png');
        this.load.image('puddle2', '../assets/puddle2.png');
        this.load.image('puddle3', '../assets/puddle3.png');
        this.load.image('puddle4', '../assets/puddle4.png'); 

        this.load.image('rain', '../assets/rain.png');
        for (let i = 1; i <= 3; i++) this.load.image('snow' + i, '../assets/snow' + i + '.png');
        
        // [FIX HẠT CÁT BẰNG CODE]: Vẽ 1 hạt vuông 4x4 pixel màu vàng cát
        let sandGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        sandGraphics.fillStyle(0xd2b48c, 1);
        sandGraphics.fillRect(0, 0, 6, 6);
        sandGraphics.generateTexture('sand', 6, 6);

        for (let i = 1; i <= 4; i++) this.load.image('tree' + i, '../assets/tree' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('tree_snow' + i, '../assets/tree_snow' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('grass' + i, '../assets/grass' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('rock' + i, '../assets/rock' + i + '.png');

        this.load.image('hp_frame', '../assets/hp_frame.png'); 
        this.load.audio('step_water', '../assets/step_water.mp3');
        this.load.audio('normal_bgm', '../assets/normal.mp3');
        this.load.audio('rain_bgm', '../assets/rain.mp3');
        this.load.audio('snow_bgm', '../assets/snow.mp3');
        this.load.audio('desert_bgm', '../assets/desert.mp3');
        this.load.image('player', '../assets/player.png');
    }

    create() {
        // Tắt nhạc sảnh chờ
        if (window.bgMusic && window.bgMusic.isPlaying) window.bgMusic.stop();
        this.sound.stopAll(); 

        this.physics.world.setBounds(0, 0, 4000, 4000);
        this.cameras.main.setBounds(0, 0, 4000, 4000);

        this.weatherType = this.chooseRandomWeather();
        this.applyWeatherAndBackground(this.weatherType);
        
        this.terrainZones = this.physics.add.group();
        this.createPuddles(this.weatherType);
        this.createDecorations(this.weatherType);

        this.player = this.physics.add.sprite(2000, 2000, 'player');
        this.player.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        this.physics.add.overlap(this.player, this.terrainZones, this.onStepTerrain, null, this);
        this.lastStepTime = 0; 
        this.cursors = this.input.keyboard.createCursorKeys();

        this.playerHealth = 100;
        this.isGameOver = false;
        this.isPaused = false;
        
        this.drawHealthBar();
        this.createPauseMenu();

        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    chooseRandomWeather() {
        const weathers = ['normal', 'rain', 'snow', 'desert'];
        return weathers[Math.floor(Math.random() * weathers.length)];
    }

    applyWeatherAndBackground(weather) {
        let screenW = this.cameras.main.width;
        let screenH = this.cameras.main.height;
        
        let volSlider = document.getElementById('volume-slider');
        let currentVol = volSlider ? parseFloat(volSlider.value) : 0.5;

        if (weather === 'normal') {
            this.cameras.main.setBackgroundColor('#3b7a35'); 
            window.activeCampaignBgm = this.sound.add('normal_bgm', { loop: true, volume: currentVol });
            window.activeCampaignBgm.play(); 
        } 
        else if (weather === 'rain') {
            this.cameras.main.setBackgroundColor('#1e3f20'); 
            window.activeCampaignBgm = this.sound.add('rain_bgm', { loop: true, volume: currentVol });
            window.activeCampaignBgm.play();

            let rainEmitter = this.add.particles(0, 0, 'rain', {
                x: { min: -100, max: screenW + 100 }, 
                y: -50, // Mép trên camera
                lifespan: 2000, speedY: { min: 400, max: 600 }, speedX: { min: -100, max: -50 },
                scale: { min: 0.05, max: 0.15 }, quantity: 12, blendMode: 'ADD', alpha: 0.5
            });
            rainEmitter.setScrollFactor(0); 
        } 
        else if (weather === 'snow') {
            this.cameras.main.setBackgroundColor('#eef2f5'); 
            window.activeCampaignBgm = this.sound.add('snow_bgm', { loop: true, volume: currentVol });
            window.activeCampaignBgm.play();

            const snowKeys = ['snow1', 'snow2', 'snow3'];
            snowKeys.forEach(key => {
                let snowEmitter = this.add.particles(0, 0, key, {
                    x: { min: -100, max: screenW + 100 }, 
                    y: -50, // Mép trên camera
                    lifespan: 8000, // [ĐÃ FIX]: Tăng vòng đời lên 8 giây để hạt rơi đủ tới đáy màn hình
                    speedY: { min: 100, max: 200 }, speedX: { min: -50, max: 50 }, 
                    scale: { min: 0.2, max: 0.5 }, quantity: 2, 
                    alpha: { start: 1, end: 0.1 } // [ĐÃ FIX]: Không mờ quá nhanh
                });
                snowEmitter.setScrollFactor(0); 
            });
        } 
        else if (weather === 'desert') {
            this.cameras.main.setBackgroundColor('#c2b280'); 
            window.activeCampaignBgm = this.sound.add('desert_bgm', { loop: true, volume: currentVol });
            window.activeCampaignBgm.play();

            let sandEmitter = this.add.particles(0, 0, 'sand', {
                x: screenW + 50, // [ĐÃ FIX]: Bắt đầu thổi từ mép PHẢI của Camera
                y: { min: -50, max: screenH + 50 }, // Rải đều theo chiều dọc màn hình
                lifespan: 4000, // Đủ để hạt bay hết chiều ngang màn hình
                speedX: { min: -400, max: -800 }, speedY: { min: -20, max: 20 }, 
                scale: { min: 0.5, max: 1.5 }, quantity: 15, alpha: { start: 0.8, end: 0 }
            });
            sandEmitter.setScrollFactor(0); 
        }
    }

    createPuddles(weather) {
        const totalPuddles = (weather === 'rain') ? 150 : (weather === 'desert' ? 10 : 80);
        const rainPuddles = ['puddle1', 'puddle2', 'puddle3'];

        for (let i = 0; i < totalPuddles; i++) {
            let px = Phaser.Math.Between(100, 3900);
            let py = Phaser.Math.Between(100, 3900);
            let puddleKey = weather === 'snow' ? 'puddle4' : Phaser.Math.RND.pick(rainPuddles);

            let puddle = this.terrainZones.create(px, py, puddleKey);
            puddle.setAlpha(0.6); 
            
            // [FIX TĂNG KÍCH CỠ HỒ NƯỚC]: Tăng Scale random từ 0.7 đến 1.5 (gấp đôi lúc nãy)
            puddle.setScale(Phaser.Math.FloatBetween(0.7, 1.5)); 
            puddle.body.setSize(puddle.width * 0.6, puddle.height * 0.6);
        }
    }

    createDecorations(weather) {
        const normalTrees = ['tree1', 'tree2', 'tree3', 'tree4'];
        const snowTrees = ['tree_snow1', 'tree_snow2', 'tree_snow3'];
        const grasses = ['grass1', 'grass2', 'grass3'];
        const rocks = ['rock1', 'rock2', 'rock3'];

        let treeConfig = { keys: normalTrees, count: 120, scale: [0.3, 0.6], tint: 0xffffff };
        let rockConfig = { keys: rocks, count: 50, scale: [0.2, 0.5], tint: 0xffffff };
        let grassConfig = { keys: grasses, count: 300, scale: [0.3, 0.6], tint: 0xffffff };

        if (weather === 'normal') {
            treeConfig.count = 200; grassConfig.count = 500;
        } else if (weather === 'rain') {
            treeConfig.count = 80; grassConfig.count = 200; grassConfig.tint = 0xaaffaa;
        } else if (weather === 'snow') {
            treeConfig = { keys: snowTrees, count: 100, scale: [0.4, 0.7], tint: 0xffffff }; 
            rockConfig.count = 40; rockConfig.tint = 0xddddff; 
            grassConfig.count = 80; grassConfig.tint = 0xeeeeff; 
        } else if (weather === 'desert') {
            treeConfig = { keys: normalTrees, count: 20, scale: [0.3, 0.5], tint: 0x8b4513 }; 
            rockConfig.count = 200; rockConfig.tint = 0xd2b48c; 
            grassConfig.count = 50; grassConfig.tint = 0xaaaa55; 
        }

        const spawnDeco = (config) => {
            for (let i = 0; i < config.count; i++) {
                let px = Phaser.Math.Between(50, 3950);
                let py = Phaser.Math.Between(50, 3950);
                let key = Phaser.Math.RND.pick(config.keys);
                
                let deco = this.add.image(px, py, key);
                deco.setScale(Phaser.Math.FloatBetween(config.scale[0], config.scale[1]));
                if (config.tint !== 0xffffff) deco.setTint(config.tint);
                deco.setDepth(config.keys === grasses ? py - 20 : py);
            }
        };

        spawnDeco(grassConfig); 
        spawnDeco(rockConfig);
        spawnDeco(treeConfig);
    }

    onStepTerrain(player, terrain) {
        if ((player.body.velocity.x !== 0 || player.body.velocity.y !== 0) && this.time.now - this.lastStepTime > 400) {
            this.lastStepTime = this.time.now;
            this.sound.play('step_water', { volume: 0.6 });
        }
    }

    drawHealthBar() {
        const BAR_X = 219, BAR_Y = 63, BAR_WIDTH = 307, BAR_HEIGHT = 55, SLANT = 39; 
        const HP_TEXT_X = 175, HP_TEXT_Y = 118;   

        this.hpFrame = this.add.image(100, 20, 'hp_frame').setOrigin(0, 0).setScale(0.35).setDepth(10002).setScrollFactor(0);
        this.healthBarBg = this.add.graphics().fillStyle(0x222222, 1).setDepth(10000).setScrollFactor(0);
        this.healthBarBg.beginPath();
        this.healthBarBg.moveTo(BAR_X + SLANT, BAR_Y); this.healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y);              
        this.healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y + BAR_HEIGHT); this.healthBarBg.lineTo(BAR_X, BAR_Y + BAR_HEIGHT);             
        this.healthBarBg.closePath(); this.healthBarBg.fillPath();

        this.healthBarFill = this.add.graphics().setDepth(10001).setScrollFactor(0);
        this.hpText = this.add.text(HP_TEXT_X, HP_TEXT_Y, this.playerHealth + ' / 100', { 
            fontSize: '26px', fill: '#ff3333', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10003).setScrollFactor(0);
        
        this.updateHealthBarWidth(this.playerHealth);
    }

    updateHealthBarWidth(healthValue) {
        const BAR_X = 219, BAR_Y = 63, BAR_WIDTH = 307, BAR_HEIGHT = 55, SLANT = 39; 
        this.healthBarFill.clear();
        if (healthValue <= 0) { if(this.hpText) this.hpText.setText('0'); return; }
        this.healthBarFill.fillStyle(0xff0000, 1); 
        let currentWidth = (healthValue / 100) * BAR_WIDTH; 
        this.healthBarFill.beginPath();
        this.healthBarFill.moveTo(BAR_X + SLANT, BAR_Y); 
        this.healthBarFill.lineTo(Math.max(BAR_X + SLANT, BAR_X + currentWidth), BAR_Y); 
        this.healthBarFill.lineTo(BAR_X + currentWidth, BAR_Y + BAR_HEIGHT); 
        this.healthBarFill.lineTo(BAR_X, BAR_Y + BAR_HEIGHT); 
        this.healthBarFill.closePath(); this.healthBarFill.fillPath();
        if(this.hpText) this.hpText.setText(Math.round(healthValue));
    }

    createPauseMenu() {
        let cx = this.cameras.main.width / 2;
        let cy = this.cameras.main.height / 2;

        let pauseBg = this.add.graphics().fillStyle(0x000000, 0.7).fillRoundedRect(20, 20, 50, 50, 10).setDepth(16000).setScrollFactor(0);
        let pauseBtnIcon = this.add.text(25, 30, '⏸️', { fontSize: '30px' }).setInteractive({ useHandCursor: true }).setDepth(16001).setScrollFactor(0);
        
        pauseBtnIcon.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
            this.togglePause();
        });

        // [FIX LỖI LIỆT PAUSE]: Xóa blockZone cũ, trực tiếp bật tắt tương tác trên pauseOverlay
        this.pauseOverlay = this.add.graphics().fillStyle(0x000000, 0.85).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(15000).setScrollFactor(0);

        this.txtPause = this.add.text(cx, cy - 150, 'TẠM DỪNG', { fontSize: '60px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(15001).setScrollFactor(0);

        this.btnResume = this.add.text(cx, cy - 30, '[ TIẾP TỤC ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.btnResume.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.togglePause(); });
        
        this.btnInventory = this.add.text(cx, cy + 40, '[ KHO ĐỒ ]', { fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.btnInventory.on('pointerdown', () => alert("Kho đồ đang phát triển!"));
        
        this.btnSetting = this.add.text(cx, cy + 110, '[ CÀI ĐẶT ]', { fontSize: '32px', fill: '#00ccff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.btnSetting.on('pointerdown', () => {
            document.getElementById('settings-modal').style.display = 'flex'; 
            this.input.enabled = false;
        });

        this.btnChangeMap = this.add.text(cx, cy + 180, '[ CHUYỂN MAP ]', { fontSize: '32px', fill: '#ff8800', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.btnChangeMap.on('pointerdown', () => {
            this.physics.resume();
            this.tweens.resumeAll();
            if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
            this.scene.restart(); 
        });

        this.btnHome = this.add.text(cx, cy + 250, '[ TRANG CHỦ ]', { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.btnHome.on('pointerdown', () => {
            this.physics.resume();
            this.tweens.resumeAll();
            
            if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
            if (window.bgMusic) window.bgMusic.play();
            
            this.scene.start('default'); 
            document.getElementById('home-screen').style.display = 'flex';
            setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
            setTimeout(() => { document.getElementById('game-container').style.display = 'none'; }, 800);
        });

        this.setPauseMenuVisible(false);
    }

    setPauseMenuVisible(v) { 
        this.pauseOverlay.setVisible(v); 
        
        // [FIX LỖI LIỆT PAUSE]: Cấp quyền Interactive cho màng đen để chặn click khi bật, Tắt đi khi đóng.
        if (v) {
            this.pauseOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains);
        } else {
            this.pauseOverlay.disableInteractive();
        }

        this.txtPause.setVisible(v); 
        this.btnResume.setVisible(v); this.btnInventory.setVisible(v); 
        this.btnSetting.setVisible(v); this.btnChangeMap.setVisible(v); this.btnHome.setVisible(v); 
    }

    togglePause() {
        if (this.isGameOver) return; 
        this.isPaused = !this.isPaused;
        if (this.isPaused) { 
            this.physics.pause(); 
            this.tweens.pauseAll(); 
            this.setPauseMenuVisible(true); 
        } else { 
            this.physics.resume(); 
            this.tweens.resumeAll(); 
            this.setPauseMenuVisible(false); 
        }
    }

    update() {
        if (this.isPaused || this.isGameOver) return;

        let speed = 300;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
        else if (this.cursors.right.isDown) this.player.setVelocityX(speed);

        if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
        else if (this.cursors.down.isDown) this.player.setVelocityY(speed);
        
        this.player.setDepth(this.player.y);
    }
}