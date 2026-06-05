// ==========================================
// CẤU HÌNH GAME & PHÍM BẤM TOÀN CỤC
// ==========================================
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container', 
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false } 
    },
    scene: { preload: preload, create: create, update: update }
};

// [MỚI]: Đưa cấu hình Phím lên window để main.js có thể chỉnh sửa
window.MOVE_CONFIG = { up: 'ARROWUP', down: 'ARROWDOWN', left: 'ARROWLEFT', right: 'ARROWRIGHT', melee: 'SPACE' };

window.SKILL_CONFIG = {
    'meteor':   { name: "☄️ THIÊN THẠCH", icon: 'fireball',   cd: 3000, currentCd: 0, ui: null, hotkey: '1' },
    'swords':   { name: "⚔️ PHI KIẾM", icon: 'sword',      cd: 5000, currentCd: 0, ui: null, hotkey: '2' },
    'lightning':{ name: "⚡ SẤM SÉT",          icon: 'lightning1', cd: 7000, currentCd: 0, ui: null, hotkey: '3' },
    'shield':   { name: "🛡️ LÁ CHẮN",         icon: 'shield',     cd: 12000, currentCd: 0, ui: null, hotkey: '4' },
    'heal':     { name: "💚 HỒI MÁU",         icon: 'heal',       cd: 15000, currentCd: 0, ui: null, hotkey: '5' },
    'earth':    { name: "⛰️ THỔ ĐỘN", icon: 'earth2',     cd: 10000, currentCd: 0, ui: null, hotkey: '6' },
    'arrows':   { name: "🏹 VẠN TIỄN", icon: 'arrows',  cd: 8000, currentCd: 0, ui: null, hotkey: '7' },
    'anchor':   { name: "⚓ TÀU CHIẾN",icon: 'anchor',  cd: 15000, currentCd: 0, ui: null, hotkey: '8' },
    'doll':     { name: "🎎 HÌNH NHÂN",          icon: 'doll',       cd: 20000, currentCd: 0, ui: null, hotkey: '9' },
};

const game = new Phaser.Game(config);

let player;
let bg;
let monsters; 
let projectiles; 
let spawnEvent; 
let bgMusic;

let playerHealth = 100;
let isGameOver = false;
let isPaused = false; 

let healthBarBg, healthBarFill, hpFrame, hpText;
let activeShields = 0, shieldSprites = [], shieldTimer = null;  
let isDoll = false, originalPlayerScale = 1;
let basicAttacks; 
let lastBasicAttackTime = 0;

// [MỚI]: Trạng thái di chuyển
let moveState = { up: false, down: false, left: false, right: false };

// ==========================================
// 1. TẢI TÀI NGUYÊN (Giữ nguyên)
// ==========================================
function preload() {
    this.load.image('bg', '../assets/bg.png');
    this.load.audio('bgm', '../assets/bg_music.mp3'); 
    this.load.image('player', '../assets/player.png'); 
    this.load.image('monster', '../assets/monster.png'); 
    this.load.image('aa', '../assets/aa.png');
    this.load.image('fireball', '../assets/fireball.png'); 
    this.load.image('sword', '../assets/sword.png'); 
    this.load.image('lightning1', '../assets/lightning1.png'); 
    this.load.image('lightning2', '../assets/lightning2.png'); 
    this.load.image('lightning3', '../assets/lightning3.png'); 
    this.load.image('lightning4', '../assets/lightning4.png'); 
    this.load.image('shield', '../assets/shield.png'); 
    this.load.image('heal', '../assets/heal.png'); 
    this.load.image('earth1', '../assets/earth1.png'); 
    this.load.image('earth2', '../assets/earth2.png'); 
    this.load.image('earth3', '../assets/earth3.png'); 
    this.load.image('arrows', '../assets/arrows.png'); 
    this.load.image('anchor', '../assets/anchor.png'); 
    this.load.image('doll', '../assets/doll.png'); 
    this.load.image('hp_frame', '../assets/hp_frame.png'); 
}

