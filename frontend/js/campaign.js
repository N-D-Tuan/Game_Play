// file: js/campaign.js
import { SKILL_CAMPAIGN_CONFIG, EVO_COLORS, evolveSkill, castBasicAttack, handleBasicAttackCollision, castMeteorEvo, castSwordsEvo, castLightningEvo, castShieldEvo, triggerShieldExplosion, castHealEvo, castEarthEvo, castArrowsEvo, castAnchorEvo, castDollEvo } from './skills.js';
import { Player, createPlayerAnimations } from './player.js';
import { Monster1, createMonster1Animations } from './monster1.js';
import { Monster2, createMonster2Animations } from './monster2.js';
import { Monster3, createMonster3Animations } from './monster3.js';
import { Boss, createBossAnimations } from './boss.js';

export class CampaignScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CampaignScene' });
    }

    // ==========================================
    // NHẬN DỮ LIỆU TỪ MÀN TRƯỚC (QUẢN LÝ TIẾN TRÌNH)
    // ==========================================
    init(data) {
        // Nếu không có data truyền vào, mặc định là Ải 1 và Level 0
        this.currentStage = data.stage || 1;
        this.currentPlayerLevel = data.level || 0;
    }

    preload() {
        this.load.image('puddle1', '../assets/puddle1.png');
        this.load.image('puddle2', '../assets/puddle2.png');
        this.load.image('puddle3', '../assets/puddle3.png');
        this.load.image('puddle4', '../assets/puddle4.png'); 

        this.load.image('rain', '../assets/rain.png');
        for (let i = 1; i <= 3; i++) this.load.image('snow' + i, '../assets/snow' + i + '.png');
        
        let sandGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        sandGraphics.fillStyle(0xd2b48c, 1);
        sandGraphics.fillRect(0, 0, 6, 6);
        sandGraphics.generateTexture('sand', 6, 6);

        for (let i = 1; i <= 4; i++) this.load.image('tree' + i, '../assets/tree' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('tree_snow' + i, '../assets/tree_snow' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('grass' + i, '../assets/grass' + i + '.png');
        for (let i = 1; i <= 3; i++) this.load.image('rock' + i, '../assets/rock' + i + '.png');

        for (let i = 1; i <= 4; i++) this.load.image('decor_normal' + i, '../assets/decor_normal' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_desert' + i, '../assets/decor_desert' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_rain' + i, '../assets/decor_rain' + i + '.png');
        for (let i = 1; i <= 4; i++) this.load.image('decor_snow' + i, '../assets/decor_snow' + i + '.png');

        this.load.image('hp_frame', '../assets/hp_frame.png'); 
        this.load.image('aa0', '../assets/aa0.png');
        this.load.image('aa1', '../assets/aa1.png');
        this.load.image('aa2', '../assets/aa2.png');
        this.load.image('fireball', '../assets/fireball.png'); 
        this.load.image('sword', '../assets/sword.png'); 
        this.load.image('lightning1', '../assets/lightning1.png'); 
        this.load.image('shield', '../assets/shield.png'); 
        this.load.image('heal', '../assets/heal.png'); 
        this.load.image('earth1', '../assets/earth1.png'); 
        this.load.image('earth2', '../assets/earth2.png'); 
        this.load.image('earth3', '../assets/earth3.png'); 
        this.load.image('arrows', '../assets/arrows.png'); 
        this.load.image('arrows_special', '../assets/arrows_special.png');
        this.load.image('anchor', '../assets/anchor.png'); 
        this.load.image('doll', '../assets/doll.png');
        this.load.image('dragon_breath', '../assets/dragon_breath.png');
        this.load.image('start_boss1', '../assets/start_boss1.png');
        this.load.image('start_boss2', '../assets/start_boss2.png');
        this.load.image('icon_boss', '../assets/icon_boss.png');

        this.load.atlas('boss', '../assets/boss_spritesheet.png', '../assets/boss_spritesheet.json');

        this.load.audio('step_water', '../assets/step_water.mp3');
        this.load.audio('normal_bgm', '../assets/normal.mp3');
        this.load.audio('rain_bgm', '../assets/rain.mp3');
        this.load.audio('snow_bgm', '../assets/snow.mp3');
        this.load.audio('desert_bgm', '../assets/desert.mp3');
        this.load.audio('thunder', '../assets/thunder.mp3');

        this.load.spritesheet('player_anim', '../assets/player_spritesheet.png', { frameWidth: 60, frameHeight: 89 });
        this.load.spritesheet('monster1', '../assets/monster1_spritesheet.png', { frameWidth: 126, frameHeight: 37, margin: 2, spacing: 2 });
        this.load.spritesheet('monster2', '../assets/monster2_spritesheet.png', { frameWidth: 100, frameHeight: 70 });
        this.load.spritesheet('monster3', '../assets/monster3_spritesheet.png', { frameWidth: 96, frameHeight: 96 });
        
        // SPRITESHEET MỚI CHO RƯƠNG VÀ CỔNG
        this.load.spritesheet('chest', '../assets/chest_spritesheet.png', { frameWidth: 235, frameHeight: 353 });
        this.load.spritesheet('gateway', '../assets/gateway_spritesheet.png', { frameWidth: 50, frameHeight: 200 });
    }

    create() {
        if (window.bgMusic && window.bgMusic.isPlaying) window.bgMusic.stop();
        this.sound.stopAll(); 

        window.SKILL_CAMPAIGN_CONFIG = SKILL_CAMPAIGN_CONFIG;

        // ==========================================
        // KHÔI PHỤC KỸ NĂNG KHI VÀO MÀN
        // ==========================================
        for(let key in SKILL_CAMPAIGN_CONFIG) { 
            let skill = SKILL_CAMPAIGN_CONFIG[key];
            
            // Luôn luôn reset hồi chiêu về 0 để có thể dùng ngay lập tức khi qua màn
            skill.currentCd = 0; 
            
            // CHỈ reset level về 0 và thời gian hồi chiêu gốc nếu người chơi bắt đầu lại từ Ải 1
            if (this.currentStage === 1) {
                skill.level = 0;     
                if (skill.baseCd) {
                    skill.cd = skill.baseCd; 
                }
            }
        }

        // Tối màn hình dãn ra (Hiệu ứng Fade In đầu game)
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        this.physics.world.setBounds(0, 0, 4000, 4000);
        this.cameras.main.setBounds(0, 0, 4000, 4000);

        createPlayerAnimations(this);
        this.player = new Player(this, 2000, 2000);
        // Kế thừa Level từ màn trước
        this.player.aaLevel = this.currentPlayerLevel; 
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

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

            // Phím tắt đánh thường
            if (key === window.MOVE_CONFIG.melee) {
                this.shootBasicAttack();
                return; 
            }

            // Phím tắt tung chiêu
            for (let skKey in SKILL_CAMPAIGN_CONFIG) {
                if (SKILL_CAMPAIGN_CONFIG[skKey].hotkey === key) {
                    this.checkAndCastSkill(skKey);
                    return;
                }
            }

            // Phím di chuyển
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

        // ==========================================
        // CẬP NHẬT MÁU THEO TIẾN TRÌNH
        // ==========================================
        let hpLevels = [100, 150, 300];
        this.maxHealth = hpLevels[this.player.aaLevel] || 100;
        this.playerHealth = this.maxHealth; 

        this.isGameOver = false;
        this.isPaused = false;
        this.stageCleared = false; // Biến kiểm tra đã dọn sạch quái chưa
        this.chestSpawned = false; // Biến đánh dấu đã gọi rương chưa
        this.collectedTreasures = 0; // Đếm vật phẩm nhặt được

        this.isTransitioning = false;
        
        this.lastDirection = 'down'; 
        this.lastAATime = 0;         
        
        this.drawHealthBar();
        this.createSkillUI();
        this.createStageUI(); // Gọi UI hiển thị Tên Ải

        // Radar
        this.radarBg = this.add.graphics().setDepth(14000).setScrollFactor(0);
        this.radarDots = this.add.graphics().setDepth(14001).setScrollFactor(0);
        this.radarSize = 180;
        this.radarCx = this.cameras.main.width - this.radarSize / 2 - 30;
        this.radarCy = this.radarSize / 2 + 30;
        let startX = this.radarCx - this.radarSize / 2;
        let startY = this.radarCy - this.radarSize / 2;

        this.radarBg.fillStyle(0x1a1a1a, 0.85);
        this.radarBg.fillRect(startX, startY, this.radarSize, this.radarSize);
        this.radarBg.lineStyle(6, 0x000000, 1);
        this.radarBg.strokeRect(startX - 3, startY - 3, this.radarSize + 6, this.radarSize + 6);
        this.radarBg.lineStyle(2, 0x888888, 1);
        this.radarBg.strokeRect(startX - 3, startY - 3, this.radarSize + 6, this.radarSize + 6);
        this.radarBg.lineStyle(1, 0x00ff00, 0.1); 
        for(let i = 1; i < 10; i++) {
            let offset = (this.radarSize / 10) * i;
            this.radarBg.strokeLineShape(new Phaser.Geom.Line(startX + offset, startY, startX + offset, startY + this.radarSize));
            this.radarBg.strokeLineShape(new Phaser.Geom.Line(startX, startY + offset, startX + this.radarSize, startY + offset));
        }

        // Radar icon Boss
        this.bossRadarIcon = this.add.image(this.radarCx, this.radarCy, 'icon_boss')
            .setScrollFactor(0)
            .setOrigin(0.5)
            .setDepth(14002)
            .setVisible(false);
        this.bossRadarIcon.setScale(100 / Math.max(this.bossRadarIcon.width, this.bossRadarIcon.height));

        this.createPauseMenu();
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        // Khởi tạo hoạt ảnh quái, rương và cổng
        createMonster1Animations(this);
        createMonster2Animations(this);
        createMonster3Animations(this);
        createBossAnimations(this);
        
        this.anims.create({
            key: 'gateway-idle',
            frames: this.anims.generateFrameNumbers('gateway', { start: 0, end: 3 }),
            frameRate: 10, repeat: -1
        });

        // ==========================================
        // KHỞI TẠO QUÁI THEO TỪNG ẢI
        // ==========================================
        this.monsters = this.physics.add.group();
        let monCount = { m1: 0, m2: 0, m3: 0 };

        if (this.currentStage === 1) {
            //monCount.m1 = 10;
            monCount.m1 = 1;
        } else if (this.currentStage === 2) {
            //monCount.m1 = 15; monCount.m2 = 5;
            monCount.m1 = 0; monCount.m2 = 1;
        } else if (this.currentStage === 3) {
            //monCount.m1 = 20; monCount.m2 = 15; monCount.m3 = 5;
            monCount.m1 = 0; monCount.m2 = 0; monCount.m3 = 1;
        }

        for (let i = 0; i < monCount.m1; i++) {
            this.monsters.add(new Monster1(this, Phaser.Math.Between(100, 3900), Phaser.Math.Between(100, 3900)));
        }
        for (let i = 0; i < monCount.m2; i++) {
            this.monsters.add(new Monster2(this, Phaser.Math.Between(100, 3900), Phaser.Math.Between(100, 3900)));
        }
        for (let i = 0; i < monCount.m3; i++) {
            this.monsters.add(new Monster3(this, Phaser.Math.Between(100, 3900), Phaser.Math.Between(100, 3900)));
        }

        this.basicAttacks = this.physics.add.group();
        this.treasures = this.physics.add.group(); // Nhóm chứa vật phẩm rớt ra
        this.chestGroup = this.physics.add.group(); // Nhóm chứa rương
        this.gateGroup = this.physics.add.group(); // Nhóm chứa cổng

        // Xử lý đạn trúng quái
        this.physics.add.overlap(this.basicAttacks, this.monsters, handleBasicAttackCollision, null, this);
        
        // Xử lý nhặt vật phẩm
        this.physics.add.overlap(this.player, this.treasures, this.collectTreasure, null, this);
        
        // Xử lý tương tác Rương và Cổng
        this.physics.add.overlap(this.player, this.chestGroup, this.openChest, null, this);
        this.physics.add.overlap(this.player, this.gateGroup, this.enterGateway, null, this);
    }

    // ==========================================
    // TẠO UI THỂ HIỆN TIẾN TRÌNH MAP (Dark Fantasy / Pixel)
    // ==========================================
    createStageUI() {
        let cx = this.cameras.main.width / 2;
        
        // [ĐÃ SỬA]: Lưu bảng nền vào biến this.stageBgUI
        this.stageBgUI = this.add.graphics().setScrollFactor(0).setDepth(13000);
        this.stageBgUI.fillStyle(0x111111, 0.85);
        this.stageBgUI.fillRect(cx - 100, 10, 200, 45);
        this.stageBgUI.lineStyle(3, 0x8b0000, 1); // Viền đỏ thẫm
        this.stageBgUI.strokeRect(cx - 100, 10, 200, 45);

        // Chữ
        let stageText = `ẢI ${this.currentStage} / 3`;
        if (this.currentStage === 3) stageText = "ẢI CUỐI";
        
        this.stageTextUI = this.add.text(cx, 32, stageText, {
            fontSize: '24px', fill: '#ffcc00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(13001);
    }

    setUiVisibility(isVisible) {
        // Khóa hoặc Mở phím điều khiển
        this.input.keyboard.enabled = isVisible;
        
        // Ẩn/Hiện UI người chơi
        if (this.hpFrame) this.hpFrame.setVisible(isVisible);
        if (this.healthBarBg) this.healthBarBg.setVisible(isVisible);
        if (this.healthBarFill) this.healthBarFill.setVisible(isVisible);
        if (this.hpText) this.hpText.setVisible(isVisible);
        if (this.radarBg) this.radarBg.setVisible(isVisible);
        if (this.radarDots) this.radarDots.setVisible(isVisible);
        if (this.stageTextUI) this.stageTextUI.setVisible(isVisible);

        // Ẩn/Hiện cả cái bảng nền đen
        if (this.stageBgUI) this.stageBgUI.setVisible(isVisible); 
        if (this.stageTextUI) this.stageTextUI.setVisible(isVisible);
        
        for (let key in SKILL_CAMPAIGN_CONFIG) {
            let sk = SKILL_CAMPAIGN_CONFIG[key];
            if (sk.ui) {
                if (sk.ui.bgCircle) sk.ui.bgCircle.setVisible(isVisible);
                if (sk.ui.icon) sk.ui.icon.setVisible(isVisible);
                sk.ui.overlay.setVisible(isVisible);
                if (sk.ui.text) sk.ui.text.setVisible(isVisible && sk.currentCd > 0);
                sk.ui.glow.setVisible(isVisible);
                sk.ui.hotkeyText.setVisible(isVisible);
            }
        }
    }

    onBossIntroComplete(bossInstance) {
        this.setUiVisibility(true); // Bật lại UI
        
        // Hiện thanh máu của Boss lên
        bossInstance.bossUiBg.setVisible(true);
        bossInstance.bossUiFill.setVisible(true);
        bossInstance.bossNameText.setVisible(true);

        // Trả Camera lại cho Player
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    }

    resetPlayerCombatState() {
        if (!this.player) return;

        // Xóa khiên của người chơi
        if (this.player.shieldGroup) {
            this.tweens.killTweensOf(this.player.shieldGroup);
            this.player.shieldGroup.destroy();
            this.player.shieldGroup = null;
        }
        this.player.shieldCount = 0;
        this.player.shieldLevel = 0;

        // Xóa hiệu ứng buff tốc độ / hào quang
        if (this.player.buffTimer) {
            this.player.buffTimer.remove();
            this.player.buffTimer = null;
        }
        if (this.player.anchorBuffTimer) {
            this.player.anchorBuffTimer.remove();
            this.player.anchorBuffTimer = null;
        }
        if (this.player.buffAura) {
            this.tweens.killTweensOf(this.player.buffAura);
            this.player.buffAura.destroy();
            this.player.buffAura = null;
        }
        if (this.player.anchorBuffAura) {
            this.tweens.killTweensOf(this.player.anchorBuffAura);
            this.player.anchorBuffAura.destroy();
            this.player.anchorBuffAura = null;
        }
        this.player.speedMultiplier = 1;

        // Xóa tint tạm nếu còn còn dính
        this.player.clearTint();
    }

    // ==========================================
    // LOGIC RƯƠNG BÁU & CỔNG & VẬT PHẨM
    // ==========================================
    spawnChestAndGateway(x, y) {
        if (this.currentStage === 3) {
            // Nếu là màn cuối -> Xong là Thắng luôn
            this.showVictoryScreen();
            return;
        }

        // Tạo Rương (Ban đầu là frame 1 - Đóng)
        this.stageChest = this.chestGroup.create(x, y, 'chest', 1);
        this.stageChest.setScale(0.5); // Bạn tự chỉnh độ to nhỏ
        this.stageChest.setDepth(y);
        this.stageChest.chestState = 'closed'; // Trạng thái tự định nghĩa
    }

    openChest(player, chest) {
        if (chest.chestState === 'closed') {
            chest.chestState = 'opened';
            chest.setFrame(0); // Chuyển sang ảnh mở nắp
            chest.setX(chest.x - 15);

            // Rơi ra 5 vật phẩm
            let dropImage = this.currentStage === 1 ? 'aa1' : 'aa2';
            for (let i = 0; i < 5; i++) {
                // Tọa độ ngẫu nhiên xung quanh rương (bán kính 150px)
                let destX = chest.x + Phaser.Math.Between(-150, 150);
                let destY = chest.y + Phaser.Math.Between(-100, 150);
                
                // Khởi tạo đồ từ trong lòng rương
                let item = this.treasures.create(chest.x, chest.y, dropImage);
                item.setScale(0.1).setDepth(destY);
                
                // [QUAN TRỌNG]: Tắt va chạm để người chơi không ăn được lúc nó đang nảy lên
                item.body.enable = false; 

                // Tween 1: Đẩy sang ngang
                this.tweens.add({ targets: item, x: destX, duration: 600, ease: 'Linear' });
                
                // Tween 2: Nhảy vọt lên trên rồi rớt xuống đất
                this.tweens.add({
                    targets: item,
                    y: destY - 100, // Độ cao nảy lên
                    duration: 300,
                    yoyo: true, // Tự động rớt xuống lại
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        item.y = destY; 
                        item.body.enable = true; // Bật lại va chạm
                        item.body.reset(item.x, item.y); // Reset lại vùng hitbox bám theo ảnh
                    }
                });
            }
        }
    }

    collectTreasure(player, item) {
        item.destroy(); // Xóa ảnh trên map
        this.collectedTreasures++;
        
        // Hiệu ứng text nhặt đồ
        let txt = this.add.text(player.x, player.y - 30, '+1', { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setDepth(8000);
        this.tweens.add({ targets: txt, y: player.y - 80, alpha: 0, duration: 800, onComplete: () => txt.destroy() });

        // Khi nhặt đủ 5 cái -> Rương rỗng, Nâng cấp, Xuất hiện cổng
        if (this.collectedTreasures === 5 && this.stageChest && this.stageChest.chestState === 'opened') {
            this.stageChest.chestState = 'empty';
            this.stageChest.setFrame(2); // Đổi thành rương rỗng
            this.stageChest.setX(this.stageChest.x + 25);
            
            this.processLevelUp();

            // [ĐÃ SỬA]: Mở cổng CÁCH XA RƯƠNG 300px
            let gateX = this.stageChest.x + 300;
            // Nếu rương sát góc phải bản đồ quá thì đảo cổng sang bên trái
            if (gateX > 3800) gateX = this.stageChest.x - 300; 
            
            let gate = this.gateGroup.create(gateX, this.stageChest.y, 'gateway');
            gate.setScale(1.5);
            gate.setDepth(this.stageChest.y);
            gate.anims.play('gateway-idle', true);
        }
    }

    processLevelUp() {
        // Tăng cấp độ nhân vật
        this.currentPlayerLevel++;
        this.player.aaLevel = this.currentPlayerLevel;
        
        // Tăng giới hạn máu và hồi đầy
        let hpLevels = [100, 150, 300];
        this.maxHealth = hpLevels[this.currentPlayerLevel] || 300;
        this.playerHealth = this.maxHealth;
        this.updateHealthBarWidth(this.playerHealth);

        // Nâng cấp chiêu thức
        for (let skKey in SKILL_CAMPAIGN_CONFIG) {
            let skill = SKILL_CAMPAIGN_CONFIG[skKey];
            skill.level = this.currentPlayerLevel; 
            if (skill.ui && skill.ui.glow) {
                skill.ui.glow.clear();
                skill.ui.glow.lineStyle(3, EVO_COLORS[this.currentPlayerLevel], 1);
                skill.ui.glow.strokeCircle(skill.posX, skill.startY, 29);
            }
        }

        // Hiệu ứng chữ Level Up to giữa màn hình
        let lvlTxt = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '⚡ BẠN ĐÃ ĐƯỢC NÂNG CẤP! ⚡', { 
            fontSize: '40px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20000).setAlpha(0);

        this.tweens.add({
            targets: lvlTxt, alpha: 1, y: this.cameras.main.centerY - 50, duration: 800, yoyo: true, hold: 1500,
            onComplete: () => lvlTxt.destroy()
        });
    }

    enterGateway(player, gate) {
        if (this.isTransitioning) return; // Khóa không cho đè nhiều lần
        this.isTransitioning = true;
        
        // Tối màn hình đi
        this.cameras.main.fadeOut(1000, 0, 0, 0);

        // Đợi 1 giây rồi load màn mới
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
            // Truyền tham số Ải mới và Cấp độ qua cho Scene khởi tạo lại
            this.scene.restart({ stage: this.currentStage + 1, level: this.currentPlayerLevel });
        });
    }

    showVictoryScreen() {
        this.isGameOver = true; // Dừng mọi hoạt động
        this.physics.pause(); 
        
        let cx = this.cameras.main.centerX;
        let cy = this.cameras.main.centerY;

        this.add.graphics().fillStyle(0x000000, 0.75).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setScrollFactor(0).setDepth(29000);

        this.add.text(cx, cy - 80, '🏆 BẠN ĐÃ THẮNG! 🏆', { 
            fontSize: '60px', fill: '#00ff00', fontStyle: 'bold' 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);

        let btnRestart = this.add.text(cx, cy + 30, '[ CHƠI LẠI MÀN 1 ]', { 
            fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
        
        btnRestart.on('pointerdown', () => {
            if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
            this.scene.restart({ stage: 1, level: 0 }); // Chơi lại từ đầu
        });

        let btnHomeGameOver = this.add.text(cx, cy + 110, '[ TRANG CHỦ ]', { 
            fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
        
        btnHomeGameOver.on('pointerdown', () => {
            if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
            if (window.bgMusic) window.bgMusic.play();
            document.getElementById('home-screen').style.display = 'flex';
            setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
            setTimeout(() => { document.getElementById('game-container').style.display = 'none'; this.scene.start('default'); }, 800);
        });
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        let newDir = this.player.updateMovement(this.moveState);
        if (newDir) this.lastDirection = newDir;

        // KIỂM TRA QUÁI CHẾT ĐỂ HOÀN THÀNH ẢI
        let aliveMonsters = this.monsters.getChildren().filter(m => !m.isDead);
        if (aliveMonsters.length === 0 && !this.stageCleared) {
            this.stageCleared = true;

            // ==========================================
            // KHÓA CHÂN NHÂN VẬT NGAY LẬP TỨC TẠI ẢI 3
            // ==========================================
            if (this.currentStage === 3) {
                this.input.keyboard.enabled = false; // Khóa không cho bấm phím mới
                this.moveState = { up: false, down: false, left: false, right: false }; // Xóa bộ nhớ các phím đang giữ
            }

            this.time.delayedCall(1000, () => {
                if (this.currentStage === 3) {
                    // ==========================================
                    // HỒI TOÀN BỘ KỸ NĂNG & MÁU TRƯỚC KHI ĐÁNH BOSS
                    // ==========================================
                    for (let key in SKILL_CAMPAIGN_CONFIG) {
                        let skill = SKILL_CAMPAIGN_CONFIG[key];
                        skill.currentCd = 0; // Trả thời gian hồi chiêu về 0
                        if (skill.ui) {
                            skill.ui.overlay.clear(); 
                            skill.ui.text.setVisible(false);
                            skill.ui.glow.setVisible(true); // Sáng viền lên báo hiệu đã sẵn sàng
                        }
                    }
                    // Tiện tay bơm đầy máu cho người chơi để trận chiến công bằng nhất
                    this.playerHealth = this.maxHealth;
                    this.updateHealthBarWidth(this.playerHealth);

                    // ==========================================
                    // SPAWN BOSS CÁCH XA NỬA BẢN ĐỒ (~800px)
                    // ==========================================
                    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                    let bossX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * 800, 300, 3700);
                    let bossY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * 800, 300, 3700);
                    
                    this.resetPlayerCombatState();
                    this.setUiVisibility(false); // Tắt sạch UI chuẩn bị xem phim
                    
                    this.bossEntity = new Boss(this, bossX, bossY);
                    this.monsters.add(this.bossEntity); // Cho Boss vào chung nhóm quái để ăn đạn
                } else {
                    // Spawn Rương cho Màn 1 và 2 (Logic cũ giữ nguyên)
                    if (!this.chestSpawned) {
                        // Sinh rương ở bãi trống cách người chơi 300-450px thay vì trên xác quái
                        let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                        let distance = Phaser.Math.Between(300, 450);
                        
                        // Clamp để rương không bị văng ra ngoài ranh giới bản đồ
                        let dropX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 150, 3850);
                        let dropY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 150, 3850);

                        this.chestSpawned = true;
                        this.spawnChestAndGateway(dropX, dropY);
                    }
                }
            });
        }

        this.monsters.getChildren().forEach(mon => { mon.updateAI(this.player); });

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
                    skill.ui.overlay.clear().fillStyle(0x000000, 0.75).beginPath().moveTo(skill.posX, skill.startY).arc(skill.posX, skill.startY, 28, startAngle, endAngle, false).closePath().fillPath();
                    skill.ui.text.setText(Math.ceil(skill.currentCd / 1000));
                }
            }
        }

        this.updateRadar();
    }

    // (Giữ nguyên các hàm sinh map, thời tiết, radar, tạo thanh máu, menu pause và bắn kỹ năng bên dưới)
    chooseRandomWeather() { const weathers = ['normal', 'rain', 'snow', 'desert']; return weathers[Math.floor(Math.random() * weathers.length)]; }
    applyWeatherAndBackground(weather) {
        let screenW = this.cameras.main.width; let screenH = this.cameras.main.height;
        let volSlider = document.getElementById('volume-slider'); let currentVol = volSlider ? parseFloat(volSlider.value) : 0.5;
        if (weather === 'normal') { this.cameras.main.setBackgroundColor('#3b7a35'); window.activeCampaignBgm = this.sound.add('normal_bgm', { loop: true, volume: currentVol }); window.activeCampaignBgm.play(); } 
        else if (weather === 'rain') {
            this.cameras.main.setBackgroundColor('#1e3f20'); window.activeCampaignBgm = this.sound.add('rain_bgm', { loop: true, volume: currentVol }); window.activeCampaignBgm.play();
            let rainEmitter = this.add.particles(0, 0, 'rain', { x: { min: -100, max: screenW + 100 }, y: -50, lifespan: 2000, speedY: { min: 400, max: 600 }, speedX: { min: -100, max: -50 }, scale: { min: 0.05, max: 0.15 }, quantity: 12, blendMode: 'ADD', alpha: 0.5 });
            rainEmitter.setScrollFactor(0); 
        } else if (weather === 'snow') {
            this.cameras.main.setBackgroundColor('#eef2f5'); window.activeCampaignBgm = this.sound.add('snow_bgm', { loop: true, volume: currentVol }); window.activeCampaignBgm.play();
            ['snow1', 'snow2', 'snow3'].forEach(key => { let snowEmitter = this.add.particles(0, 0, key, { x: { min: -100, max: screenW + 100 }, y: -50, lifespan: 8000, speedY: { min: 100, max: 200 }, speedX: { min: -50, max: 50 }, scale: { min: 0.2, max: 0.5 }, quantity: 2, alpha: { start: 1, end: 0.1 } }); snowEmitter.setScrollFactor(0); });
        } else if (weather === 'desert') {
            this.cameras.main.setBackgroundColor('#c2b280'); window.activeCampaignBgm = this.sound.add('desert_bgm', { loop: true, volume: currentVol }); window.activeCampaignBgm.play();
            let sandEmitter = this.add.particles(0, 0, 'sand', { x: screenW + 50, y: { min: -50, max: screenH + 50 }, lifespan: 4000, speedX: { min: -400, max: -800 }, speedY: { min: -20, max: 20 }, scale: { min: 0.5, max: 1.5 }, quantity: 15, alpha: { start: 0.8, end: 0 } });
            sandEmitter.setScrollFactor(0); 
        }
    }

    createPuddles(weather) {
        const totalPuddles = (weather === 'rain') ? 150 : (weather === 'desert' ? 10 : 80);
        for (let i = 0; i < totalPuddles; i++) {
            let puddle = this.terrainZones.create(Phaser.Math.Between(100, 3900), Phaser.Math.Between(100, 3900), weather === 'snow' ? 'puddle4' : Phaser.Math.RND.pick(['puddle1', 'puddle2', 'puddle3']));
            puddle.setAlpha(0.6).setScale(Phaser.Math.FloatBetween(0.7, 1.5));
            let r = puddle.width * 0.25; puddle.body.setCircle(r, (puddle.width / 2) - r, (puddle.height / 2) - r);
        }
    }

    createDecorations(weather) {
        let trees = weather === 'snow' ? ['tree_snow1', 'tree_snow2', 'tree_snow3'] : ['tree1', 'tree2', 'tree3', 'tree4'];
        let rocks = ['rock1', 'rock2', 'rock3']; let grasses = ['grass1', 'grass2', 'grass3'];
        let cfg = { tree: {keys: trees, count: 120, s: [0.3, 0.6], t: 0xffffff}, rock: {keys: rocks, count: 50, s: [0.2, 0.5], t: 0xffffff}, grass: {keys: grasses, count: 300, s: [0.3, 0.6], t: 0xffffff} };
        if (weather === 'normal') { cfg.tree.count = 200; cfg.grass.count = 500; }
        else if (weather === 'rain') { cfg.tree.count = 80; cfg.grass.count = 200; cfg.grass.t = 0xaaffaa; }
        else if (weather === 'snow') { cfg.tree.count = 100; cfg.tree.s = [0.4, 0.7]; cfg.rock.count = 40; cfg.rock.t = 0xddddff; cfg.grass.count = 80; cfg.grass.t = 0xeeeeff; }
        else if (weather === 'desert') { cfg.tree.count = 20; cfg.tree.s = [0.3, 0.5]; cfg.tree.t = 0x8b4513; cfg.rock.count = 200; cfg.rock.t = 0xd2b48c; cfg.grass.count = 50; cfg.grass.t = 0xaaaa55; }
        [cfg.grass, cfg.rock, cfg.tree].forEach(c => {
            for (let i = 0; i < c.count; i++) {
                let py = Phaser.Math.Between(50, 3950);
                this.add.image(Phaser.Math.Between(50, 3950), py, Phaser.Math.RND.pick(c.keys)).setScale(Phaser.Math.FloatBetween(c.s[0], c.s[1])).setTint(c.t).setDepth(c.keys === grasses ? py - 20 : py);
            }
        });
        let sol = weather === 'normal' ? ['decor_normal1', 'decor_normal2', 'decor_normal3', 'decor_normal4'] : (weather === 'rain' ? ['decor_rain1', 'decor_rain2', 'decor_rain3', 'decor_rain4'] : (weather === 'snow' ? ['decor_snow1', 'decor_snow2', 'decor_snow3', 'decor_snow4'] : ['decor_desert1', 'decor_desert2', 'decor_desert3', 'decor_desert4']));
        for (let i = 0; i < 10; i++) { let py = Phaser.Math.Between(100, 3900); this.add.image(Phaser.Math.Between(100, 3900), py, Phaser.Math.RND.pick(sol)).setScale(Phaser.Math.FloatBetween(0.4, 0.7)).setDepth(py); }
    }

    onStepTerrain(player, terrain) {
        if ((player.body.velocity.x !== 0 || player.body.velocity.y !== 0) && this.time.now - this.lastStepTime > 400) {
            this.lastStepTime = this.time.now; this.sound.play('step_water', { volume: 0.6 });
            let splash = this.add.particles(player.x, player.y + 45, 'rain', { speed: { min: 40, max: 90 }, angle: { min: 0, max: 360 }, gravityY: 250, scale: { start: 0.1, end: 0 }, alpha: { start: 0.7, end: 0 }, lifespan: 400, blendMode: 'NORMAL' });
            splash.setDepth(player.y + 50).explode(8); this.time.delayedCall(500, () => { if (splash) splash.destroy(); });
        }
    }

    drawHealthBar() {
        const BX=219, BY=63, BW=307, BH=55, SL=39; 
        this.hpFrame = this.add.image(100, 20, 'hp_frame').setOrigin(0, 0).setScale(0.35).setDepth(10002).setScrollFactor(0);
        this.healthBarBg = this.add.graphics().fillStyle(0x222222, 1).setDepth(10000).setScrollFactor(0).beginPath().moveTo(BX+SL,BY).lineTo(BX+BW,BY).lineTo(BX+BW,BY+BH).lineTo(BX,BY+BH).closePath().fillPath();
        this.healthBarFill = this.add.graphics().setDepth(10001).setScrollFactor(0);
        this.hpText = this.add.text(175, 118, this.playerHealth, { fontSize: '26px', fill: '#ff3333', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10003).setScrollFactor(0);
        this.updateHealthBarWidth(this.playerHealth);
    }

    updateHealthBarWidth(v) {
        this.healthBarFill.clear(); if (v <= 0) { if(this.hpText) this.hpText.setText('0'); return; }
        let cw = (v / this.maxHealth) * 307;
        this.healthBarFill.fillStyle(0xff0000, 1).beginPath().moveTo(219+39, 63).lineTo(Math.max(219+39, 219+cw), 63).lineTo(219+cw, 63+55).lineTo(219, 63+55).closePath().fillPath();
        if(this.hpText) this.hpText.setText(Math.round(v));
    }

    takeDamage(amount) {
        if (this.isGameOver) return;
        if (this.player.shieldCount && this.player.shieldCount > 0) {
            this.player.shieldCount--;
            if (this.player.shieldGroup && this.player.shieldGroup.list.length > 0) {
                let sImg = this.player.shieldGroup.list[0];
                let breakFx = this.add.graphics().lineStyle(2, 0x00ffff, 1).strokeCircle(this.player.x + sImg.x, this.player.y + sImg.y, 20);
                this.tweens.add({ targets: breakFx, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => breakFx.destroy() }); sImg.destroy();
            }
            if (this.player.shieldCount === 0) { this.player.shieldGroup.destroy(); this.player.shieldGroup = null; if (this.player.shieldLevel === 2) triggerShieldExplosion(this, this.player.x, this.player.y); }
            return; 
        }
        this.playerHealth = Math.max(0, this.playerHealth - amount); this.updateHealthBarWidth(this.playerHealth);
        this.player.setTint(0xff0000); this.time.delayedCall(200, () => this.player.clearTint());
        let dmgText = this.add.text(this.player.x, this.player.y - 40, `-${amount}`, { fontSize: '24px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 3 }).setOrigin(0.5).setDepth(8000);
        this.tweens.add({ targets: dmgText, y: this.player.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

        if (this.playerHealth <= 0) {
            this.isGameOver = true; this.player.anims.stop(); this.physics.pause();
            this.monsters.getChildren().forEach(m => { if(m.hpBarBg) m.hpBarBg.setVisible(false); if(m.hpBarFill) m.hpBarFill.setVisible(false); });
            let cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;
            this.add.graphics().fillStyle(0x000000, 0.75).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setScrollFactor(0).setDepth(29000);
            this.add.text(cx, cy - 80, '💀 BẠN ĐÃ TỬ TRẬN 💀', { fontSize: '60px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);
            
            // Sửa nút chơi lại về màn 1 (reset tiến trình)
            let btnR = this.add.text(cx, cy + 30, '[ CHƠI LẠI MÀN 1 ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
            btnR.on('pointerdown', () => { if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); this.scene.restart({stage: 1, level: 0}); });
            let btnH = this.add.text(cx, cy + 110, '[ TRANG CHỦ ]', { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
            btnH.on('pointerdown', () => { if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); if (window.bgMusic) window.bgMusic.play(); document.getElementById('home-screen').style.display = 'flex'; setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10); setTimeout(() => { document.getElementById('game-container').style.display = 'none'; this.scene.start('default'); }, 800); });
        }
    }

    createPauseMenu() {
        let cx = this.cameras.main.width / 2; let cy = this.cameras.main.height / 2;
        this.add.graphics().fillStyle(0x000000, 0.7).fillRoundedRect(20, 20, 50, 50, 10).setDepth(16000).setScrollFactor(0);
        this.add.text(25, 30, '⏸️', { fontSize: '30px' }).setInteractive({ useHandCursor: true }).setDepth(16001).setScrollFactor(0).on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.togglePause(); });
        this.pauseOverlay = this.add.graphics().fillStyle(0x000000, 0.85).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(15000).setScrollFactor(0);
        this.txtPause = this.add.text(cx, cy - 150, 'TẠM DỪNG', { fontSize: '60px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(15001).setScrollFactor(0);
        this.btnResume = this.add.text(cx, cy - 30, '[ TIẾP TỤC ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', (p,x,y,e) => { e.stopPropagation(); this.togglePause(); });
        this.btnInventory = this.add.text(cx, cy + 40, '[ KHO ĐỒ ]', { fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', () => alert("Kho đồ đang phát triển!"));
        this.btnSetting = this.add.text(cx, cy + 110, '[ CÀI ĐẶT ]', { fontSize: '32px', fill: '#00ccff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', (p,x,y,e) => { if(e) e.stopPropagation(); document.getElementById('settings-modal').style.display = 'flex'; this.input.enabled = false; });
        this.btnChangeMap = this.add.text(cx, cy + 180, '[ CHƠI LẠI MÀN 1 ]', { fontSize: '32px', fill: '#ff8800', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', () => { this.physics.resume(); this.tweens.resumeAll(); if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); this.scene.restart({stage: 1, level: 0}); });
        this.btnHome = this.add.text(cx, cy + 250, '[ TRANG CHỦ ]', { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', () => { this.input.enabled = false; this.setPauseMenuVisible(false); this.physics.resume(); this.tweens.resumeAll(); if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); if (window.bgMusic) window.bgMusic.play(); document.getElementById('home-screen').style.display = 'flex'; setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10); setTimeout(() => { document.getElementById('game-container').style.display = 'none'; this.scene.start('default'); }, 800); });
        this.setPauseMenuVisible(false);
    }

    setPauseMenuVisible(v) { 
        this.pauseOverlay.setVisible(v); 
        if (v) this.pauseOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains); else this.pauseOverlay.disableInteractive();
        this.txtPause.setVisible(v); this.btnResume.setVisible(v); this.btnInventory.setVisible(v); this.btnSetting.setVisible(v); this.btnChangeMap.setVisible(v); this.btnHome.setVisible(v); 
    }
    togglePause() { if (this.isGameOver) return; this.isPaused = !this.isPaused; if (this.isPaused) { this.physics.pause(); this.tweens.pauseAll(); this.setPauseMenuVisible(true); } else { this.physics.resume(); this.tweens.resumeAll(); this.setPauseMenuVisible(false); } }

    createSkillUI() {
        let cx = this.cameras.main.width / 2 - 300, cy = this.cameras.main.height - 60, i = 0;
        for (let key in SKILL_CAMPAIGN_CONFIG) {
            let sk = SKILL_CAMPAIGN_CONFIG[key], px = cx + (i * 75); sk.posX = px; sk.startY = cy; 
            
            // Gán nền đen và icon vào biến để dễ quản lý
            let bgCircle = this.add.graphics().setDepth(10000).setScrollFactor(0).fillStyle(0x000000, 0.6).fillCircle(px, cy, 28);
            let ico = this.add.image(px, cy, sk.icon).setDepth(10001).setScrollFactor(0); 
            ico.setScale(35 / Math.max(ico.width, ico.height));
            
            let ov = this.add.graphics().setDepth(10002).setScrollFactor(0);
            let txt = this.add.text(px, cy, '', { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10003).setScrollFactor(0).setVisible(false);
            let gl = this.add.graphics().setDepth(10004).setScrollFactor(0).lineStyle(3, EVO_COLORS[sk.level || 0], 1).strokeCircle(px, cy, 29);
            let hk = this.add.text(px, cy - 45, sk.hotkey, { fontSize: '18px', fill: '#ffcc00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10005).setScrollFactor(0);
            
            // Đưa bgCircle và icon vào trong object sk.ui
            sk.ui = { bgCircle: bgCircle, icon: ico, overlay: ov, text: txt, glow: gl, hotkeyText: hk }; 
            i++;
        }
    }

    checkAndCastSkill(skKey) {
        let sk = SKILL_CAMPAIGN_CONFIG[skKey]; if (sk.currentCd > 0) return;
        if (skKey === 'meteor') this.shootMeteor(); else if (skKey === 'swords') this.shootSwords(); else if (skKey === 'lightning') this.shootLightning(); else if (skKey === 'shield') this.shootShield(); else if (skKey === 'heal') this.shootHeal(); else if (skKey === 'earth') this.shootEarth(); else if (skKey === 'arrows') this.shootArrows(); else if (skKey === 'anchor') this.shootAnchor(); else if (skKey === 'doll') this.shootDoll();
        sk.currentCd = sk.cd; sk.ui.glow.setVisible(false); sk.ui.text.setVisible(true);
    }

    // ==========================================
    // HÀM VẼ CÁC CHẤM TRÊN RADAR
    // ==========================================
    updateRadar() {
        if (!this.radarDots) return; 
        this.radarDots.clear(); 
        
        let sc = 180 / 4000;
        let rX = this.radarCx - 90;
        let rY = this.radarCy - 90;
        
        // 1. Vẽ Quái vật (Pixel VUÔNG Đỏ)
        if (this.bossRadarIcon) this.bossRadarIcon.setVisible(false);
        this.radarDots.fillStyle(0xff0000, 1);
        this.monsters.getChildren().forEach(m => { 
            if (m.active && !m.isDead) {
                if (m instanceof Boss && this.bossRadarIcon) {
                    this.bossRadarIcon.setPosition(rX + (m.x * sc), rY + (m.y * sc));
                    this.bossRadarIcon.setVisible(true);
                } else if (m instanceof Boss) {
                    // Fallback nếu icon chưa sẵn sàng
                    this.radarDots.fillStyle(0x8a2be2, 1); // Tím Boss
                    this.radarDots.fillRect(rX + (m.x * sc) - 6, rY + (m.y * sc) - 6, 12, 12);
                } else {
                    // Quái thường
                    this.radarDots.fillStyle(0xff0000, 1);
                    this.radarDots.fillRect(rX + (m.x * sc) - 2, rY + (m.y * sc) - 2, 4, 4); 
                }
            }
        });
        
        // 2. Vẽ Rương Báu (Pixel VUÔNG Vàng Gold)
        if (this.stageChest && this.stageChest.active && this.stageChest.chestState !== 'empty') {
            this.radarDots.fillStyle(0xffd700, 1); 
            this.radarDots.fillRect(rX + (this.stageChest.x * sc) - 3, rY + (this.stageChest.y * sc) - 3, 6, 6);
        }

        // ==========================================
        // 3. VẼ CỔNG QUA MÀN (Pixel VUÔNG Xanh Biển)
        // ==========================================
        this.radarDots.fillStyle(0x00aaff, 1);
        if (this.gateGroup) {
            this.gateGroup.getChildren().forEach(gate => {
                if (gate.active) {
                    // Vẽ cổng to bằng rương (6x6) để dễ nhìn
                    this.radarDots.fillRect(rX + (gate.x * sc) - 3, rY + (gate.y * sc) - 3, 6, 6);
                }
            });
        }

        // 4. Vẽ Người chơi (Pixel VUÔNG Xanh lá, có viền đen)
        let px = rX + (this.player.x * sc);
        let py = rY + (this.player.y * sc);
        
        this.radarDots.fillStyle(0x000000, 1).fillRect(px - 4, py - 4, 8, 8); 
        this.radarDots.fillStyle(0x00ff00, 1).fillRect(px - 3, py - 3, 6, 6);
    }

    shootBasicAttack() { castBasicAttack(this, this.player, this.lastDirection); }
    shootMeteor() { castMeteorEvo(this, this.player); }
    shootSwords() { castSwordsEvo(this, this.player); }
    shootLightning() { castLightningEvo(this, this.player); }
    shootShield() { castShieldEvo(this, this.player); }
    shootHeal() { castHealEvo(this, this.player); }
    shootEarth() { castEarthEvo(this, this.player); }
    shootArrows() { castArrowsEvo(this, this.player); }
    shootAnchor() { castAnchorEvo(this, this.player); }
    shootDoll() { castDollEvo(this, this.player); }
}