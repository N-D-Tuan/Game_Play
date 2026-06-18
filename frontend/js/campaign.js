import { SKILL_CAMPAIGN_CONFIG, EVO_COLORS, evolveSkill, castBasicAttack, handleBasicAttackCollision, castMeteorEvo, castSwordsEvo, castLightningEvo, castShieldEvo, triggerShieldExplosion, castHealEvo, castEarthEvo, castArrowsEvo, castAnchorEvo, castDollEvo } from './skills.js';
import { Player, createPlayerAnimations } from './player.js';
import { Monster1, createMonster1Animations } from './monster1.js';
import { Monster2, createMonster2Animations } from './monster2.js';
import { Monster3, createMonster3Animations } from './monster3.js';
import { Boss, createBossAnimations } from './boss.js';
import { CompanionPet } from './pet.js';
import { getPetDynamicBuffs, executePetActiveSkill, triggerPetPassiveOnCrit, triggerPetPassiveOnHit } from './pet_skills.js';

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

        // NHẬN LẠI TÚI ĐỒ TỪ MÀN TRƯỚC
        this.inheritedLoot = data.loot || [];
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
        this.load.atlas('rong_lua_atlas', '../assets/pets/rong_lua/spritesheet_rong_lua_idle.png', '../assets/pets/rong_lua/spritesheet_rong_lua_idle.json');

        this.load.audio('step_water', '../assets/step_water.mp3');
        this.load.audio('normal_bgm', '../assets/normal.mp3');
        this.load.audio('rain_bgm', '../assets/rain.mp3');
        this.load.audio('snow_bgm', '../assets/snow.mp3');
        this.load.audio('desert_bgm', '../assets/desert.mp3');
        this.load.audio('thunder', '../assets/thunder.mp3');
        this.load.audio('rong_ngam', '../assets/pets/rong_lua/rong_ngam.mp3');

        this.load.spritesheet('player_anim', '../assets/player_spritesheet.png', { frameWidth: 60, frameHeight: 89 });
        this.load.spritesheet('monster1', '../assets/monster1_spritesheet.png', { frameWidth: 126, frameHeight: 37, margin: 2, spacing: 2 });
        this.load.spritesheet('monster2', '../assets/monster2_spritesheet.png', { frameWidth: 100, frameHeight: 70 });
        this.load.spritesheet('monster3', '../assets/monster3_spritesheet.png', { frameWidth: 96, frameHeight: 96 });
        
        this.load.spritesheet('chest', '../assets/chest_spritesheet.png', { frameWidth: 235, frameHeight: 353 });
        this.load.spritesheet('gateway', '../assets/gateway_spritesheet.png', { frameWidth: 50, frameHeight: 200 });

        this.load.image('random', '../assets/items/random.png');

        this.load.image('egg', '../assets/pets/egg/egg.png');
        this.load.image('crack', '../assets/pets/egg/crack.png');
        this.load.image('egg_piece', '../assets/pets/egg/egg_piece.png');

        if (window.equippedPet) {
            let pInfo = window.equippedPet.pet;
            let lvl = window.equippedPet.level;            
            
            // Lấy tên file ảnh, nếu DB thiếu thì dùng tạm ảnh Non để không bị lỗi
            let icon1 = pInfo.icon_non;
            let icon2 = pInfo.icon_thieu_nien || icon1;
            let icon3 = pInfo.icon_truong_thanh || icon1;

            // Load 3 ảnh vào bộ nhớ với 3 Key phân biệt
            if (!this.textures.exists(`pet_ui_${pInfo.pet_code}_1`)) this.load.image(`pet_ui_${pInfo.pet_code}_1`, `../assets/pets/${pInfo.pet_code}/${icon1}`);
            if (!this.textures.exists(`pet_ui_${pInfo.pet_code}_2`)) this.load.image(`pet_ui_${pInfo.pet_code}_2`, `../assets/pets/${pInfo.pet_code}/${icon2}`);
            if (!this.textures.exists(`pet_ui_${pInfo.pet_code}_3`)) this.load.image(`pet_ui_${pInfo.pet_code}_3`, `../assets/pets/${pInfo.pet_code}/${icon3}`);
            
            // Lưu lại Key của Avatar để vẽ vòng tròn chính
            let stageNum = lvl >= 100 ? 3 : (lvl >= 50 ? 2 : 1);
            this.currentPetUiKey = `pet_ui_${pInfo.pet_code}_${stageNum}`;
        }
    }

    create() {
        if (window.bgMusic && window.bgMusic.isPlaying) window.bgMusic.stop();
        this.sound.stopAll(); 

        window.SKILL_CAMPAIGN_CONFIG = SKILL_CAMPAIGN_CONFIG;

        this.tabKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.TAB
        );

        const canvas = this.game.canvas;

        if (canvas) {
            canvas.tabIndex = 1;
            canvas.style.outline = 'none';

            setTimeout(() => {
                canvas.focus();
            }, 100);
        }

        if (canvas) {

            canvas.addEventListener('mouseenter', () => {

                canvas.focus();

                if (this.input && this.input.keyboard) {
                    this.input.keyboard.enabled = true;
                }
            });

        }

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
        this.clickDestination = null;
        this.clickMarker = null;
        this.cameraFollowedByMouse = false;
        this.cameraPanningActive = false;
        this.cameraPanDX = 0;
        this.cameraPanDY = 0;
        this.cameraPanThreshold = 50; // Khoảng cách cách rìa màn hình để bắt đầu di chuyển
        this.cameraPanSpeed = 1;    // Độ nhạy camera (pixels/ms)

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

            if (this.petCampaignSkills) {
                for (let pKey in this.petCampaignSkills) {
                    if (key === window.PET_SKILL_HOTKEYS[pKey]) {
                        let sk = this.petCampaignSkills[pKey];
                        if (sk.currentCd <= 0) {
                            
                            // GỌI HÀM TUNG CHIÊU TỪ PET_SKILLS.JS
                            executePetActiveSkill(this, window.equippedPet.pet.pet_code, sk.reqLvl);
                            
                            sk.currentCd = sk.cd; // Reset hồi chiêu
                            sk.ui.text.setVisible(true);
                        }
                        return;
                    }
                }
            }
        });

        this.input.keyboard.on('keyup', (event) => {
            let key = event.key === ' ' ? 'SPACE' : event.key.toUpperCase();
            if (key === window.MOVE_CONFIG.up) this.moveState.up = false;
            if (key === window.MOVE_CONFIG.down) this.moveState.down = false;
            if (key === window.MOVE_CONFIG.left) this.moveState.left = false;
            if (key === window.MOVE_CONFIG.right) this.moveState.right = false;
        });

        if (this.input && this.input.mouse && this.input.mouse.disableContextMenu) {
            this.input.mouse.disableContextMenu();
        }

        this.input.on('pointermove', (pointer) => {
            if (this.isPaused || this.isGameOver) return;
            if (typeof pointer.x !== 'number' || typeof pointer.y !== 'number') return;
            this.updateCameraPanState(pointer);
        });

        this.input.on('pointerout', () => {
            this.cameraPanDX = 0;
            this.cameraPanDY = 0;
            this.cameraPanningActive = false;
        });
        
        // Xóa kẹt phím khi mất tiêu điểm
        window.addEventListener('blur', () => {
            this.moveState.up = false; this.moveState.down = false;
            this.moveState.left = false; this.moveState.right = false;
        });

        window.addEventListener('focus', () => {

            if (this.input && this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }

            if (this.game && this.game.canvas) {
                this.game.canvas.focus();
            }
        });

        this.input.on('pointerdown', (pointer) => {
            // ÉP TRÌNH DUYỆT TRẢ LẠI BÀN PHÍM CHO GAME
            window.focus(); 
            if (this.game && this.game.canvas) {
                this.game.canvas.focus();
            }

            if (this.isPaused || this.isGameOver) return;
            if (this.isPointerInRadar(pointer)) return;

            if (pointer.rightButtonDown()) {
                if (pointer.event && typeof pointer.event.preventDefault === 'function') {
                    pointer.event.preventDefault();
                    pointer.event.stopPropagation();
                }

                if (pointer.x > this.cameras.main.width - 20) return;

                this.moveState.up = false;
                this.moveState.down = false;
                this.moveState.left = false;
                this.moveState.right = false;

                this.clickDestination = { x: pointer.worldX, y: pointer.worldY };
                this.createClickMarker(this.clickDestination.x, this.clickDestination.y);
                return;
            }

            
        });

        // Ngăn context menu khi click chuột phải
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        if (this.input && this.input.mouse && this.input.mouse.disableContextMenu) {
            this.input.mouse.disableContextMenu();
        }

        // ==========================================
        // CẬP NHẬT MÁU THEO TIẾN TRÌNH
        // ==========================================
        this.maxHealth = window.playerStats ? window.playerStats.hp : 1000;
        this.playerHealth = this.maxHealth;

        this.isGameOver = false;
        this.isPaused = false;
        this.stageCleared = false; // Biến kiểm tra đã dọn sạch quái chưa
        this.chestSpawned = false; 
        this.bossChestSpawned = false;
        this.bossEntity = null;

        this.sessionLoot = [...this.inheritedLoot]; // Túi đồ tạm: Chứa trang bị nhặt được trong màn này
        this.equipments = this.physics.add.group(); // Nhóm vật lý cho Trang bị rơi ra
        
        // Xử lý nhặt trang bị (Khác với nhặt ngọc)
        this.physics.add.overlap(this.player, this.equipments, this.collectEquipment, null, this);

        this.isTransitioning = false;
        
        this.lastDirection = 'down'; 
        this.lastAATime = 0;         
        
        this.drawHealthBar();
        this.createSkillUI();
        this.createStageUI();
        this.createPetCampaignUI();
        this.createBagUI();
        // Cập nhật ngay con số hiển thị trên túi UI
        if (this.bagCountText) this.bagCountText.setText(this.sessionLoot.length);

        // Radar
        this.radarBg = this.add.graphics().setDepth(14000).setScrollFactor(0);
        this.radarDots = this.add.graphics().setDepth(14001).setScrollFactor(0);
        this.radarSize = 180;
        this.radarOffset = 60;
        this.radarDragActive = false;
        this.radarDragLastX = 0;
        this.radarDragLastY = 0;
        this.radarCx = this.cameras.main.width - this.radarSize / 2 - this.radarOffset;
        this.radarCy = this.radarSize / 2 + this.radarOffset;
        let startX = this.radarCx - this.radarSize / 2;
        let startY = this.radarCy - this.radarSize / 2;
        this.radarBounds = new Phaser.Geom.Rectangle(startX, startY, this.radarSize, this.radarSize);

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

        this.radarZone = this.add.zone(startX, startY, this.radarSize, this.radarSize)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(14003)
            .setInteractive()
            .on('pointerdown', (pointer) => this.onRadarPointerDown(pointer))
            .on('pointermove', (pointer) => this.onRadarPointerMove(pointer))
            .on('pointerup', () => this.onRadarPointerUp())
            .on('pointerout', () => this.onRadarPointerUp());

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
            key: 'rong_lua_anim',
            frames: this.anims.generateFrameNames('rong_lua_atlas', { prefix: 'rong_lua_idle_', start: 1, end: 4, suffix: '.png' }),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'gateway-idle',
            frames: this.anims.generateFrameNumbers('gateway', { start: 0, end: 3 }),
            frameRate: 10, repeat: -1
        });

        // ==========================================
        // HỆ THỐNG HỒI MÁU THEO GIÂY (HP REGEN)
        // ==========================================
        this.time.addEvent({
            delay: 1000, // Cứ 1 giây (1000ms) chạy 1 lần
            callback: () => {
                // Không hồi máu nếu đang chết hoặc đang tạm dừng
                if (this.isGameOver || this.isPaused || this.playerHealth <= 0) return;

                // Lấy chỉ số Hồi máu từ Balo
                let baseRegen = window.playerStats ? window.playerStats.hpRegen : 5;
                
                // LẤY BUFF ĐỘNG TỪ PET
                let dynamicBuffs = { hpRegen: 0 };
                if (window.equippedPet) {
                    dynamicBuffs = getPetDynamicBuffs(this, window.equippedPet.pet.pet_code, window.equippedPet.level);
                }
                
                let regenAmount = baseRegen + dynamicBuffs.hpRegen;
                
                if (regenAmount > 0 && this.playerHealth < this.maxHealth) {
                    this.playerHealth = Math.min(this.maxHealth, this.playerHealth + regenAmount);
                    this.updateHealthBarWidth(this.playerHealth);
                    
                    // Hiện số máu hồi màu xanh lá nhảy lên đầu nhân vật
                    let healText = this.add.text(this.player.x, this.player.y - 30, `+${regenAmount}`, { 
                        fontSize: '18px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
                    }).setOrigin(0.5).setDepth(8000);
                    this.tweens.add({ targets: healText, y: this.player.y - 70, alpha: 0, duration: 1000, onComplete: () => healText.destroy() });
                }
            },
            callbackScope: this,
            loop: true
        });

        // ==========================================
        // KHỞI TẠO QUÁI THEO TỪNG ẢI
        // ==========================================
        this.monsters = this.physics.add.group();
        let monCount = { m1: 0, m2: 0, m3: 0 };

        if (this.currentStage === 1) {
            monCount.m1 = 10;
        } else if (this.currentStage === 2) {
            monCount.m1 = 20; monCount.m2 = 5;
        } else if (this.currentStage === 3) {
            monCount.m1 = 35; monCount.m2 = 20; monCount.m3 = 5;
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
        this.chestGroup = this.physics.add.group(); // Nhóm chứa rương
        this.gateGroup = this.physics.add.group(); // Nhóm chứa cổng

        // Xử lý đạn trúng quái
        this.physics.add.overlap(this.basicAttacks, this.monsters, handleBasicAttackCollision, null, this);
        
        
        // Xử lý tương tác Rương và Cổng
        this.physics.add.overlap(this.player, this.chestGroup, this.openChest, null, this);
        this.physics.add.overlap(this.player, this.gateGroup, this.enterGateway, null, this);
    }

    createPetCampaignUI() {
        if (!window.equippedPet) return;
        
        let cx = this.cameras.main.width - 95;
        let cy = this.cameras.main.height - 95;
        let pInfo = window.equippedPet.pet;
        let lvl = window.equippedPet.level;
        
        // 1. Vẽ Vòng tròn Avatar của Pet (Góc dưới cùng bên phải)
        this.petAvatarBg = this.add.circle(cx, cy, 50, 0x111111, 0.9).setDepth(14000).setScrollFactor(0).setStrokeStyle(3, 0x00ffcc);
        this.petAvatarImg = this.add.image(cx, cy, this.currentPetUiKey).setDepth(14001).setScrollFactor(0);
        this.petAvatarImg.setScale(75 / Math.max(this.petAvatarImg.width, this.petAvatarImg.height));

        // 2. Vẽ các Kỹ năng Chủ động (Chỉ vẽ nếu đã đủ cấp 50 hoặc 100)
        this.petCampaignSkills = {};
        let pSkills = window.PET_SKILL_DATA[pInfo.pet_code] || window.PET_SKILL_DATA['default'];
        
        // Thiết kế vị trí 2 cục kỹ năng xòe ra quanh Avatar
        let skillConfigs = [
            { req: 50, key: 'pet_skill_1', offsetX: -100, offsetY: 25 },
            { req: 100, key: 'pet_skill_2', offsetX: -25, offsetY: -100 }
        ];
        
        skillConfigs.forEach(conf => {
            if (lvl >= conf.req) {
                let skX = cx + conf.offsetX; let skY = cy + conf.offsetY;
                let skData = pSkills[conf.req];
                
                // Nền
                let bgCircle = this.add.circle(skX, skY, 36, 0x000000, 0.7).setDepth(14000).setScrollFactor(0).setStrokeStyle(2, 0xffcc00);
                
                // Chọn đúng hình ảnh theo cấp độ yêu cầu của Kỹ năng
                let skillStageNum = conf.req === 100 ? 3 : (conf.req === 50 ? 2 : 1);
                let skillIconKey = `pet_ui_${pInfo.pet_code}_${skillStageNum}`;
                if (!this.textures.exists(skillIconKey)) skillIconKey = this.currentPetUiKey;

                // Vẽ Icon kỹ năng
                let ico = this.add.image(skX, skY, skillIconKey).setDepth(14001).setScrollFactor(0);
                ico.setScale(45 / Math.max(ico.width, ico.height));

                // Chữ Phím tắt (O, P)
                let hkTxt = this.add.text(skX + 36, skY + 36, window.PET_SKILL_HOTKEYS[conf.key], { 
                    fontSize: '14px', fill: '#00ffcc', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 
                }).setOrigin(0.5).setDepth(14005).setScrollFactor(0);
                
                // Hiệu ứng Cooldown
                let overlay = this.add.graphics().setDepth(14003).setScrollFactor(0);
                let cdTxt = this.add.text(skX, skY, '', { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(14004).setScrollFactor(0).setVisible(false);
                let glow = this.add.graphics().setDepth(14002).setScrollFactor(0).lineStyle(3, 0xffcc00, 1).strokeCircle(skX, skY, 37);
                
                this.petCampaignSkills[conf.key] = {
                    data: skData, reqLvl: conf.req, x: skX, y: skY, currentCd: 0, cd: skData.cd,
                    ui: { bgCircle: bgCircle, icon: ico, overlay: overlay, text: cdTxt, glow: glow, hkTxt: hkTxt }
                };
            }
        });
    }

    // ==========================================
    // TẠO UI THỂ HIỆN TIẾN TRÌNH MAP (Dark Fantasy / Pixel)
    // ==========================================
    createStageUI() {
        let cx = this.cameras.main.width / 2;
        
        // Lưu bảng nền vào biến this.stageBgUI
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

    createBagUI() {
        let scX = this.cameras.main.width - 70;
        let scY = 280;

        // Nút mở túi
        this.bagIcon = this.add.text(scX, scY, '📜', { fontSize: '40px' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(14000).setInteractive({ useHandCursor: true });
        
        // Số lượng đồ đang có trong túi
        this.bagCountText = this.add.text(scX + 15, scY + 15, '0', { 
            fontSize: '18px', fill: '#fff', backgroundColor: '#f00', padding: {x: 4, y: 2} 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(14001);

        // Bảng danh sách đồ (Mặc định ẩn)
        this.bagPanel = this.add.graphics().setScrollFactor(0).setDepth(15000).setVisible(false);
        this.bagPanel.fillStyle(0x000000, 0.9).lineStyle(2, 0xffcc00, 1)
            .fillRect(scX - 300, scY + 30, 320, 400).strokeRect(scX - 300, scY + 30, 320, 400);
            
        this.bagTitle = this.add.text(scX - 140, scY + 45, 'TÚI ĐỒ VƯỢT ẢI', { 
            fontSize: '20px', fill: '#ffcc00', fontStyle: 'bold' 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(15001).setVisible(false);

        this.bagContent = this.add.text(scX - 280, scY + 80, 'Chưa có trang bị nào.', { 
            fontSize: '16px', fill: '#fff', wordWrap: { width: 280 } 
        }).setOrigin(0).setScrollFactor(0).setDepth(15001).setVisible(false);

        // Click để Bật/Tắt túi
        this.bagIcon.on('pointerdown', () => {
            let isVisible = !this.bagPanel.visible;
            this.bagPanel.setVisible(isVisible);
            this.bagTitle.setVisible(isVisible);
            this.bagContent.setVisible(isVisible);
            
            // Cập nhật text hiển thị
            if (isVisible) {
                if (this.sessionLoot.length === 0) {
                    this.bagContent.setText('Chưa có trang bị nào.');
                } else {
                    // Nhóm đồ theo tên và đếm số lượng
                    let summary = {};
                    this.sessionLoot.forEach(item => {
                        let line = `[Bậc ${item.rarity}] ${item.name}`;
                        summary[line] = (summary[line] || 0) + 1;
                    });
                    
                    let textList = Object.keys(summary).map(k => `${k} x${summary[k]}`).join('\n\n');
                    this.bagContent.setText(textList);
                }
            }
        });
    }

    setUiVisibility(isVisible) {
        // Khóa hoặc Mở phím điều khiển
        this.input.keyboard.enabled = isVisible;

        if (this.bagIcon) this.bagIcon.setVisible(isVisible);
        if (this.bagCountText) this.bagCountText.setVisible(isVisible);
        // Nếu đang giấu UI thì phải đóng luôn bảng danh sách nếu người chơi đang mở nó
        if (!isVisible && this.bagPanel) {
            this.bagPanel.setVisible(false);
            this.bagTitle.setVisible(false);
            this.bagContent.setVisible(false);
        }
        
        // Ẩn/Hiện UI người chơi
        if (this.hpFrame) this.hpFrame.setVisible(isVisible);
        if (this.healthBarBg) this.healthBarBg.setVisible(isVisible);
        if (this.healthBarFill) this.healthBarFill.setVisible(isVisible);
        if (this.hpText) this.hpText.setVisible(isVisible);
        if (this.radarBg) this.radarBg.setVisible(isVisible);
        if (this.radarDots) this.radarDots.setVisible(isVisible);
        if (this.bossRadarIcon) this.bossRadarIcon.setVisible(isVisible && this.bossEntity);
        if (this.stageTextUI) this.stageTextUI.setVisible(isVisible);

        // Ẩn/Hiện cả cái bảng nền đen
        if (this.stageBgUI) this.stageBgUI.setVisible(isVisible); 
        if (this.stageTextUI) this.stageTextUI.setVisible(isVisible);

        if (this.petAvatarBg) this.petAvatarBg.setVisible(isVisible);
        if (this.petAvatarImg) this.petAvatarImg.setVisible(isVisible);
        
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

    createClickMarker(x, y) {
        if (this.clickMarker) {
            this.clickMarker.destroy();
        }

        this.clickMarker = this.add.graphics({ x, y });
        this.clickMarker.lineStyle(2, 0x00ffff, 1);
        this.clickMarker.strokeCircle(0, 0, 18);
        this.clickMarker.setDepth(y - 1);

        let pulse = this.add.graphics({ x, y });
        pulse.lineStyle(2, 0x00ffff, 0.7);
        pulse.strokeCircle(0, 0, 18);
        pulse.setDepth(y - 1);
        this.tweens.add({
            targets: pulse,
            scale: 1.6,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => pulse.destroy()
        });
    }

    updateCameraPanState(pointer) {
        if (!this.cameras.main || this.isGameOver || this.isPaused) return;
        if (this.radarDragActive) return;
        if (this.isPointerInRadar(pointer)) {
            this.cameraPanDX = 0;
            this.cameraPanDY = 0;
            this.cameraPanningActive = false;
            return;
        }

        let cam = this.cameras.main;
        let edge = this.cameraPanThreshold;
        let dx = 0;
        let dy = 0;

        let pointerX = pointer.x;
        let minRight = cam.width - 10;
        if (pointerX > minRight) {
            pointerX = minRight;
        }

        if (pointerX < edge) {
            dx = -((edge - pointerX) / edge);
        } else if (pointerX > cam.width - edge) {
            dx = (pointerX - (cam.width - edge)) / (edge - 10);
        }

        if (pointer.y < edge) {
            dy = -((edge - pointer.y) / edge);
        } else if (pointer.y > cam.height - edge) {
            dy = (pointer.y - (cam.height - edge)) / edge;
        }

        this.cameraPanDX = Phaser.Math.Clamp(dx, -1, 1);
        this.cameraPanDY = Phaser.Math.Clamp(dy, -1, 1);
        this.cameraPanningActive = this.cameraPanDX !== 0 || this.cameraPanDY !== 0;

        if (this.cameraPanningActive && !this.cameraFollowedByMouse) {
            this.cameras.main.stopFollow();
            this.cameraFollowedByMouse = true;
        }
    }

    returnCameraToPlayer() {
        if (!this.player || !this.cameras.main) return;

        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.cameraFollowedByMouse = false;
    }

    isPointerInRadar(pointer) {
        let x = pointer.position ? pointer.position.x : pointer.x;
        let y = pointer.position ? pointer.position.y : pointer.y;
        return this.radarBounds && this.radarBounds.contains(x, y);
    }

    jumpCameraToRadar(pointer) {
        if (!this.radarBounds || !this.cameras.main) return;

        let x = pointer.position ? pointer.position.x : pointer.x;
        let y = pointer.position ? pointer.position.y : pointer.y;
        let localX = Phaser.Math.Clamp(x - this.radarBounds.x, 0, this.radarSize);
        let localY = Phaser.Math.Clamp(y - this.radarBounds.y, 0, this.radarSize);
        let worldX = (localX / this.radarSize) * 4000;
        let worldY = (localY / this.radarSize) * 4000;
        let cam = this.cameras.main;

        let scrollX = Phaser.Math.Clamp(worldX - cam.width / 2, 0, 4000 - cam.width);
        let scrollY = Phaser.Math.Clamp(worldY - cam.height / 2, 0, 4000 - cam.height);

        cam.stopFollow();
        cam.setScroll(scrollX, scrollY);
        this.cameraFollowedByMouse = true;
    }

    onRadarPointerDown(pointer) {
        if (this.isPaused || this.isGameOver) return;
        if (pointer.event && typeof pointer.event.preventDefault === 'function') pointer.event.preventDefault();
        if (pointer.event && typeof pointer.event.stopPropagation === 'function') pointer.event.stopPropagation();

        if (pointer.leftButtonDown()) {
            this.jumpCameraToRadar(pointer);
            this.radarDragActive = true;
            let x = pointer.position ? pointer.position.x : pointer.x;
            let y = pointer.position ? pointer.position.y : pointer.y;
            this.radarDragLastX = x;
            this.radarDragLastY = y;
        }
    }

    onRadarPointerMove(pointer) {
        if (!this.radarDragActive || !pointer.isDown || !this.cameras.main) return;

        let x = pointer.position ? pointer.position.x : pointer.x;
        let y = pointer.position ? pointer.position.y : pointer.y;
        let dx = x - this.radarDragLastX;
        let dy = y - this.radarDragLastY;
        this.radarDragLastX = x;
        this.radarDragLastY = y;

        let worldDx = dx / this.radarSize * 4000;
        let worldDy = dy / this.radarSize * 4000;
        let cam = this.cameras.main;

        let scrollX = Phaser.Math.Clamp(cam.scrollX + worldDx, 0, 4000 - cam.width);
        let scrollY = Phaser.Math.Clamp(cam.scrollY + worldDy, 0, 4000 - cam.height);
        cam.setScroll(scrollX, scrollY);
    }

    onRadarPointerUp() {
        this.radarDragActive = false;
    }

    updateClickMovement() {
        if (!this.clickDestination) return null;

        let dx = this.clickDestination.x - this.player.x;
        let dy = this.clickDestination.y - this.player.y;
        let distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickDestination.x, this.clickDestination.y);
        if (distance < 16) {
            this.player.setVelocity(0, 0);
            if (this.clickMarker) {
                this.clickMarker.destroy();
                this.clickMarker = null;
            }
            this.clickDestination = null;
            return null;
        }

        let currentDir = this.player.moveToPoint(this.clickDestination.x, this.clickDestination.y);
        return currentDir;
    }

    onBossIntroComplete(bossInstance) {
        this.setUiVisibility(true); // Bật lại UI
        
        // Hiện thanh máu của Boss lên
        bossInstance.bossUiBg.setVisible(true);
        bossInstance.bossUiFill.setVisible(true);
        bossInstance.bossNameText.setVisible(true);

        // Mở lại input
        this.input.keyboard.enabled = true;
        this.input.enabled = true;
        if (this.clickMarker) {
            this.clickMarker.destroy();
            this.clickMarker = null;
        }
        this.clickDestination = null;

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
        // Tạo Rương (Ban đầu là frame 1 - Đóng)
        this.stageChest = this.chestGroup.create(x, y, 'chest', 1);
        this.stageChest.setScale(0.5); // Bạn tự chỉnh độ to nhỏ
        this.stageChest.setDepth(y);
        this.stageChest.chestState = 'closed'; // Trạng thái tự định nghĩa
    }

    openChest(player, chest) {
        if (chest.chestState === 'closed') {
            chest.chestState = 'opened';
            chest.setFrame(0);
            chest.setX(chest.x - 15);

            this.cameras.main.shake(300, 0.01);

            // VĂNG TRANG BỊ VỚI CỘT SÁNG THEO BẬC
            let equipDrops = this.generateRandomDropsForStage(this.currentStage);
            
            equipDrops.forEach((itemData, index) => {
                // Delay văng từng món để tạo cảm giác "tuôn trào"
                this.time.delayedCall(index * 150, () => {
                    let destX = chest.x + Phaser.Math.Between(-200, 200);
                    let destY = chest.y + Phaser.Math.Between(-150, 200);                   

                    // Ngẫu nhiên hiển thị 1 trong 6 loại trang bị khi rớt ra đất
                    let iconImg = 'random';
                    let equip = this.equipments.create(chest.x, chest.y, iconImg);
                    equip.setScale(0.2).setDepth(destY).body.enable = false;
                    equip.itemData = itemData; // Gắn data vào object vật lý để lúc nhặt còn biết là gì

                    // 1. LỚP HÀO QUANG (To, mờ, tỏa sáng theo màu phẩm chất)
                    let hexColor = Phaser.Display.Color.HexStringToColor(itemData.color).color;                   
                    // NẾU LÀ ĐỒ BẬC S (MÀU ĐEN): Ép dùng chế độ NORMAL để màu đen không bị tàng hình
                    let auraBlendMode = (itemData.rarity === 'S') ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;                   
                    let beamAura = this.add.rectangle(destX, destY, 60, 4000, hexColor)
                        .setOrigin(0.5, 1).setAlpha(0).setBlendMode(auraBlendMode).setDepth(destY - 2);

                    // 2. LỚP LÕI (Nhỏ, đặc)
                    let coreColor = (itemData.rarity === 'S') ? 0x222222 : 0xffffff;                    
                    let beamCore = this.add.rectangle(destX, destY, 12, 4000, coreColor)
                        .setOrigin(0.5, 1).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL).setDepth(destY - 1);

                    // Tween văng đồ
                    this.tweens.add({ targets: equip, x: destX, duration: 600, ease: 'Linear' });
                    this.tweens.add({ targets: equip, y: destY - 150, duration: 300, yoyo: true, ease: 'Sine.easeOut',
                        onComplete: () => { 
                            equip.y = destY; 
                            equip.body.enable = true; 
                            equip.body.reset(equip.x, equip.y); 
                            
                            // Đồ chạm đất -> Cả 2 cột sáng cùng bùng lên
                            this.tweens.add({ targets: beamAura, alpha: 0.8, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                            this.tweens.add({ targets: beamCore, alpha: 0.9, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                            
                            // Lưu lại cả 2 cột sáng vào biến để lát nhặt thì xóa
                            equip.beamAura = beamAura; 
                            equip.beamCore = beamCore;
                            
                            // Chữ Rarity nổi lên
                            let rarityTxt = this.add.text(destX, destY - 30, itemData.rarity, { 
                                fontSize: '24px', fill: itemData.color, fontStyle: 'bold', stroke: '#000', strokeThickness: 4 
                            }).setOrigin(0.5).setDepth(destY + 1);
                            
                            this.tweens.add({ targets: rarityTxt, y: destY - 50, duration: 1000, yoyo: true, repeat: -1 });
                            equip.rarityTxt = rarityTxt;
                        }
                    });
                });
            });
        }
    }

    generateRandomDropsForStage(stage) {
        let drops = [];
        let numItems = stage === 1 ? 2 : (stage === 2 ? 4 : 6); // Màn cuối rớt 6 món

        for(let i=0; i<numItems; i++) {
            let roll = Math.random() * 100;
            let rarity = 'F'; let color = '#ffffff';

            if (stage === 1) {
                if (roll < 10) { rarity = 'C'; color = '#a335ee'; }
                else if (roll < 30) { rarity = 'D'; color = '#00aaff'; }
                else if (roll < 60) { rarity = 'E'; color = '#00ff00'; }
            } 
            else if (stage === 2) {
                if (roll < 5) { rarity = 'B'; color = '#ffd700'; }
                else if (roll < 20) { rarity = 'C'; color = '#a335ee'; }
                else if (roll < 50) { rarity = 'D'; color = '#00aaff'; }
            }
            else if (stage === 3) { // Ải Boss
                if (i === 0) { rarity = 'A'; color = '#ff0000'; } // Món đầu tiên chắc chắn bậc A
                else if (roll < 2) { rarity = 'S'; color = '#000000'; }
                else if (roll < 8) { rarity = 'A'; color = '#ff0000'; }
                else if (roll < 40) { rarity = 'B'; color = '#ffd700'; }
                else { rarity = 'C'; color = '#a335ee'; }
            }

            drops.push({ 
                name: 'Trang bị Bí ẩn', // Sẽ gọi Backend định danh sau khi thắng
                rarity: rarity, 
                color: color 
            });
        }
        return drops;
    }

    // Hàm Xử lý khi người chơi dẫm lên Trang Bị
    collectEquipment(player, equip) {
        // Hủy các hiệu ứng ánh sáng
        if (equip.beamAura) equip.beamAura.destroy();
        if (equip.beamCore) equip.beamCore.destroy();
        if (equip.rarityTxt) equip.rarityTxt.destroy();
        
        // Thêm vào túi tạm
        this.sessionLoot.push(equip.itemData);
        this.bagCountText.setText(this.sessionLoot.length); // Cập nhật số trên UI
        
        // Animation nhặt
        let txt = this.add.text(player.x, player.y - 40, `Nhặt Bậc ${equip.itemData.rarity}`, { 
            fontSize: '18px', fill: equip.itemData.color, fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setDepth(8000);
        this.tweens.add({ targets: txt, y: player.y - 90, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });

        equip.destroy(); // Biến mất khỏi map

        this.time.delayedCall(50, () => this.checkAndSpawnGateway());
    }

    // KIỂM TRA ĐÃ NHẶT SẠCH ĐỒ CHƯA ĐỂ MỞ CỔNG
    checkAndSpawnGateway() {
        // Chỉ kiểm tra khi rương báu đã được mở
        if (this.stageChest && this.stageChest.chestState === 'opened') {
            
            // Đếm số Trang bị đang còn rơi vãi trên map
            let equipsLeft = this.equipments.countActive(true);

            // NẾU CẢ 2 BẰNG 0 -> ĐÃ NHẶT SẠCH MỌI THỨ
            if (equipsLeft === 0) {
                this.stageChest.chestState = 'empty';
                this.stageChest.setFrame(2); // Đổi thành rương rỗng
                this.stageChest.setX(this.stageChest.x + 25);
                
                this.processLevelUp(this.stageChest.isBossChest);

                // NẾU ĐÂY LÀ RƯƠNG BOSS -> HIỆN BẢNG TỔNG KẾT
                if (this.stageChest.isBossChest) {
                    this.time.delayedCall(1500, () => {
                        this.showSummaryScreen(true); // Gửi cờ Win = true
                    });
                } else {
                    // Mở cổng CÁCH XA RƯƠNG 300px
                    let gateX = this.stageChest.x + 300;
                    if (gateX > 3800) gateX = this.stageChest.x - 300; 
                    
                    let gate = this.gateGroup.create(gateX, this.stageChest.y, 'gateway');
                    gate.setScale(1.5);
                    gate.setDepth(this.stageChest.y);
                    gate.anims.play('gateway-idle', true);
                } 
            }
        }
    }

    processLevelUp(isBossChest = false) {
        // Tăng cấp độ nhân vật
        this.currentPlayerLevel++;
        this.player.aaLevel = this.currentPlayerLevel;
        
        // Tăng giới hạn máu và hồi đầy
        this.maxHealth = window.playerStats ? window.playerStats.hp : 1000;
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

        if (!isBossChest) {
            // Hiệu ứng chữ Level Up to giữa màn hình
            let lvlTxt = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '⚡ BẠN ĐÃ ĐƯỢC NÂNG CẤP! ⚡', { 
                fontSize: '40px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 
            }).setOrigin(0.5).setScrollFactor(0).setDepth(20000).setAlpha(0);

            this.tweens.add({
                targets: lvlTxt, alpha: 1, y: this.cameras.main.centerY - 50, duration: 800, yoyo: true, hold: 1500,
                onComplete: () => lvlTxt.destroy()
            });
        }
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
            this.scene.restart({ 
                stage: this.currentStage + 1, 
                level: this.currentPlayerLevel,
                loot: this.sessionLoot 
            });
        });
    }

    // ==========================================
    // BẢNG TỔNG KẾT & HIỂN THỊ DƯỚI DẠNG Ô TRANG BỊ
    // ==========================================
    async showSummaryScreen(isWin) {
        this.isGameOver = true; 
        this.physics.pause(); 
        this.setUiVisibility(false); 
        if (this.bagPanel) this.bagPanel.setVisible(false);

        let cx = this.cameras.main.centerX;
        let cy = this.cameras.main.centerY;

        // Vẽ nền đen mờ
        this.add.graphics().fillStyle(0x000000, 0.95)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setScrollFactor(0).setDepth(29000);

        let title = isWin ? '🏆 VƯỢT ẢI THÀNH CÔNG 🏆' : '💀 BẠN ĐÃ TỬ TRẬN 💀';
        let titleColor = isWin ? '#00ff00' : '#ff0000';
        
        this.add.text(cx, 80, title, { fontSize: '50px', fill: titleColor, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);
        this.add.text(cx, 160, 'CHIẾN LỢI PHẨM THU ĐƯỢC:', { fontSize: '26px', fill: '#ffcc00', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);

        // Chữ Loading trong lúc chờ Backend bóc quà
        let loadingTxt = this.add.text(cx, cy, 'Đang giải mã trang bị...', { 
            fontSize: '22px', fill: '#00ffff', fontStyle: 'italic'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);

        // Xóa Lưới đồ HTML cũ (nếu vô tình còn sót lại do lag)
        let oldGrid = document.getElementById('summary-loot-grid');
        if (oldGrid) oldGrid.remove();

        // GỌI API BACKEND ĐỂ NHẬN ĐỒ THẬT
        if (this.sessionLoot.length > 0) {
            let playerId = localStorage.getItem('playerId') || '1';
            let raritiesToGenerate = this.sessionLoot.map(item => item.rarity);

            try {
                const response = await fetch('http://127.0.0.1:8000/api/campaign/save-loot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_id: playerId, rarities: raritiesToGenerate })
                });
                
                const data = await response.json();
                loadingTxt.destroy(); // Xóa chữ loading

                if (data.status === 'success' && data.items && data.items.length > 0) {
                    
                    // =====================================
                    // TẠO HTML GRID ĐỂ HIỂN THỊ CÁC Ô TRANG BỊ
                    // =====================================
                    let gridDiv = document.createElement('div');
                    gridDiv.id = 'summary-loot-grid';
                    gridDiv.style.position = 'absolute';
                    gridDiv.style.top = '45%'; // Đặt ở giữa màn hình
                    gridDiv.style.left = '50%';
                    gridDiv.style.transform = 'translate(-50%, -50%)';
                    gridDiv.style.width = '80%';
                    gridDiv.style.overflowY = 'visible';
                    gridDiv.style.display = 'flex';
                    gridDiv.style.flexWrap = 'wrap';
                    gridDiv.style.gap = '15px';
                    gridDiv.style.justifyContent = 'center';
                    gridDiv.style.zIndex = '35000'; // Đè lên trên cả thẻ canvas của game
                    
                    document.getElementById('game-container').appendChild(gridDiv);

                    // Bảng màu cho các phẩm chất
                    const RARITY_COLORS = {
                        'F': '#ffffff', 'E': '#00ff00', 'D': '#00aaff', 
                        'C': '#a335ee', 'B': '#ffd700', 'A': '#ff0000', 'S': '#000000'
                    };

                    // Duyệt qua từng món đồ Backend gửi về và vẽ thành 1 ô (Giống y chang file main.js)
                    data.items.forEach(item => {
                        let color = RARITY_COLORS[item.rarity] || '#ffffff';
                        let textShadow = item.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';
                        let imagePath = `../assets/items/${item.icon}`;
                        
                        let itemDiv = document.createElement('div');
                        itemDiv.className = 'inv-item'; // Tận dụng luôn class css của Balo!
                        itemDiv.style.borderColor = color;
                        itemDiv.style.position = 'relative'; 
                        itemDiv.style.margin = '0'; // Ghi đè margin mặc định để dùng gap
                        
                        if(item.rarity === 'S') { 
                            itemDiv.style.boxShadow = `0 0 10px #ffffff`; 
                            itemDiv.style.borderColor = '#ffffff'; 
                        }
                        
                        // Thêm Tooltip đàng hoàng khi người chơi rê chuột vào
                        itemDiv.setAttribute('data-tooltip', `[Bậc ${item.rarity}] ${item.name.toUpperCase()}`);

                        itemDiv.innerHTML = `
                            <img src="${imagePath}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: contain;">
                            <span class="item-rank" style="color: ${color}; ${textShadow}">${item.rarity}</span>
                        `;
                        
                        gridDiv.appendChild(itemDiv);
                    });

                } else {
                    this.add.text(cx, cy, 'Không có đồ nào rơi ra.', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);
                }
            } catch (error) {
                console.error("Lỗi:", error);
                loadingTxt.setText('Mất kết nối đến máy chủ!');
            }
        } else {
            loadingTxt.destroy();
            this.add.text(cx, cy, 'Không có đồ nào rơi ra.', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(30000);
        }

        // Hiện nút Điều hướng ở bên dưới cái Lưới
        let btnRestart = this.add.text(cx - 150, cy + 220, '[ CHƠI LẠI MÀN 1 ]', { 
            fontSize: '28px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
        
        btnRestart.on('pointerdown', () => this.redirectAfterSummary('restart'));

        let btnHomeGameOver = this.add.text(cx + 150, cy + 220, '[ TRANG CHỦ ]', { 
            fontSize: '28px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30000).setInteractive({ useHandCursor: true });
        
        btnHomeGameOver.on('pointerdown', () => this.redirectAfterSummary('home'));
    }

    // Hàm Phụ: Xử lý dọn dẹp và chuyển cảnh
    redirectAfterSummary(action) {
        // Xóa Lưới Đồ HTML đi để không bị dính trên màn hình khi chơi lại!
        let grid = document.getElementById('summary-loot-grid');
        if (grid) grid.remove();

        if (window.activeCampaignBgm) window.activeCampaignBgm.stop();
        
        if (action === 'restart') {
            // Truyền loot: [] để làm sạch túi đồ cũ
            this.scene.restart({ stage: 1, level: 0, loot: [] });
        } else {
            if (window.bgMusic) window.bgMusic.play();
            document.getElementById('home-screen').style.display = 'flex';
            setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
            setTimeout(() => { document.getElementById('game-container').style.display = 'none'; this.scene.start('default'); }, 800);
            
            // Ép Kho Đồ ở file main.js tải lại dữ liệu mới nhất
            if (typeof loadInventoryFromServer === 'function') loadInventoryFromServer();
        }
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        if (this.cameraPanningActive && this.cameras.main) {
            let cam = this.cameras.main;
            let scrollX = cam.scrollX + this.cameraPanDX * this.cameraPanSpeed * delta;
            let scrollY = cam.scrollY + this.cameraPanDY * this.cameraPanSpeed * delta;
            cam.setScroll(
                Phaser.Math.Clamp(scrollX, 0, 4000 - cam.width),
                Phaser.Math.Clamp(scrollY, 0, 4000 - cam.height)
            );
        }

        if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
            this.returnCameraToPlayer();
        }

        let newDir = null;
        const isKeyboardMoving = this.moveState.up || this.moveState.down || this.moveState.left || this.moveState.right;

        if (isKeyboardMoving) {
            newDir = this.player.updateMovement(this.moveState);
            if (this.clickDestination) {
                this.clickDestination = null;
                if (this.clickMarker) {
                    this.clickMarker.destroy();
                    this.clickMarker = null;
                }
            }
        } else if (this.clickDestination) {
            newDir = this.updateClickMovement();
        } else {
            this.player.setVelocity(0, 0);
            this.player.anims.stop();
        }

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
                this.input.enabled = false; // Khóa click chuột
                this.moveState = { up: false, down: false, left: false, right: false }; // Xóa bộ nhớ các phím đang giữ
                if (this.clickMarker) {
                    this.clickMarker.destroy();
                    this.clickMarker = null;
                }
                this.clickDestination = null;
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

        // KIỂM TRA KHI BOSS BỊ TIÊU DIỆT
        if (this.currentStage === 3 && this.bossEntity && this.bossEntity.isDead && !this.bossChestSpawned) {
            this.bossChestSpawned = true; // Đánh dấu để không gọi rương nhiều lần

            this.time.delayedCall(1500, () => {
                let cx = this.cameras.main.width / 2;
                let cy = this.cameras.main.height / 2;
                
                // Rương Boss văng ra ngay giữa vùng camera đang nhìn
                let camX = this.cameras.main.scrollX + cx;
                let camY = this.cameras.main.scrollY + cy;
                
                this.chestSpawned = true;
                this.spawnChestAndGateway(camX, camY); 
                
                // Gắn cờ đánh dấu rương này là rương Boss
                this.stageChest.isBossChest = true; 
            });
        }

        this.monsters.getChildren().forEach(mon => {
            mon.updateAI(this.player);

            if (mon.isSlowed && !mon.isDead) {
                mon.body.velocity.x *= 0.4; //Giảm 60% tốc độ di chuyển
                mon.body.velocity.y *= 0.4;
                mon.setTint(0x00ffff);
            } else if (mon.isBurning && !mon.isDead) {
                mon.setTint(0xff5500);
            }
        });

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

        if (this.petCampaignSkills) {
            for (let key in this.petCampaignSkills) {
                let sk = this.petCampaignSkills[key];
                if (sk.currentCd > 0) {
                    if (delta) sk.currentCd -= delta;
                    if (sk.currentCd <= 0) {
                        sk.currentCd = 0;
                        sk.ui.overlay.clear(); sk.ui.text.setVisible(false); sk.ui.glow.setVisible(true);
                    } else {
                        let progress = sk.currentCd / sk.cd;
                        let startAngle = Phaser.Math.DegToRad(-90);
                        let endAngle = startAngle + (Math.PI * 2 * progress);
                        sk.ui.overlay.clear().fillStyle(0x000000, 0.75).beginPath().moveTo(sk.x, sk.y).arc(sk.x, sk.y, 36, startAngle, endAngle, false).closePath().fillPath();
                        sk.ui.text.setText(Math.ceil(sk.currentCd / 1000));
                        sk.ui.glow.setVisible(false);
                    }
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
        // Luôn lấy máu tối đa từ Kho đồ phòng khi người chơi vừa thay trang bị
        this.maxHealth = window.playerStats ? window.playerStats.hp : 1000;
        
        // Nếu máu hiện tại vượt mức Max thì ép xuống
        if (v > this.maxHealth) {
            v = this.maxHealth;
            this.playerHealth = v;
        }

        this.healthBarFill.clear(); 
        if (v <= 0) { if(this.hpText) this.hpText.setText('0'); return; }
        
        let cw = (v / this.maxHealth) * 307; // 307 là chiều dài thanh máu
        this.healthBarFill.fillStyle(0xff0000, 1).beginPath()
            .moveTo(219+39, 63).lineTo(Math.max(219+39, 219+cw), 63)
            .lineTo(219+cw, 63+55).lineTo(219, 63+55).closePath().fillPath();
            
        if(this.hpText) this.hpText.setText(Math.round(v));
    }

    // ==========================================
    // HÀM GÂY SÁT THƯƠNG TỔNG HỢP LÊN QUÁI VẬT
    // ==========================================
    applyDamageToMonster(monster, rawDamage) {
        if (!monster || !monster.active || monster.isDead) return;

        let stats = window.playerStats || { atk: 50, critRate: 5, critDamage: 150, lifesteal: 0 };

        // LẤY BUFF ĐỘNG TỪ PET
        let dynamicBuffs = { lifesteal: 0, hpRegen: 0, atkPercent: 0, critRate: 0, dodge: 0 };
        if (window.equippedPet) {
            dynamicBuffs = getPetDynamicBuffs(this, window.equippedPet.pet.pet_code, window.equippedPet.level);
        }
        
        // 1. Cộng dồn Tỉ lệ Chí mạng và Tính sát thương tăng cường (Của chiêu Cuồng Nộ)
        let totalCritRate = stats.critRate + dynamicBuffs.critRate;
        // Nhân sát thương gốc lên (Ví dụ: atkPercent = 50 -> Sát thương x 1.5)
        rawDamage = rawDamage * (1 + (dynamicBuffs.atkPercent / 100));

        let isCrit = (Math.random() * 100) < totalCritRate;
        let finalDamage = rawDamage;

        if (isCrit) {
            finalDamage = rawDamage * (stats.critDamage / 100);
            
            // BẮN SỰ KIỆN CHÍ MẠNG CHO PET
            if (window.equippedPet) {
                triggerPetPassiveOnCrit(this, window.equippedPet.pet.pet_code, window.equippedPet.level);
            }
        }

        // 2. Gây sát thương lên quái (truyền thêm cờ isCrit để đổi màu text)
        if (typeof monster.takeDamage === 'function') {
            monster.takeDamage(finalDamage, isCrit);
        }

        // Kích hoạt hiệu ứng làm chậm của Phượng hoàng băng
        if (window.equippedPet) {
            triggerPetPassiveOnHit(this, window.equippedPet.pet.pet_code, window.equippedPet.level, monster);
        }

        // 3. Tính toán Hút Máu
        let baseLifesteal = stats.lifesteal || 0;
        
        let totalLifesteal = baseLifesteal + dynamicBuffs.lifesteal;

        if (totalLifesteal > 0 && this.playerHealth < this.maxHealth) {
            let healAmt = finalDamage * (totalLifesteal / 100);
            this.playerHealth = Math.min(this.maxHealth, this.playerHealth + healAmt);
            this.updateHealthBarWidth(this.playerHealth);
            
            let lsText = this.add.text(this.player.x, this.player.y - 20, `+${Math.round(healAmt)}`, { 
                fontSize: '14px', fill: '#00ff00', stroke: '#000', strokeThickness: 2 
            }).setOrigin(0.5).setDepth(8000);
            this.tweens.add({ targets: lsText, y: this.player.y - 50, alpha: 0, duration: 800, onComplete: () => lsText.destroy() });
        }
    }

    takeDamage(amount) {
        if (this.isGameOver) return;

        // ==========================================
        // KIỂM TRA TỈ LỆ NÉ TRÁNH (DODGE) KẾT HỢP BUFF PET
        // ==========================================
        let baseDodge = window.playerStats ? window.playerStats.dodge : 5;
        let dynamicBuffs = { dodge: 0 };
        if (window.equippedPet) {
            dynamicBuffs = getPetDynamicBuffs(this, window.equippedPet.pet.pet_code, window.equippedPet.level);
        }
        let totalDodge = baseDodge + dynamicBuffs.dodge;
        
        // Quay xổ số ngẫu nhiên từ 0 đến 100.
        if (Math.random() * 100 < totalDodge) {
            let missText = this.add.text(this.player.x, this.player.y - 40, 'NÉ TRÁNH!', { 
                fontSize: '24px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 
            }).setOrigin(0.5).setDepth(8000);
            this.tweens.add({ targets: missText, y: this.player.y - 90, alpha: 0, duration: 800, onComplete: () => missText.destroy() });
            
            return; // THOÁT NGAY LẬP TỨC khỏi hàm trừ máu
        }
        
        if (this.player.shieldCount && this.player.shieldCount > 0) {
            this.player.shieldCount--;
            
            if (this.player.shieldGroup && this.player.shieldGroup.list.length > 0) {
                let sImg = this.player.shieldGroup.list[0];
                
                // Lấy tọa độ thực tế trên bản đồ
                let worldPoint = new Phaser.Math.Vector2();
                this.player.shieldGroup.getWorldTransformMatrix().transformPoint(sImg.x, sImg.y, worldPoint);
                
                // Vẽ hiệu ứng tại đúng tọa độ worldPoint
                let breakFx = this.add.circle(
                    worldPoint.x,
                    worldPoint.y,
                    15,
                    0x00ffff,
                    0.25
                );

                breakFx.setStrokeStyle(3, 0x00ffff);
                breakFx.setDepth(worldPoint.y + 10);

                this.tweens.add({
                    targets: breakFx,
                    scale: 2.5,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => breakFx.destroy()
                });

                this.player.shieldGroup.remove(sImg);
                sImg.destroy(); 
            }
            
            if (this.player.shieldCount === 0) { 
                this.player.shieldGroup.destroy(); 
                this.player.shieldGroup = null; 
                if (this.player.shieldLevel === 2) triggerShieldExplosion(this, this.player.x, this.player.y); 
            }
            return; 
        }
        this.playerHealth = Math.max(0, this.playerHealth - amount); this.updateHealthBarWidth(this.playerHealth);
        this.player.setTint(0xff0000); this.time.delayedCall(200, () => this.player.clearTint());
        let dmgText = this.add.text(this.player.x, this.player.y - 40, `-${amount}`, { fontSize: '24px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 3 }).setOrigin(0.5).setDepth(8000);
        this.tweens.add({ targets: dmgText, y: this.player.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

        if (this.playerHealth <= 0) {
            this.isGameOver = true; 
            this.player.anims.stop(); 
            this.physics.pause();
            
            // Tắt thanh máu của quái vật cho gọn màn hình
            this.monsters.getChildren().forEach(m => { 
                if(m.hpBarBg) m.hpBarBg.setVisible(false); 
                if(m.hpBarFill) m.hpBarFill.setVisible(false); 
            });

            // Gọi Bảng Tổng Kết Mới (Truyền false = Thua trận)
            this.showSummaryScreen(false);
        }
    }

    createPauseMenu() {
        let cx = this.cameras.main.width / 2; let cy = this.cameras.main.height / 2;
        this.add.graphics().fillStyle(0x000000, 0.7).fillRoundedRect(20, 20, 50, 50, 10).setDepth(16000).setScrollFactor(0);
        this.add.text(25, 30, '⏸️', { fontSize: '30px' }).setInteractive({ useHandCursor: true }).setDepth(16001).setScrollFactor(0).on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.togglePause(); });
        this.pauseOverlay = this.add.graphics().fillStyle(0x000000, 0.85).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(15000).setScrollFactor(0);
        this.txtPause = this.add.text(cx, cy - 150, 'TẠM DỪNG', { fontSize: '60px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(15001).setScrollFactor(0);
        this.btnResume = this.add.text(cx, cy - 30, '[ TIẾP TỤC ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', (p,x,y,e) => { e.stopPropagation(); this.togglePause(); });
        this.btnInventory = this.add.text(cx, cy + 40, '[ KHO ĐỒ ]', { fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} })
            .setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0)
            .on('pointerdown', (p,x,y,e) => { 
                if(e) e.stopPropagation(); 
                
                // Giả lập click vào nút Kho Đồ gốc ngoài HTML
                document.getElementById('btn-inventory').click(); 
                
                // Khóa tương tác của game để tránh click xuyên thấu
                this.input.enabled = false; 
            });
        this.btnSetting = this.add.text(cx, cy + 110, '[ CÀI ĐẶT ]', { fontSize: '32px', fill: '#00ccff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', (p,x,y,e) => { if(e) e.stopPropagation(); document.getElementById('settings-modal').style.display = 'flex'; this.input.enabled = false; });
        this.btnChangeMap = this.add.text(cx, cy + 180, '[ CHƠI LẠI MÀN 1 ]', { fontSize: '32px', fill: '#ff8800', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', () => { this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false; if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); this.scene.restart({stage: 1, level: 0, loot: []}); });
        this.btnHome = this.add.text(cx, cy + 250, '[ TRANG CHỦ ]', { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(15001).setInteractive({ useHandCursor: true }).setScrollFactor(0).on('pointerdown', () => { this.input.enabled = false; this.setPauseMenuVisible(false); this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false; if (window.activeCampaignBgm) window.activeCampaignBgm.stop(); if (window.bgMusic) window.bgMusic.play(); document.getElementById('home-screen').style.display = 'flex'; setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10); setTimeout(() => { document.getElementById('game-container').style.display = 'none'; this.scene.start('default'); }, 800); });
        this.setPauseMenuVisible(false);
    }

    setPauseMenuVisible(v) { 
        this.pauseOverlay.setVisible(v); 
        if (v) this.pauseOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains); else this.pauseOverlay.disableInteractive();
        this.txtPause.setVisible(v); this.btnResume.setVisible(v); this.btnInventory.setVisible(v); this.btnSetting.setVisible(v); this.btnChangeMap.setVisible(v); this.btnHome.setVisible(v); 
    }
    togglePause() { 
        if (this.isGameOver) return; 
        this.isPaused = !this.isPaused; 
        if (this.isPaused) { 
            this.physics.pause(); 
            this.tweens.pauseAll(); 
            this.time.paused = true; 
            
            this.setPauseMenuVisible(true); 
        } else { 
            this.physics.resume(); 
            this.tweens.resumeAll();             
            this.time.paused = false; 
            
            this.setPauseMenuVisible(false); 
        } 
    }

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
        // Chỉ hiện icon boss khi radar hiển thị
        if (this.bossRadarIcon && this.radarBg.visible) this.bossRadarIcon.setVisible(false);
        this.radarDots.fillStyle(0xff0000, 1);
        this.monsters.getChildren().forEach(m => { 
            if (m.active && !m.isDead) {
                if (m instanceof Boss && this.bossRadarIcon) {
                    this.bossRadarIcon.setPosition(rX + (m.x * sc), rY + (m.y * sc));
                    
                    if (this.radarBg && this.radarBg.visible) this.bossRadarIcon.setVisible(true);
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

        // 5. Vẽ khung trắng thể hiện vùng nhìn thấy của camera
        let cam = this.cameras.main;
        if (cam) {
            let viewX = rX + (cam.worldView.x * sc);
            let viewY = rY + (cam.worldView.y * sc);
            let viewW = cam.worldView.width * sc;
            let viewH = cam.worldView.height * sc;
            this.radarDots.lineStyle(2, 0xffffff, 1);
            this.radarDots.strokeRect(viewX, viewY, viewW, viewH);
        }
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