// ==========================================
// 2. KHỞI TẠO (XỬ LÝ BÀN PHÍM)
// ==========================================
function create() {
    playerHealth = 100;
    isGameOver = false; isPaused = false; isDoll = false;
    activeShields = 0; shieldSprites = [];
    moveState = { up: false, down: false, left: false, right: false };

    if (!this.sound.get('bgm')) {
        let volSlider = document.getElementById('volume-slider');
        bgMusic = this.sound.add('bgm', { loop: true, volume: volSlider ? parseFloat(volSlider.value) : 0.5 });
        bgMusic.play();
    }
    
    for(let key in window.SKILL_CONFIG) { window.SKILL_CONFIG[key].currentCd = 0; }

    bg = this.add.image(window.innerWidth / 2, window.innerHeight / 2, 'bg');
    bg.setDisplaySize(window.innerWidth, window.innerHeight);

    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight - 150, 'player');
    player.setCollideWorldBounds(true); 
    originalPlayerScale = 250 / player.height;
    player.setScale(originalPlayerScale); 

    monsters = this.physics.add.group();
    projectiles = this.physics.add.group(); 

    basicAttacks = this.physics.add.group();
    this.physics.add.overlap(basicAttacks, monsters, (aa, monster) => {
        aa.destroy();      
        monster.destroy(); 
    }, null, this);

    spawnEvent = this.time.addEvent({ delay: 3500, callback: spawnMonster, callbackScope: this, loop: true });

    this.physics.add.overlap(player, monsters, hitPlayer, null, this);
    this.physics.add.overlap(projectiles, monsters, hitMonster, null, this);

    drawHealthBar.call(this);
    createSkillUI.call(this);
    createPauseMenu.call(this);

    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
        bg.setPosition(window.innerWidth / 2, window.innerHeight / 2);
        bg.setDisplaySize(window.innerWidth, window.innerHeight);
    });

    // [MỚI]: Lắng nghe nhấn phím
    this.input.keyboard.on('keydown', (event) => {
        if (isGameOver || isDoll || isPaused) return;
        let key = event.key === ' ' ? 'SPACE' : event.key.toUpperCase();

        if (key === window.MOVE_CONFIG.melee) {
            shootBasicAttack.call(this);
            return;
        }

        // 1. Kiểm tra xuất chiêu Kỹ năng
        for (let skKey in window.SKILL_CONFIG) {
            if (window.SKILL_CONFIG[skKey].hotkey === key) {
                checkAndCastSkill.call(this, skKey);
                return;
            }
        }

        // 2. Kiểm tra Di chuyển
        if (key === window.MOVE_CONFIG.up) moveState.up = true;
        if (key === window.MOVE_CONFIG.down) moveState.down = true;
        if (key === window.MOVE_CONFIG.left) moveState.left = true;
        if (key === window.MOVE_CONFIG.right) moveState.right = true;
    });

    // [MỚI]: Lắng nghe nhả phím (Dừng di chuyển)
    this.input.keyboard.on('keyup', (event) => {
        let key = event.key === ' ' ? 'SPACE' : event.key.toUpperCase();
        if (key === window.MOVE_CONFIG.up) moveState.up = false;
        if (key === window.MOVE_CONFIG.down) moveState.down = false;
        if (key === window.MOVE_CONFIG.left) moveState.left = false;
        if (key === window.MOVE_CONFIG.right) moveState.right = false;
    });

    this.input.keyboard.on('keydown-ESC', togglePause, this);
}

