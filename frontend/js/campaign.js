import { SKILL_CAMPAIGN_CONFIG, evolveSkill } from './skills.js';
import { Monster, createMonsterAnimations } from './monster.js';

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

        // ==========================================
        // TẢI CÁC VẬT TRANG TRÍ CỨNG
        // ==========================================
        for (let i = 1; i <= 4; i++) this.load.image('decor_normal' + i, '../assets/decor_normal' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_desert' + i, '../assets/decor_desert' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_rain' + i, '../assets/decor_rain' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_snow' + i, '../assets/decor_snow' + i + '.png');

        this.load.image('hp_frame', '../assets/hp_frame.png'); 
        this.load.image('aa', '../assets/aa.png');
        this.load.image('fireball', '../assets/fireball.png'); 
        this.load.image('sword', '../assets/sword.png'); 
        this.load.image('lightning1', '../assets/lightning1.png'); 
        this.load.image('shield', '../assets/shield.png'); 
        this.load.image('heal', '../assets/heal.png'); 
        this.load.image('earth2', '../assets/earth2.png'); 
        this.load.image('arrows', '../assets/arrows.png'); 
        this.load.image('anchor', '../assets/anchor.png'); 
        this.load.image('doll', '../assets/doll.png');
        this.load.audio('step_water', '../assets/step_water.mp3');
        this.load.audio('normal_bgm', '../assets/normal.mp3');
        this.load.audio('rain_bgm', '../assets/rain.mp3');
        this.load.audio('snow_bgm', '../assets/snow.mp3');
        this.load.audio('desert_bgm', '../assets/desert.mp3');
        
        this.load.spritesheet('player_anim', '../assets/player_spritesheet.png', { 
            frameWidth: 60,  
            frameHeight: 89  
        });

        this.load.spritesheet('monster1', '../assets/monster1_spritesheet.png', { 
            frameWidth: 126,  // (130 - 4 pixel rác trái phải)
            frameHeight: 37,  // (40 - 3 pixel rác trên dưới)
            margin: 2,        // Nhích dao thụt vào 2 pixel ở lề ngoài cùng
            spacing: 2        // Bỏ qua 2 pixel rác ở giữa các khung hình 
        });
    }

    create() {
        // Tắt nhạc sảnh chờ
        if (window.bgMusic && window.bgMusic.isPlaying) window.bgMusic.stop();
        this.sound.stopAll(); 

        // ĐƯA CẤU HÌNH VƯỢT ẢI LÊN WINDOW ĐỂ ĐỒNG BỘ TOÀN CỤC
        window.SKILL_CAMPAIGN_CONFIG = SKILL_CAMPAIGN_CONFIG;

        for(let key in SKILL_CAMPAIGN_CONFIG) { 
            SKILL_CAMPAIGN_CONFIG[key].currentCd = 0; 
        }

        this.physics.world.setBounds(0, 0, 4000, 4000);
        this.cameras.main.setBounds(0, 0, 4000, 4000);

        this.player = this.physics.add.sprite(2000, 2000, 'player_anim');
        this.player.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // ==========================================
        // KHỞI TẠO HOẠT ẢNH (ANIMATIONS)
        // ==========================================
        // Hàng 1 (Khung 0-3): Đi xuống
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player_anim', { start: 0, end: 3 }),
            frameRate: 8, // Tốc độ lật ảnh (8 hình/giây)
            repeat: -1    // Lặp lại vô hạn
        });

        // Hàng 2 (Khung 4-7): Đi sang trái
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player_anim', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        // Hàng 3 (Khung 8-11): Đi sang phải
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player_anim', { start: 8, end: 11 }),
            frameRate: 8,
            repeat: -1
        });

        // Hàng 4 (Khung 12-15): Đi lên
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player_anim', { start: 12, end: 15 }),
            frameRate: 8,
            repeat: -1
        });

        this.weatherType = this.chooseRandomWeather();
        this.applyWeatherAndBackground(this.weatherType);
        
        this.terrainZones = this.physics.add.group();
        this.createPuddles(this.weatherType);
        this.createDecorations(this.weatherType);

        this.physics.add.overlap(this.player, this.terrainZones, this.onStepTerrain, null, this);
        this.lastStepTime = 0; 
        
        this.moveState = { up: false, down: false, left: false, right: false };

        this.input.keyboard.on('keydown', (event) => {
            if (this.isPaused || this.isGameOver) return;
            let key = event.key === ' ' ? 'SPACE' : event.key.toUpperCase();

            if (key === window.MOVE_CONFIG.melee) {
                this.shootBasicAttack();
                return; 
            }

            for (let skKey in SKILL_CAMPAIGN_CONFIG) {
                if (SKILL_CAMPAIGN_CONFIG[skKey].hotkey === key) {
                    this.checkAndCastSkill(skKey);
                    return;
                }
            }

            if (key === window.MOVE_CONFIG.up) this.moveState.up = true;
            if (key === window.MOVE_CONFIG.down) this.moveState.down = true;
            if (key === window.MOVE_CONFIG.left) this.moveState.left = true;
            if (key === window.MOVE_CONFIG.right) this.moveState.right = true;
        });

        this.input.keyboard.on('keyup', (event) => {
            let key = event.key === ' ' ? 'SPACE' : event.key.toUpperCase();
            
            if (key === window.MOVE_CONFIG.up) this.moveState.up = false;
            if (key === window.MOVE_CONFIG.down) this.moveState.down = false;
            if (key === window.MOVE_CONFIG.left) this.moveState.left = false;
            if (key === window.MOVE_CONFIG.right) this.moveState.right = false;
        });

        this.playerHealth = 100;
        this.isGameOver = false;
        this.isPaused = false;

        this.lastDirection = 'down'; // Hướng mặc định khi mới vào game
        this.lastAATime = 0;         // Thời gian hồi chiêu đánh thường
        
        this.drawHealthBar();
        this.createSkillUI();
        this.createPauseMenu();

        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        createMonsterAnimations(this);
        this.monsters = this.physics.add.group();
        
        for (let i = 0; i < 6; i++) {
            let mx = Phaser.Math.Between(100, 3900);
            let my = Phaser.Math.Between(100, 3900);
            
            // Sử dụng Class Monster
            let mon = new Monster(this, mx, my, 'monster1');
            this.monsters.add(mon);
        }

        this.basicAttacks = this.physics.add.group();

        // Xử lý đạn trúng quái
        this.physics.add.overlap(this.basicAttacks, this.monsters, (aa, monster) => {
            if (aa.active && monster.active && !monster.isDead) {
                aa.destroy();             // Xóa viên đạn
                monster.takeDamage(10);   // Gây 10 sát thương cho quái
            }
        }, null, this);
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
            puddle.setScale(Phaser.Math.FloatBetween(0.7, 1.5));
            
            // Sử dụng Hitbox HÌNH TRÒN nằm ở chính giữa vũng nước
            // Bán kính bằng 25% chiều rộng ảnh gốc (đường kính = 50%), đảm bảo phải đi hẳn vào trong mới kêu
            let radius = puddle.width * 0.25; 
            puddle.body.setCircle(radius, (puddle.width / 2) - radius, (puddle.height / 2) - radius);
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

        // ==========================================
        // HỆ THỐNG VẬT CẢN (SOLID DECORATIONS)
        // ==========================================
        let solidKeys = [];
        if (weather === 'normal') solidKeys = ['decor_normal1', 'decor_normal2', 'decor_normal3', 'decor_normal4'];
        else if (weather === 'rain') solidKeys = ['decor_rain1', 'decor_rain2', 'decor_rain3', 'decor_rain4'];
        else if (weather === 'snow') solidKeys = ['decor_snow1', 'decor_snow2', 'decor_snow3', 'decor_snow4'];
        else if (weather === 'desert') solidKeys = ['decor_desert1', 'decor_desert2', 'decor_desert3', 'decor_desert4'];

        // Tần suất xuất hiện ít đi
        const numSolidDecos = 10; 

        for (let i = 0; i < numSolidDecos; i++) {
            let px = Phaser.Math.Between(100, 3900);
            let py = Phaser.Math.Between(100, 3900);
            let key = Phaser.Math.RND.pick(solidKeys);           
            
            // [ĐÃ CHỈNH SỬA]: Dùng this.add.image để tạo hình ảnh thuần túy (Không có Hitbox, có thể đi xuyên)
            let deco = this.add.image(px, py, key);
            
            // Kích thước nhỏ lại (Thu nhỏ tỷ lệ xuống còn 40% đến 70% so với ảnh gốc)
            let randScale = Phaser.Math.FloatBetween(0.4, 0.7); 
            deco.setScale(randScale);
            
            // Căn chiều sâu (Z-index) để nhân vật đứng trước/sau vật thể một cách hợp lý
            deco.setDepth(py); 
        }
    }

    onStepTerrain(player, terrain) {
        if ((player.body.velocity.x !== 0 || player.body.velocity.y !== 0) && this.time.now - this.lastStepTime > 400) {
            this.lastStepTime = this.time.now;
            this.sound.play('step_water', { volume: 0.6 });

            // HIỆU ỨNG NƯỚC BẮN LÊN DƯỚI GÓT CHÂN
            // Tọa độ y cộng thêm 30 để hạt nước xuất phát từ dưới chân Pháp sư thay vì bụng
            let splash = this.add.particles(player.x, player.y + 45, 'rain', {
                speed: { min: 40, max: 90 },   // Lực văng nước mạnh hơn một chút
                angle: { min: 0, max: 360 },   // [QUAN TRỌNG]: Góc văng 360 độ tỏa ra mọi hướng
                gravityY: 250,                 // Trọng lực kéo các giọt nước rớt trở lại mặt đất
                scale: { start: 0.1, end: 0 }, // Thu nhỏ dần về 0
                alpha: { start: 0.7, end: 0 }, // Mờ dần đi
                lifespan: 400,                 // Thời gian tồn tại của giọt nước (0.4s)
                blendMode: 'NORMAL' 
            });
            
            // Đặt Depth cao hơn nhân vật một chút để nước che khuất chân khi văng lên
            splash.setDepth(player.y + 50); 
            
            // Phát nổ tạo ra 8 giọt nước bắn ra cùng lúc xung quanh
            splash.explode(8); 

            // Dọn dẹp bộ nhớ: Hủy hạt hệ thống này sau 0.5s để chống giật lag
            this.time.delayedCall(500, () => {
                if (splash) splash.destroy();
            });
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

    takeDamage(amount) {
        if (this.isGameOver) return;
        
        this.playerHealth -= amount;
        if (this.playerHealth < 0) this.playerHealth = 0;
        
        this.updateHealthBarWidth(this.playerHealth);
        
        // Hiệu ứng nhấp nháy đỏ khi bị đánh trúng
        this.player.setTint(0xff0000);
        this.time.delayedCall(200, () => this.player.clearTint());

        // Hiện số máu bị trừ bay lên
        let dmgText = this.add.text(this.player.x, this.player.y - 40, `-${amount}`, { fontSize: '24px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 3 }).setOrigin(0.5).setDepth(8000);
        this.tweens.add({ targets: dmgText, y: this.player.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

        // ==========================================
        // XỬ LÝ KHI NGƯỜI CHƠI TỬ TRẬN
        // ==========================================
        if (this.playerHealth <= 0) {
            this.isGameOver = true;
            this.player.anims.stop();
            this.physics.pause(); // Dừng toàn bộ hệ thống vật lý (Quái vật đứng im)

            // 1. Ẩn toàn bộ thanh máu của quái vật
            if (this.monsters) {
                this.monsters.getChildren().forEach(mon => {
                    if (mon.hpBarBg) mon.hpBarBg.setVisible(false);
                    if (mon.hpBarFill) mon.hpBarFill.setVisible(false);
                });
            }

            // Lấy tâm màn hình camera
            let cx = this.cameras.main.centerX;
            let cy = this.cameras.main.centerY;

            // 2. Tạo màn hình đen mờ che phủ
            this.add.graphics().fillStyle(0x000000, 0.75)
                .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
                .setScrollFactor(0).setDepth(29000);

            // 3. Hiển thị chữ Game Over
            this.add.text(cx, cy - 80, '💀 BẠN ĐÃ TỬ TRẬN 💀', { 
                fontSize: '60px', fill: '#ff0000', fontStyle: 'bold' 
            }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);

            // 4. Nút [ CHƠI LẠI ]
            let btnRestart = this.add.text(cx, cy + 30, '[ CHƠI LẠI ]', { 
                fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} 
            }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
            
            btnRestart.on('pointerdown', () => {
                if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
                this.scene.restart(); // Chơi lại map hiện tại
            });

            // 5. Nút [ TRANG CHỦ ]
            let btnHomeGameOver = this.add.text(cx, cy + 110, '[ TRANG CHỦ ]', { 
                fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} 
            }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
            
            btnHomeGameOver.on('pointerdown', () => {
                if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
                if (window.bgMusic) window.bgMusic.play();
                
                // Trở về HTML Trang chủ
                document.getElementById('home-screen').style.display = 'flex';
                setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
                setTimeout(() => { 
                    document.getElementById('game-container').style.display = 'none'; 
                    this.scene.start('default'); 
                }, 800);
            });
        }
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
        this.btnSetting.on('pointerdown', (pointer, localX, localY, e) => {
            if (e) e.stopPropagation();
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
            
            // 1. Kích hoạt lớp che của màn hình Trang chủ
            document.getElementById('home-screen').style.display = 'flex';
            setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
            
            // 2. Đợi 800ms cho màn hình tối hẳn lại rồi mới giấu Game và chuyển Scene
            setTimeout(() => { 
                document.getElementById('game-container').style.display = 'none'; 
                this.scene.start('default'); 
            }, 800);
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

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        let speed = 200;

        // 1. Xác định hướng bấm (-1, 0, hoặc 1)
        let dirX = 0, dirY = 0;
        
        if (this.moveState.left) dirX = -1;
        else if (this.moveState.right) dirX = 1;
        
        if (this.moveState.up) dirY = -1;
        else if (this.moveState.down) dirY = 1;

        // 2. [FIX ĐI CHÉO]: Chuẩn hóa Vector để đi chéo không bị nhanh hơn đi thẳng
        let moveVector = new Phaser.Math.Vector2(dirX, dirY);
        moveVector.normalize();
        
        // Áp dụng vận tốc
        this.player.setVelocity(moveVector.x * speed, moveVector.y * speed);
        this.player.setDepth(this.player.y);

        // 3. ĐIỀU KHIỂN HOẠT ẢNH (Ưu tiên nhìn ngang)
        if (dirX < 0) {
            this.player.anims.play('walk-left', true); 
            this.lastDirection = 'left';  // Lưu hướng trái
        } else if (dirX > 0) {
            this.player.anims.play('walk-right', true); 
            this.lastDirection = 'right'; // Lưu hướng phải
        } else if (dirY < 0) {
            this.player.anims.play('walk-up', true); 
            this.lastDirection = 'up';    // Lưu hướng lên
        } else if (dirY > 0) {
            this.player.anims.play('walk-down', true); 
            this.lastDirection = 'down';  // Lưu hướng xuống
        } else {
            this.player.anims.stop();
        }

        // Gọi AI cho tất cả quái vật đang sống
        this.monsters.getChildren().forEach(mon => {
            mon.updateAI(this.player);
        });

        // ==========================================
        // CẬP NHẬT ĐẾM NGƯỢC HỒI CHIÊU
        // ==========================================
        for (let key in SKILL_CAMPAIGN_CONFIG) {
            let skill = SKILL_CAMPAIGN_CONFIG[key];
            if (skill.currentCd > 0) {
                if (delta) skill.currentCd -= delta; 
                
                if (skill.currentCd <= 0) {
                    skill.currentCd = 0;
                    skill.ui.overlay.clear(); 
                    skill.ui.text.setVisible(false);
                    skill.ui.glow.setVisible(true);
                } else {
                    let progress = skill.currentCd / skill.cd; 
                    let startAngle = Phaser.Math.DegToRad(-90); 
                    let endAngle = startAngle + (Math.PI * 2 * progress); 
                    skill.ui.overlay.clear().fillStyle(0x000000, 0.75).beginPath()
                        .moveTo(skill.posX, skill.startY).arc(skill.posX, skill.startY, 28, startAngle, endAngle, false).closePath().fillPath();
                    skill.ui.text.setText(Math.ceil(skill.currentCd / 1000));
                }
            }
        }
    }

    // ==========================================
    // TẠO GIAO DIỆN HỒI CHIÊU (KỸ NĂNG VƯỢT ẢI)
    // ==========================================
    createSkillUI() {
        let screenW = this.cameras.main.width;
        let screenH = this.cameras.main.height;
        let startX = screenW / 2 - 300; 
        let startY = screenH - 60; 
        let spacing = 75; 
        let index = 0;

        for (let key in SKILL_CAMPAIGN_CONFIG) {
            let skill = SKILL_CAMPAIGN_CONFIG[key];
            let posX = startX + (index * spacing);
            skill.posX = posX; skill.startY = startY; 

            // Nền đen
            let bgCircle = this.add.graphics().setDepth(10000).setScrollFactor(0);
            bgCircle.fillStyle(0x000000, 0.6);
            bgCircle.fillCircle(posX, startY, 28);

            // Icon kỹ năng
            let icon = this.add.image(posX, startY, skill.icon).setDepth(10001).setScrollFactor(0);
            let scale = 35 / Math.max(icon.width, icon.height);
            icon.setScale(scale);

            // Lớp phủ đen khi hồi chiêu
            let cdOverlay = this.add.graphics().setDepth(10002).setScrollFactor(0);

            // Chữ số đếm ngược
            let cdText = this.add.text(posX, startY, '', { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 })
                .setOrigin(0.5).setDepth(10003).setScrollFactor(0).setVisible(false);

            // Vòng viền phát sáng (Level 0 - Màu Xanh Lục/Cyan)
            let glow = this.add.graphics().setDepth(10004).setScrollFactor(0);
            glow.lineStyle(3, 0x00ffff, 1);
            glow.strokeCircle(posX, startY, 29);

            // Phím tắt
            let hotkeyText = this.add.text(posX, startY - 45, skill.hotkey, { 
                fontSize: '18px', fill: '#ffcc00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
            }).setOrigin(0.5).setDepth(10005).setScrollFactor(0);

            skill.ui = { overlay: cdOverlay, text: cdText, glow: glow, hotkeyText: hotkeyText };
            index++;
        }
        window.refreshCampaignSkillHotkeysUI = () => {
            for (let k in SKILL_CAMPAIGN_CONFIG) {
                let ui = SKILL_CAMPAIGN_CONFIG[k].ui;
                // [ĐÃ FIX]: Thêm đuôi .active để kiểm tra xem Text đó còn tồn tại trên màn hình không
                // Tránh việc cố gắng đổi chữ của một Object đã bị destroy
                if (ui && ui.hotkeyText && ui.hotkeyText.active) {
                    ui.hotkeyText.setText(SKILL_CAMPAIGN_CONFIG[k].hotkey);
                }
            }
        };
    }

    checkAndCastSkill(skillKey) {
        let skill = SKILL_CAMPAIGN_CONFIG[skillKey];
        if (skill.currentCd > 0) return; // Đang hồi chiêu thì không cho bấm

        // Tạm thời log ra console để test. Các hàm bắn chiêu cụ thể ta sẽ ghép vào sau
        console.log(`Đã thi triển kỹ năng: ${skill.name} (Level ${skill.level})`);

        // Bắt đầu chu trình xoay hồi chiêu
        skill.currentCd = skill.cd;
        skill.ui.glow.setVisible(false);
        skill.ui.text.setVisible(true);
    }

    shootBasicAttack() {
        // Cooldown đánh thường: 300ms đánh 1 lần
        if (this.time.now - this.lastAATime < 300) return;
        this.lastAATime = this.time.now;

        let px = this.player.x;
        let py = this.player.y;
        let vx = 0, vy = 0;
        let speed = 500; // Tốc độ bay của đạn

        // Xác định vận tốc và tọa độ xuất phát dựa theo hướng mặt
        if (this.lastDirection === 'left') { vx = -speed; px -= 30; }
        else if (this.lastDirection === 'right') { vx = speed; px += 30; }
        else if (this.lastDirection === 'up') { vy = -speed; py -= 30; }
        else if (this.lastDirection === 'down') { vy = speed; py += 30; }

        let aa = this.basicAttacks.create(px, py, 'aa');
        
        // Căn chỉnh kích thước ảnh đạn cho vừa phải
        let scale = 40 / Math.max(aa.width, aa.height); 
        aa.setScale(scale);

        // Xoay đầu viên đạn theo đúng hướng bay
        if (vx > 0) aa.setRotation(Math.PI / 2);         // Bắn phải
        else if (vx < 0) aa.setRotation(-Math.PI / 2);   // Bắn trái
        else if (vy > 0) aa.setRotation(Math.PI);        // Bắn xuống

        aa.setVelocity(vx, vy);
        aa.setDepth(this.player.y + 10);

        // [GIỚI HẠN KHOẢNG CÁCH]: Viên đạn chỉ bay trong 0.45 giây rồi biến mất
        // (Khoảng cách bay = Tốc độ 500 * 0.45s = 225 pixel)
        this.time.delayedCall(600, () => {
            if (aa && aa.active) aa.destroy();
        });
    }
}