// ==========================================
// HỆ THỐNG GIAO DIỆN HỒI CHIÊU (CÓ HIỂN THỊ PHÍM)
// ==========================================
function createSkillUI() {
    let startX = window.innerWidth / 2 - 300; 
    let startY = window.innerHeight - 60; // Nâng lên tí cho đỡ sát đáy
    let spacing = 75; 
    let index = 0;

    for (let key in window.SKILL_CONFIG) {
        let skill = window.SKILL_CONFIG[key];
        let posX = startX + (index * spacing);
        skill.posX = posX; skill.startY = startY; 

        // Khung nền đen
        let bgCircle = this.add.graphics();
        bgCircle.fillStyle(0x000000, 0.6);
        bgCircle.fillCircle(posX, startY, 28);
        bgCircle.setDepth(1500);

        let icon = this.add.image(posX, startY, skill.icon);
        let scale = 35 / Math.max(icon.width, icon.height);
        icon.setScale(scale).setDepth(1501);

        let cdOverlay = this.add.graphics().setDepth(1502);

        let cdText = this.add.text(posX, startY, '', { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 })
            .setOrigin(0.5).setDepth(1503).setVisible(false);

        let glow = this.add.graphics();
        glow.lineStyle(3, 0x00ffff, 1);
        glow.strokeCircle(posX, startY, 29);
        glow.setDepth(1504);

        // [MỚI]: Text hiển thị Phím Bấm nằm sát phía trên vòng tròn
        let hotkeyText = this.add.text(posX, startY - 45, skill.hotkey, { 
            fontSize: '18px', fill: '#ffcc00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setDepth(1505);

        skill.ui = { overlay: cdOverlay, text: cdText, glow: glow, hotkeyText: hotkeyText };
        index++;
    }

    // Hàm public để main.js gọi vào khi đổi phím
    window.refreshSkillHotkeysUI = () => {
        for (let k in window.SKILL_CONFIG) {
            if (window.SKILL_CONFIG[k].ui) {
                window.SKILL_CONFIG[k].ui.hotkeyText.setText(window.SKILL_CONFIG[k].hotkey);
            }
        }
    };
}

function checkAndCastSkill(skillKey) {
    let skill = window.SKILL_CONFIG[skillKey];
    if (skill.currentCd > 0) return;

    if (skillKey === 'meteor') shootMeteor.call(this);
    else if (skillKey === 'swords') shootSwords.call(this);
    else if (skillKey === 'lightning') shootLightning.call(this);
    else if (skillKey === 'shield') activateShield.call(this);
    else if (skillKey === 'heal') activateHeal.call(this);
    else if (skillKey === 'earth') activateEarth.call(this);
    else if (skillKey === 'arrows') shootArrows.call(this);
    else if (skillKey === 'anchor') shootAnchor.call(this);
    else if (skillKey === 'doll') activateDoll.call(this);

    skill.currentCd = skill.cd;
    skill.ui.glow.setVisible(false);
    skill.ui.text.setVisible(true);
}

// ==========================================
// CÁC HÀM THANH MÁU, MENU, KỸ NĂNG KHÁC (Giữ nguyên)
// ==========================================
const BAR_X = 223, BAR_Y = 67, BAR_WIDTH = 295, BAR_HEIGHT = 50, SLANT = 31; 
const HP_TEXT_X = 175, HP_TEXT_Y = 118;   

function drawHealthBar() {
    hpFrame = this.add.image(100, 20, 'hp_frame').setOrigin(0, 0).setScale(0.35).setDepth(1002);
    healthBarBg = this.add.graphics().fillStyle(0x222222, 1).setDepth(1000);
    healthBarBg.beginPath();
    healthBarBg.moveTo(BAR_X + SLANT, BAR_Y);                  
    healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y);              
    healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y + BAR_HEIGHT); 
    healthBarBg.lineTo(BAR_X, BAR_Y + BAR_HEIGHT);             
    healthBarBg.closePath(); healthBarBg.fillPath();

    healthBarFill = this.add.graphics();
    hpText = this.add.text(HP_TEXT_X, HP_TEXT_Y, playerHealth + ' / 100', { 
        fontSize: '26px', fill: '#ff3333', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1003);
    updateHealthBarWidth(100);
}

function updateHealthBarWidth(healthValue) {
    healthBarFill.clear();
    if (healthValue <= 0) { if(hpText) hpText.setText('0'); return; }
    healthBarFill.fillStyle(0xff0000, 1); 
    let currentWidth = (healthValue / 100) * BAR_WIDTH; 
    healthBarFill.beginPath();
    healthBarFill.moveTo(BAR_X + SLANT, BAR_Y); 
    healthBarFill.lineTo(Math.max(BAR_X + SLANT, BAR_X + currentWidth), BAR_Y); 
    healthBarFill.lineTo(BAR_X + currentWidth, BAR_Y + BAR_HEIGHT); 
    healthBarFill.lineTo(BAR_X, BAR_Y + BAR_HEIGHT); 
    healthBarFill.closePath(); healthBarFill.fillPath();
    healthBarFill.setDepth(1001);
    if(hpText) hpText.setText(Math.round(healthValue));
}

function createPauseMenu() {
    let pauseBg = this.add.graphics().fillStyle(0x000000, 0.7).fillRoundedRect(20, 20, 50, 50, 10).setDepth(4000);
    let pauseBtnIcon = this.add.text(25, 30, '⏸️', { fontSize: '30px' }).setInteractive({ useHandCursor: true }).setDepth(4001);
    pauseBtnIcon.on('pointerdown', () => togglePause.call(this));

    pauseOverlay = this.add.graphics().fillStyle(0x000000, 0.85).fillRect(0, 0, window.innerWidth, window.innerHeight).setDepth(5000);
    txtPause = this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 150, 'TẠM DỪNG', { fontSize: '60px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5001);

    btnResume = this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 30, '[ TIẾP TỤC ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true }).on('pointerdown', () => togglePause.call(this));
    btnInventory = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 40, '[ KHO ĐỒ ]', { fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true }).on('pointerdown', () => alert("Kho đồ đang phát triển!"));
    
    btnSetting = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 110, '[ CÀI ĐẶT ]', { fontSize: '32px', fill: '#00ccff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true });
    btnSetting.on('pointerdown', () => {
        document.getElementById('settings-modal').style.display = 'flex'; 
        this.input.enabled = false;
    });

    btnHome = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 180, '[ TRANG CHỦ ]', { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true });
    btnHome.on('pointerdown', () => {
        this.physics.pause(); this.tweens.pauseAll(); if (spawnEvent) spawnEvent.paused = true;
        document.getElementById('home-screen').style.display = 'flex';
        setTimeout(() => { document.getElementById('home-screen').style.opacity = '1'; }, 10);
        setTimeout(() => { document.getElementById('game-container').style.display = 'none'; }, 800);
    });

    setPauseMenuVisible(false);
}

function togglePause() {
    if (isGameOver) return; 
    isPaused = !isPaused;
    if (isPaused) { this.physics.pause(); spawnEvent.paused = true; this.tweens.pauseAll(); setPauseMenuVisible(true); } 
    else { this.physics.resume(); spawnEvent.paused = false; this.tweens.resumeAll(); setPauseMenuVisible(false); }
}

function setPauseMenuVisible(v) { pauseOverlay.setVisible(v); txtPause.setVisible(v); btnResume.setVisible(v); btnInventory.setVisible(v); btnSetting.setVisible(v); btnHome.setVisible(v); }

// (CÁC HÀM SKILL CHỨC NĂNG GIỮ NGUYÊN)
function shootBasicAttack() {
    let now = this.time.now;
    if (now - lastBasicAttackTime < 200) return; 
    lastBasicAttackTime = now;

    let closestMonster = null;
    let minDist = Infinity;
    
    monsters.children.iterate(m => {
        if (m && m.active) {
            let dist = Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y);
            if (dist < minDist) {
                minDist = dist;
                closestMonster = m;
            }
        }
    });

    let aa = basicAttacks.create(player.x, player.y - 50, 'aa');
    let scale = 40 / Math.max(aa.width, aa.height); 
    aa.setScale(scale);

    // ===============================================
    // [MỚI]: TẠO HIỆU ỨNG VỆT MỜ MÀU XANH (TRAIL)
    // ===============================================
    let trail = this.add.particles(0, 0, 'aa', {
        speed: 0,
        scale: { start: scale * 0.8, end: 0 }, // Thu nhỏ dần về 0
        alpha: { start: 0.6, end: 0 },         // Mờ dần biến mất
        tint: 0x00ffff,                        // Phủ màu xanh lơ (Cyan) phát sáng
        blendMode: 'ADD',                      // Hiệu ứng hòa trộn ánh sáng (Glow)
        lifespan: 400,                         // Thời gian đuôi tồn tại (0.4s là đủ mượt, 1s sẽ hơi dài)
        frequency: 20                          // Cứ 20ms đẻ ra 1 vệt
    }).setDepth(player.y - 51);
    
    // Bắt vệt sáng bám theo tọa độ của viên đạn
    trail.startFollow(aa); 

    // Ghi đè hàm destroy: Khi đạn nổ/biến mất thì vệt sáng tan dần rồi mới xóa
    const originalDestroy = aa.destroy;
    aa.destroy = function() {
        trail.stopFollow(); // Ngừng bám theo đạn
        trail.stop();       // Ngừng sinh hạt mới
        
        // Đợi 0.5s cho các hạt cũ tan hết rồi mới xóa bộ nhớ Emitter để chống giật lag
        setTimeout(() => { if (trail) trail.destroy(); }, 500); 
        
        originalDestroy.call(aa); // Xóa viên đạn
    };
    // ===============================================

    if (closestMonster) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, closestMonster.x, closestMonster.y);
        aa.setRotation(angle + Math.PI / 2);
        this.physics.moveToObject(aa, closestMonster, 800);
    } else {
        aa.setVelocityY(-800);
    }

    this.time.delayedCall(1500, () => {
        if (aa && aa.active) aa.destroy();
    });
}
function activateDoll() { player.setVisible(false); let dollImg = this.add.image(player.x, player.y, 'doll'); dollImg.setScale(250 / dollImg.height).setDepth(player.y); isDoll = true; this.time.delayedCall(4000, () => { this.cameras.main.shake(600, 0.02); let blastRadius = 350; let shockwave = this.add.graphics().setDepth(3000); this.tweens.addCounter({ from: 20, to: blastRadius, duration: 300, onUpdate: (tw) => { shockwave.clear(); shockwave.lineStyle(15, 0xffaa00, 1 - tw.progress); shockwave.strokeCircle(player.x, player.y, tw.getValue()); }, onComplete: () => { shockwave.destroy(); } }); monsters.children.iterate((m) => { if (m && m.active && Math.abs(m.x - player.x) < blastRadius && Math.abs(m.y - player.y) < 150) m.destroy(); }); dollImg.destroy(); player.setVisible(true); isDoll = false; }); }
function shootAnchor() { this.cameras.main.shake(1000, 0.008); let anchor = this.add.image(-400, player.y - 50, 'anchor'); anchor.setScale((window.innerHeight / 2) / anchor.height).setDepth(player.y - 50 + 200); this.tweens.add({ targets: anchor, x: window.innerWidth + 400, duration: 3000, ease: 'Linear', onUpdate: (tw, tg) => { let hitRadius = tg.displayWidth / 2; monsters.children.iterate((m) => { if (m && m.active && Math.abs(m.x - tg.x) < hitRadius && Math.abs(m.y - player.y) < 200) m.destroy(); }); }, onComplete: (tw, tgs) => { if (tgs[0]) tgs[0].destroy(); } }); }
function shootArrows() { this.cameras.main.shake(2000, 0.003); this.time.addEvent({ delay: 100, repeat: 19, callback: () => { let numArrows = Phaser.Math.Between(3, 5); for (let i = 0; i < numArrows; i++) { let arrow = projectiles.create(Phaser.Math.Between(50, window.innerWidth - 50), -100, 'arrows'); arrow.setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.08, 0.15)); this.tweens.add({ targets: arrow, y: window.innerHeight + 100, duration: Phaser.Math.Between(600, 900), ease: 'Linear', onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); } }, onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); } }); } }, callbackScope: this }); }
function activateEarth() { let earthBlocks = []; let keys = ['earth1', 'earth2', 'earth3']; let blockWidth = (window.innerWidth / 3) + 200; for (let i = 0; i < 3; i++) { let e = this.add.image((window.innerWidth / 3) * i + (window.innerWidth / 6), window.innerHeight, keys[i]); e.setOrigin(0.5, 0).setDisplaySize(blockWidth, window.innerHeight).setDepth(player.y + 200); earthBlocks.push(e); } this.cameras.main.shake(3000, 0.005); this.tweens.add({ targets: earthBlocks, y: 150, duration: 3000, ease: 'Linear', onUpdate: (tw) => { let curY = earthBlocks[0].y; monsters.children.iterate((m) => { if (m && m.active && m.y >= curY - 50) m.destroy(); }); }, onComplete: (tw, targets) => { this.time.delayedCall(500, () => { this.tweens.add({ targets: targets, y: window.innerHeight + 100, alpha: 0, duration: 1000, onComplete: (tw, tgs) => { tgs.forEach(t => { if(t) t.destroy(); }); } }); }); } }); }
function activateHeal() { if (playerHealth >= 100) return; let oldHealth = playerHealth; playerHealth = Math.min(100, playerHealth + 50); this.tweens.addCounter({ from: oldHealth, to: playerHealth, duration: 500, onUpdate: (tw) => updateHealthBarWidth(tw.getValue()) }); player.setTint(0x00ff00); setTimeout(() => player.clearTint(), 300); let healIcon = this.add.image(player.x, player.y - 100, 'heal').setScale(0.05).setDepth(2000); this.tweens.add({ targets: healIcon, y: player.y - 250, scale: 0.25, alpha: 0, duration: 2000, onComplete: (tw, tgs) => { if (tgs[0]) tgs[0].destroy(); } }); }
function activateShield() { if (activeShields > 0) removeShields(); activeShields = 3; for (let i = 0; i < 3; i++) { let shield = this.add.image(player.x, player.y, 'shield').setBlendMode(Phaser.BlendModes.ADD).setScale(0.25); shield.angleOffset = (i * (Math.PI * 2)) / 3; shieldSprites.push(shield); } if (shieldTimer) shieldTimer.remove(); shieldTimer = this.time.delayedCall(5000, () => removeShields()); }
function removeShields() { activeShields = 0; shieldSprites.forEach(s => { if (s) s.destroy(); }); shieldSprites = []; }
function shootLightning() { let activeMonsters = []; monsters.children.iterate(m => { if (m && m.active) activeMonsters.push(m); }); Phaser.Utils.Array.Shuffle(activeMonsters); this.cameras.main.shake(250, 0.015); for (let i = 0; i < 4; i++) { let destX = Phaser.Math.Between(50, window.innerWidth - 50); let destY = window.innerHeight - Phaser.Math.Between(50, 150); let destScale = 1; if (activeMonsters.length > 0) { let m = activeMonsters.pop(); destX = m.x; destY = m.y; destScale = Math.max(0.6, m.scale * 2.5); } let lightning = this.add.image(destX, destY, 'lightning' + Phaser.Math.Between(1, 4)).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(destY + 200).setScale(destScale); const checkDamage = () => { monsters.children.iterate(m => { if (m && m.active && Math.abs(m.x - destX) < 250 && Math.abs(m.y - destY) < 150) m.destroy(); }); }; checkDamage(); let dmgTimer = this.time.addEvent({ delay: 50, callback: checkDamage, callbackScope: this, loop: true }); this.time.delayedCall(2000, () => { dmgTimer.remove(); this.tweens.add({ targets: lightning, alpha: 0, duration: 400, onComplete: (tw, tgs) => { if (tgs[0]) tgs[0].destroy(); } }); }); } }
function shootSwords() { let activeMonsters = []; monsters.children.iterate(m => { if (m && m.active) activeMonsters.push(m); }); Phaser.Utils.Array.Shuffle(activeMonsters); for (let i = 0; i < 5; i++) { let sword = projectiles.create(Phaser.Math.Between(50, window.innerWidth - 50), -100, 'sword').setBlendMode(Phaser.BlendModes.ADD).setScale(0.08); let destX = sword.x, destY = window.innerHeight - 50, destScale = 250 / sword.height, tm = null; if (activeMonsters.length > 0) { tm = activeMonsters.pop(); destX = tm.x; destY = tm.y; destScale = Math.max(destScale, tm.scale * 1.5); } this.tweens.add({ targets: sword, x: destX, y: destY, scale: destScale, duration: 750, delay: i * 150, ease: 'Cubic.easeIn', onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); if (tm && tm.active) tg.x += (tm.x - tg.x) * 0.08; } }, onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); } }); } }
function shootMeteor() { const fireball = projectiles.create(0, 0, 'fireball').setBlendMode(Phaser.BlendModes.ADD).setScale(0.15); let closest = null, maxScale = 0; monsters.children.iterate(m => { if (m && m.active && m.scale > maxScale) { maxScale = m.scale; closest = m; } }); let destX = window.innerWidth / 2, destY = window.innerHeight - 100, destScale = 350 / fireball.height; if (closest) { destX = closest.x; destY = closest.y; destScale = Math.max(destScale, closest.scale * 1.5); } this.tweens.add({ targets: fireball, x: destX, y: destY, scale: destScale, duration: 900, ease: 'Cubic.easeIn', onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); if (closest && closest.active) tg.x += (closest.x - tg.x) * 0.06; } }, onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); } }); }
function spawnMonster() { const monster = monsters.create(window.innerWidth / 2 + Phaser.Math.Between(-400, 400), window.innerHeight * 0.25, 'monster').setScale(0.01); monster.damage = 20; this.tweens.add({ targets: monster, x: player.x + Phaser.Math.Between(-150, 150), y: window.innerHeight + 150, scale: 250 / monster.height, duration: 12000, ease: 'Quad.easeIn', onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); } }, onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); } }); }

function hitPlayer(p, monster) {
    if (isGameOver || isDoll || isPaused) return; 
    if (activeShields > 0) { monster.destroy(); activeShields--; if (shieldSprites.length > 0) shieldSprites.pop().destroy(); player.setTint(0x00ffff); setTimeout(() => player.clearTint(), 200); if (activeShields === 0) removeShields(); return; }
    let damageTaken = monster.damage || 20;
    monster.destroy(); player.setTint(0xff0000); setTimeout(() => player.clearTint(), 300);
    let dmgText = this.add.text(player.x + 30, player.y - 50, '-' + damageTaken, { fontSize: '32px', fill: '#ff0000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: dmgText, y: player.y - 120, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => dmgText.destroy() });
    let oldHealth = playerHealth; playerHealth -= damageTaken; this.tweens.addCounter({ from: oldHealth, to: playerHealth, duration: 400, onUpdate: (tw) => updateHealthBarWidth(tw.getValue()) });
    if (playerHealth <= 0) triggerGameOver.call(this);
}

function hitMonster(projectile, monster) { if (Math.abs(projectile.y - monster.y) < 150) { let blastX = projectile.x, blastY = projectile.y; projectile.destroy(); monster.destroy(); monsters.children.iterate(m => { if (m && m.active && Math.abs(m.x - blastX) < 350 && Math.abs(m.y - blastY) < 150) m.destroy(); }); } }

function triggerGameOver() { isGameOver = true; this.physics.pause(); spawnEvent.remove(); this.add.graphics().fillStyle(0x000000, 0.8).fillRect(0, 0, window.innerWidth, window.innerHeight).setDepth(2000); this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 80, '💀 BẠN ĐÃ CHẾT! 💀', { fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001); this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 50, '[ CHƠI LẠI ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart()); this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 130, '[ VỀ TRANG CHỦ ]', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.physics.pause(); this.tweens.pauseAll(); if (spawnEvent) spawnEvent.paused = true; const h = document.getElementById('home-screen'), g = document.getElementById('game-container'); if (h && g) { h.style.display = 'flex'; setTimeout(() => { h.style.opacity = '1'; }, 10); setTimeout(() => { g.style.display = 'none'; }, 800); } }); }

// ==========================================
// VÒNG LẶP LIÊN TỤC (UPDATE)
// ==========================================
function update(time, delta) { 
    if (isPaused) return;

    // [MỚI]: Hệ thống vật lý di chuyển mượt mà
    if (!isDoll && !isGameOver) {
        let speed = 400; // Tốc độ di chuyển
        let vx = 0, vy = 0;
        
        if (moveState.left) vx = -speed;
        if (moveState.right) vx = speed;
        // Giới hạn không cho chạy tuột lên trời
        if (moveState.up && player.y > window.innerHeight * 0.4) vy = -speed;
        if (moveState.down) vy = speed;
        
        player.setVelocity(vx, vy);
    } else {
        player.setVelocity(0, 0); // Bị đóng băng thì không chạy được
    }

    if (activeShields > 0) {
        shieldSprites.forEach((shield) => {
            if (shield && shield.active) {
                shield.angleOffset += 0.004 * delta; 
                shield.x = player.x + Math.cos(shield.angleOffset) * 120;
                shield.y = player.y + Math.sin(shield.angleOffset) * 120;
                shield.setDepth(player.y + 10); 
            }
        });
    }

    for (let key in window.SKILL_CONFIG) {
        let skill = window.SKILL_CONFIG[key];
        if (skill.currentCd > 0) {
            skill.currentCd -= delta; 
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