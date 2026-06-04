// ==========================================
// CẤU HÌNH GAME
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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// ==========================================
// CÁC BIẾN TOÀN CỤC CỦA GAME
// ==========================================
let player;
let bg;
let monsters; 
let projectiles; 
let spawnEvent; 

let playerHealth = 100;
let isGameOver = false;
let isPaused = false; 

// Biến quản lý UI Thanh máu
let healthBarBg;
let healthBarFill;
let hpFrame;
let hpText;

// Biến quản lý kỹ năng
let activeShields = 0;   
let shieldSprites = [];  
let shieldTimer = null;  
let isDoll = false;      
let originalPlayerScale = 1;

// [YÊU CẦU 3]: Cấu hình Hồi chiêu (Cooldown) cho các kỹ năng
// Đơn vị: ms (1000 = 1 giây)
const SKILL_CONFIG = {
    'meteor':   { name: "☄️ THIÊN THẠCH (Đường chéo)", icon: 'fireball',   cd: 3000, currentCd: 0, ui: null },
    'swords':   { name: "⚔️ PHI KIẾM (Đường kiếm dọc)", icon: 'sword',      cd: 5000, currentCd: 0, ui: null },
    'lightning':{ name: "⚡ SẤM SÉT (Zic-zac)",          icon: 'lightning1', cd: 7000, currentCd: 0, ui: null },
    'shield':   { name: "🛡️ LÁ CHẮN (Khép kín)",         icon: 'shield',     cd: 12000, currentCd: 0, ui: null },
    'heal':     { name: "💚 HỒI MÁU (Trái tim)",         icon: 'heal',       cd: 15000, currentCd: 0, ui: null },
    'earth':    { name: "⛰️ THỔ ĐỘN (Mũi tên hướng lên)", icon: 'earth2',     cd: 10000, currentCd: 0, ui: null },
    'arrows':   { name: "🏹 VẠN TIỄN (Mũi tên hướng phải)", icon: 'arrows',  cd: 8000, currentCd: 0, ui: null },
    'anchor':   { name: "⚓ TÀU CHIẾN (Mũi tên hướng xuống)",icon: 'anchor',  cd: 15000, currentCd: 0, ui: null },
    'doll':     { name: "🎎 HÌNH NHÂN THẾ MẠNG",          icon: 'doll',       cd: 20000, currentCd: 0, ui: null },
};

// ==========================================
// 1. TẢI TÀI NGUYÊN
// ==========================================
function preload() {
    this.load.image('bg', '../assets/bg.png');
    this.load.image('player', '../assets/player.png'); 
    this.load.image('monster', '../assets/monster.png'); 
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
    
    // [YÊU CẦU 2]: Tải ảnh khung viền máu VIP
    this.load.image('hp_frame', '../assets/hp_frame.png'); 
}

// ==========================================
// 2. KHỞI TẠO VÀ SẮP XẾP ĐỐI TƯỢNG
// ==========================================
function create() {
    playerHealth = 100;
    isGameOver = false;
    isPaused = false;
    isDoll = false;
    activeShields = 0;
    shieldSprites = [];
    
    // Reset hồi chiêu khi chơi lại
    for(let key in SKILL_CONFIG) { SKILL_CONFIG[key].currentCd = 0; }

    bg = this.add.image(window.innerWidth / 2, window.innerHeight / 2, 'bg');
    bg.setDisplaySize(window.innerWidth, window.innerHeight);

    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight - 150, 'player');
    player.setCollideWorldBounds(true); 
    originalPlayerScale = 250 / player.height;
    player.setScale(originalPlayerScale); 

    monsters = this.physics.add.group();
    projectiles = this.physics.add.group(); 

    spawnEvent = this.time.addEvent({
        delay: 3500, callback: spawnMonster, callbackScope: this, loop: true
    });

    this.physics.add.overlap(player, monsters, hitPlayer, null, this);
    this.physics.add.overlap(projectiles, monsters, hitMonster, null, this);

    // [GỌI HÀM VẼ UI]
    drawHealthBar.call(this);
    createSkillUI.call(this);
    createPauseMenu.call(this);

    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
        bg.setPosition(window.innerWidth / 2, window.innerHeight / 2);
        bg.setDisplaySize(window.innerWidth, window.innerHeight);
        player.y = window.innerHeight - 150;
    });

    // LẮNG NGHE LỆNH TỪ AI 
    const actionHandler = (e) => {
        if (isGameOver || isDoll || isPaused) return; 

        const action = e.detail; 
        
        // Kỹ năng Né không cần hồi chiêu
        if (action === "⬅ NÉ TRÁI!") this.tweens.add({ targets: player, x: player.x - 300, duration: 200, ease: 'Power2' });
        else if (action === "NÉ PHẢI! ➡") this.tweens.add({ targets: player, x: player.x + 300, duration: 200, ease: 'Power2' });
        
        // Kiểm tra Hồi chiêu trước khi tung kỹ năng
        else checkAndCastSkill.call(this, action);
    };

    window.addEventListener('PlayerAction', actionHandler);
    this.events.on('shutdown', () => { window.removeEventListener('PlayerAction', actionHandler); });

    // [YÊU CẦU 1]: Lắng nghe nút ESC để Pause
    this.input.keyboard.on('keydown-ESC', togglePause, this);
}

// ==========================================
// [YÊU CẦU 3]: HỆ THỐNG GIAO DIỆN HỒI CHIÊU (COOLDOWN UI)
// ==========================================
function createSkillUI() {
    let startX = window.innerWidth / 2 - 300; 
    let startY = window.innerHeight - 50; 
    let spacing = 70; 
    let index = 0;

    for (let key in SKILL_CONFIG) {
        let skill = SKILL_CONFIG[key];
        let posX = startX + (index * spacing);
        
        // Lưu lại tọa độ tâm để lát vẽ vòng tròn xoay
        skill.posX = posX; 
        skill.startY = startY; 

        let bgCircle = this.add.graphics();
        bgCircle.fillStyle(0x000000, 0.5);
        bgCircle.fillCircle(posX, startY, 25);
        bgCircle.setDepth(1500);

        let icon = this.add.image(posX, startY, skill.icon);
        let scale = 30 / Math.max(icon.width, icon.height);
        icon.setScale(scale);
        icon.setDepth(1501);

        // Lớp đồ họa này sẽ được dùng để vẽ hiệu ứng xoay vòng (Pie Chart)
        let cdOverlay = this.add.graphics();
        cdOverlay.setDepth(1502);

        let cdText = this.add.text(posX, startY, '', { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold' })
            .setOrigin(0.5).setDepth(1503).setVisible(false);

        let glow = this.add.graphics();
        glow.lineStyle(3, 0x00ffff, 1);
        glow.strokeCircle(posX, startY, 26);
        glow.setDepth(1504);

        skill.ui = { overlay: cdOverlay, text: cdText, glow: glow };
        index++;
    }
}

// Hàm kiểm tra và tung chiêu
function checkAndCastSkill(actionName) {
    for (let key in SKILL_CONFIG) {
        if (SKILL_CONFIG[key].name === actionName) {
            let skill = SKILL_CONFIG[key];
            
            // Nếu chưa hồi xong -> Bỏ qua
            if (skill.currentCd > 0) {
                console.log(`⏳ Kỹ năng ${skill.name} đang hồi chiêu!`);
                return;
            }

            // Tung chiêu
            if (key === 'meteor') shootMeteor.call(this);
            else if (key === 'swords') shootSwords.call(this);
            else if (key === 'lightning') shootLightning.call(this);
            else if (key === 'shield') activateShield.call(this);
            else if (key === 'heal') activateHeal.call(this);
            else if (key === 'earth') activateEarth.call(this);
            else if (key === 'arrows') shootArrows.call(this);
            else if (key === 'anchor') shootAnchor.call(this);
            else if (key === 'doll') activateDoll.call(this);

            // Bắt đầu đếm ngược hồi chiêu
            skill.currentCd = skill.cd;
            
            // Tắt viền phát sáng, bật lớp phủ xám
            skill.ui.glow.setVisible(false);
            skill.ui.overlay.setVisible(true);
            skill.ui.text.setVisible(true);
            break;
        }
    }
}

// ==========================================
// [YÊU CẦU 2]: THANH MÁU VIP CÓ KHUNG VIỀN TRANG TRÍ
// ==========================================
const BAR_X = 223;      // Điều chỉnh vị trí theo trục x
const BAR_Y = 67;       // Điều chỉnh vị trí theo trục y
const BAR_WIDTH = 295;  // Tăng chiều rộng để đủ chỗ cho khung viền và tạo hiệu ứng vát góc đẹp hơn 
const BAR_HEIGHT = 50;  // Tăng chiều cao để đủ chỗ cho khung viền và tạo hiệu ứng vát góc đẹp hơn 
const SLANT = 31;       // Độ cong vát của góc trên trái (tính bằng pixel)

const HP_TEXT_X = 175;  // Vị trí của chữ HP theo trục x
const HP_TEXT_Y = 118;   // Vị trí của chữ HP theo trục y

function drawHealthBar() {
    hpFrame = this.add.image(100, 20, 'hp_frame').setOrigin(0, 0);
    hpFrame.setScale(0.35); 
    hpFrame.setDepth(1002);

    healthBarBg = this.add.graphics();
    healthBarBg.fillStyle(0x222222, 1); // Nền đen
    healthBarBg.setDepth(1000);

    // Vẽ nền đen theo hình thang (Vát góc trên trái)
    healthBarBg.beginPath();
    healthBarBg.moveTo(BAR_X + SLANT, BAR_Y);                  // Điểm 1: Góc trên trái (Lùi vào trong SLANT pixel)
    healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y);              // Điểm 2: Góc trên phải
    healthBarBg.lineTo(BAR_X + BAR_WIDTH, BAR_Y + BAR_HEIGHT); // Điểm 3: Góc dưới phải
    healthBarBg.lineTo(BAR_X, BAR_Y + BAR_HEIGHT);             // Điểm 4: Góc dưới trái (Giữ nguyên không lùi)
    healthBarBg.closePath();
    healthBarBg.fillPath();

    healthBarFill = this.add.graphics();

    hpText = this.add.text(HP_TEXT_X, HP_TEXT_Y, playerHealth + ' / 100', { 
        fontSize: '26px', 
        fill: '#ff3333', 
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(1003);

    updateHealthBarWidth(100);
}

function updateHealthBarWidth(healthValue) {
    healthBarFill.clear();
    
    // Nếu hết máu thì không vẽ gì cả để tránh lỗi hình học
    if (healthValue <= 0) return; 

    healthBarFill.fillStyle(0xff0000, 1); 
    let currentWidth = (healthValue / 100) * BAR_WIDTH; 
    
    // Vẽ thanh đỏ cũng theo hình thang vát góc y hệt nền đen
    healthBarFill.beginPath();
    healthBarFill.moveTo(BAR_X + SLANT, BAR_Y); 
    
    // Khi máu tụt xuống quá thấp (Thấp hơn độ vát), cần chốt góc trên phải lại để tạo thành hình tam giác
    let topRightX = Math.max(BAR_X + SLANT, BAR_X + currentWidth);
    healthBarFill.lineTo(topRightX, BAR_Y); 
    
    healthBarFill.lineTo(BAR_X + currentWidth, BAR_Y + BAR_HEIGHT); 
    healthBarFill.lineTo(BAR_X, BAR_Y + BAR_HEIGHT); 
    
    healthBarFill.closePath();
    healthBarFill.fillPath();
    
    healthBarFill.setDepth(1001);

    if(hpText) hpText.setText(Math.round(healthValue));
}

// ==========================================
// 2. NÚT TẠM DỪNG (GÓC TRÁI TRÊN CÙNG)
// ==========================================
function createPauseMenu() {
    // Vẽ nút Pause xịn xò (Nền đen bo tròn) ở góc X=20, Y=20
    let pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.7); 
    pauseBg.fillRoundedRect(20, 20, 50, 50, 10);
    pauseBg.setDepth(4000);

    // Căn chỉnh icon vào giữa nền đen
    let pauseBtnIcon = this.add.text(25, 30, '⏸️', { fontSize: '30px' })
        .setInteractive({ useHandCursor: true }).setDepth(4001);
    pauseBtnIcon.on('pointerdown', () => togglePause.call(this));

    // Màn hình mờ và các nút chức năng (Giữ nguyên)
    pauseOverlay = this.add.graphics();
    pauseOverlay.fillStyle(0x000000, 0.85);
    pauseOverlay.fillRect(0, 0, window.innerWidth, window.innerHeight);
    pauseOverlay.setDepth(5000);
    
    txtPause = this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 120, 'TẠM DỪNG', 
        { fontSize: '60px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5001);

    btnResume = this.add.text(window.innerWidth / 2, window.innerHeight / 2, '[ TIẾP TỤC ]', 
        { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} })
        .setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true });
    btnResume.on('pointerdown', () => togglePause.call(this));

    btnInventory = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 70, '[ KHO ĐỒ ]', 
        { fontSize: '32px', fill: '#ffff00', backgroundColor: '#333', padding: {x: 20, y: 10} })
        .setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true });
    btnInventory.on('pointerdown', () => { alert("Tính năng Kho đồ đang được phát triển!"); });

    btnHome = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 140, '[ TRANG CHỦ ]', 
        { fontSize: '32px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} })
        .setOrigin(0.5).setDepth(5001).setInteractive({ useHandCursor: true });
    btnHome.on('pointerdown', () => { window.location.reload(); });

    setPauseMenuVisible(false);
}

function togglePause() {
    if (isGameOver) return; // Chết rồi thì không pause được nữa
    
    isPaused = !isPaused;
    
    if (isPaused) {
        this.physics.pause();       // Dừng vật lý (đạn bay, quái đi)
        spawnEvent.paused = true;   // Dừng đẻ quái
        this.tweens.pauseAll();     // Dừng toàn bộ hiệu ứng
        setPauseMenuVisible(true);
    } else {
        this.physics.resume();
        spawnEvent.paused = false;
        this.tweens.resumeAll();
        setPauseMenuVisible(false);
    }
}

function setPauseMenuVisible(visible) {
    pauseOverlay.setVisible(visible);
    txtPause.setVisible(visible);
    btnResume.setVisible(visible);
    btnInventory.setVisible(visible);
    btnHome.setVisible(visible);
}


// ==========================================
// CÁC KỸ NĂNG CỦA PHÁP SƯ (Đã rút gọn logic)
// ==========================================
function activateDoll() {
    player.setVisible(false);
    let dollImg = this.add.image(player.x, player.y, 'doll');
    dollImg.setScale(250 / dollImg.height).setDepth(player.y);
    isDoll = true;

    this.time.delayedCall(4000, () => {
        this.cameras.main.shake(600, 0.02);
        let blastRadius = 350;
        let shockwave = this.add.graphics().setDepth(3000);

        this.tweens.addCounter({
            from: 20, to: blastRadius, duration: 300,     
            onUpdate: (tween) => {
                shockwave.clear();
                shockwave.lineStyle(15, 0xffaa00, 1 - tween.progress);
                shockwave.strokeCircle(player.x, player.y, tween.getValue());
            },
            onComplete: () => { shockwave.destroy(); }
        });

        monsters.children.iterate((m) => {
            if (m && m.active) {
                if (Math.abs(m.x - player.x) < blastRadius && Math.abs(m.y - player.y) < 150) m.destroy(); 
            }
        });

        dollImg.destroy();      
        player.setVisible(true); 
        isDoll = false;
    });
}

function shootAnchor() {
    this.cameras.main.shake(1000, 0.008);
    let anchor = this.add.image(-400, player.y - 50, 'anchor');
    anchor.setScale((window.innerHeight / 2) / anchor.height).setDepth(player.y - 50 + 200); 
    
    this.tweens.add({
        targets: anchor, x: window.innerWidth + 400, duration: 3000, ease: 'Linear',
        onUpdate: (tween, target) => {
            let hitRadius = target.displayWidth / 2; 
            monsters.children.iterate((m) => {
                if (m && m.active) {
                    if (Math.abs(m.x - target.x) < hitRadius && Math.abs(m.y - player.y) < 200) m.destroy(); 
                }
            });
        },
        onComplete: (tween, targets) => { if (targets[0]) targets[0].destroy(); }
    });
}

function shootArrows() {
    this.cameras.main.shake(2000, 0.003);
    this.time.addEvent({
        delay: 100, repeat: 19,
        callback: () => {
            let numArrows = Phaser.Math.Between(3, 5);
            for (let i = 0; i < numArrows; i++) {
                let arrow = projectiles.create(Phaser.Math.Between(50, window.innerWidth - 50), -100, 'arrows');
                arrow.setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.08, 0.15)); 
                this.tweens.add({
                    targets: arrow, y: window.innerHeight + 100, duration: Phaser.Math.Between(600, 900), ease: 'Linear',
                    onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); } },
                    onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); }
                });
            }
        }, callbackScope: this
    });
}

function activateEarth() {
    let earthBlocks = [];
    let keys = ['earth1', 'earth2', 'earth3'];
    let blockWidth = (window.innerWidth / 3) + 200; 

    for (let i = 0; i < 3; i++) {
        let e = this.add.image((window.innerWidth / 3) * i + (window.innerWidth / 6), window.innerHeight, keys[i]);
        e.setOrigin(0.5, 0).setDisplaySize(blockWidth, window.innerHeight).setDepth(player.y + 200); 
        earthBlocks.push(e);
    }
    this.cameras.main.shake(3000, 0.005);
    this.tweens.add({
        targets: earthBlocks, y: 150, duration: 3000, ease: 'Linear',   
        onUpdate: (tween) => {
            let curY = earthBlocks[0].y;
            monsters.children.iterate((m) => { if (m && m.active && m.y >= curY - 50) m.destroy(); });
        },
        onComplete: (tween, targets) => {
            this.time.delayedCall(500, () => {
                this.tweens.add({ targets: targets, y: window.innerHeight + 100, alpha: 0, duration: 1000, onComplete: (tw, tgs) => { tgs.forEach(t => { if(t) t.destroy(); }); } });
            });
        }
    });
}

function activateHeal() {
    if (playerHealth >= 100) return; 
    let oldHealth = playerHealth;
    playerHealth = Math.min(100, playerHealth + 50); 
    this.tweens.addCounter({ from: oldHealth, to: playerHealth, duration: 500, onUpdate: (tw) => updateHealthBarWidth(tw.getValue()) });
    player.setTint(0x00ff00);
    setTimeout(() => player.clearTint(), 300);
    let healIcon = this.add.image(player.x, player.y - 100, 'heal').setScale(0.05).setDepth(2000);
    this.tweens.add({ targets: healIcon, y: player.y - 250, scale: 0.25, alpha: 0, duration: 2000, onComplete: (tw, tgs) => { if (tgs[0]) tgs[0].destroy(); } });
}

function activateShield() {
    if (activeShields > 0) removeShields();
    activeShields = 3;
    for (let i = 0; i < 3; i++) {
        let shield = this.add.image(player.x, player.y, 'shield').setBlendMode(Phaser.BlendModes.ADD).setScale(0.25); 
        shield.angleOffset = (i * (Math.PI * 2)) / 3; 
        shieldSprites.push(shield);
    }
    if (shieldTimer) shieldTimer.remove();
    shieldTimer = this.time.delayedCall(5000, () => removeShields());
}

function removeShields() {
    activeShields = 0;
    shieldSprites.forEach(s => { if (s) s.destroy(); });
    shieldSprites = [];
}

function shootLightning() {
    let activeMonsters = [];
    monsters.children.iterate(m => { if (m && m.active) activeMonsters.push(m); });
    Phaser.Utils.Array.Shuffle(activeMonsters);
    this.cameras.main.shake(250, 0.015);

    for (let i = 0; i < 4; i++) {
        let destX = Phaser.Math.Between(50, window.innerWidth - 50);
        let destY = window.innerHeight - Phaser.Math.Between(50, 150);
        let destScale = 1; 

        if (activeMonsters.length > 0) {
            let m = activeMonsters.pop();
            destX = m.x; destY = m.y; destScale = Math.max(0.6, m.scale * 2.5); 
        }

        let lightning = this.add.image(destX, destY, 'lightning' + Phaser.Math.Between(1, 4)).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(destY + 200).setScale(destScale); 
        const checkDamage = () => { monsters.children.iterate(m => { if (m && m.active && Math.abs(m.x - destX) < 250 && Math.abs(m.y - destY) < 150) m.destroy(); }); };
        checkDamage();
        let dmgTimer = this.time.addEvent({ delay: 50, callback: checkDamage, callbackScope: this, loop: true });

        this.time.delayedCall(2000, () => {
            dmgTimer.remove(); 
            this.tweens.add({ targets: lightning, alpha: 0, duration: 400, onComplete: (tw, tgs) => { if (tgs[0]) tgs[0].destroy(); } });
        });
    }
}

function shootSwords() {
    let activeMonsters = [];
    monsters.children.iterate(m => { if (m && m.active) activeMonsters.push(m); });
    Phaser.Utils.Array.Shuffle(activeMonsters);

    for (let i = 0; i < 5; i++) {
        let sword = projectiles.create(Phaser.Math.Between(50, window.innerWidth - 50), -100, 'sword').setBlendMode(Phaser.BlendModes.ADD).setScale(0.08); 
        let destX = sword.x, destY = window.innerHeight - 50, destScale = 250 / sword.height, tm = null;
        
        if (activeMonsters.length > 0) {
            tm = activeMonsters.pop(); 
            destX = tm.x; destY = tm.y; destScale = Math.max(destScale, tm.scale * 1.5); 
        }

        this.tweens.add({
            targets: sword, x: destX, y: destY, scale: destScale, duration: 750, delay: i * 150, ease: 'Cubic.easeIn', 
            onUpdate: (tw, tg) => {
                if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); if (tm && tm.active) tg.x += (tm.x - tg.x) * 0.08; }
            },
            onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); }
        });
    }
}

function shootMeteor() {
    const fireball = projectiles.create(0, 0, 'fireball').setBlendMode(Phaser.BlendModes.ADD).setScale(0.15); 
    let closest = null, maxScale = 0; 
    monsters.children.iterate(m => { if (m && m.active && m.scale > maxScale) { maxScale = m.scale; closest = m; } });
    
    let destX = window.innerWidth / 2, destY = window.innerHeight - 100, destScale = 350 / fireball.height; 
    if (closest) { destX = closest.x; destY = closest.y; destScale = Math.max(destScale, closest.scale * 1.5); }

    this.tweens.add({
        targets: fireball, x: destX, y: destY, scale: destScale, duration: 900, ease: 'Cubic.easeIn', 
        onUpdate: (tw, tg) => {
            if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); if (closest && closest.active) tg.x += (closest.x - tg.x) * 0.06; }
        },
        onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); }
    });
}

function spawnMonster() {
    const monster = monsters.create(window.innerWidth / 2 + Phaser.Math.Between(-400, 400), window.innerHeight * 0.25, 'monster').setScale(0.01);

    monster.damage = 20

    this.tweens.add({
        targets: monster, x: player.x + Phaser.Math.Between(-150, 150), y: window.innerHeight + 150, scale: 250 / monster.height, duration: 12000, ease: 'Quad.easeIn', 
        onUpdate: (tw, tg) => { if (tg && tg.active && tg.body) { tg.body.setSize(tg.width, tg.height, true); tg.setDepth(tg.y); } },
        onComplete: (tw, tgs) => { if (tgs[0] && tgs[0].active) tgs[0].destroy(); }
    });
}

// ==========================================
// XỬ LÝ VA CHẠM VÀ CẬP NHẬT (UPDATE LOOP)
// ==========================================
function hitPlayer(player, monster) {
    if (isGameOver || isDoll || isPaused) return; 

    if (activeShields > 0) {
        monster.destroy(); activeShields--;   
        if (shieldSprites.length > 0) shieldSprites.pop().destroy(); 
        player.setTint(0x00ffff);
        setTimeout(() => player.clearTint(), 200);
        if (activeShields === 0) removeShields();
        return; 
    }

    let damageTaken = monster.damage || 20;

    monster.destroy();
    player.setTint(0xff0000);
    setTimeout(() => player.clearTint(), 300);
    
    let dmgText = this.add.text(player.x + 30, player.y - 50, '-' + damageTaken, { 
        fontSize: '32px', 
        fill: '#ff0000', 
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
        targets: dmgText,
        y: player.y - 120, 
        alpha: 0,          
        duration: 1000,    
        ease: 'Power1',
        onComplete: () => dmgText.destroy() 
    });
    
    let oldHealth = playerHealth;
    playerHealth -= damageTaken;
    this.tweens.addCounter({ from: oldHealth, to: playerHealth, duration: 400, onUpdate: (tw) => updateHealthBarWidth(tw.getValue()) });
    
    if (playerHealth <= 0) triggerGameOver.call(this);
}

function hitMonster(projectile, monster) {
    if (Math.abs(projectile.y - monster.y) < 150) {
        let blastX = projectile.x, blastY = projectile.y; 
        projectile.destroy(); monster.destroy();    
        monsters.children.iterate(m => { if (m && m.active && Math.abs(m.x - blastX) < 350 && Math.abs(m.y - blastY) < 150) m.destroy(); });
    }
}

function triggerGameOver() {
    isGameOver = true; this.physics.pause(); spawnEvent.remove(); 
    let overlay = this.add.graphics().fillStyle(0x000000, 0.8).fillRect(0, 0, window.innerWidth, window.innerHeight).setDepth(2000);
    this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 80, '💀 BẠN ĐÃ CHẾT! 💀', { fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001);
    this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 50, '[ CHƠI LẠI ]', { fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart());
    this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 130, '[ VỀ TRANG CHỦ ]', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true }).on('pointerdown', () => window.location.reload());
}

// Vòng lặp liên tục của game
function update(time, delta) { 
    if (isPaused) return;

    // Quay khiên
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

    // [YÊU CẦU 3]: Update Giao diện thời gian hồi chiêu
    for (let key in SKILL_CONFIG) {
        let skill = SKILL_CONFIG[key];
        if (skill.currentCd > 0) {
            skill.currentCd -= delta; 
            
            if (skill.currentCd <= 0) {
                // Đã hồi xong -> Xóa lớp mờ, Bật viền sáng
                skill.currentCd = 0;
                skill.ui.overlay.clear(); 
                skill.ui.text.setVisible(false);
                skill.ui.glow.setVisible(true);
            } else {
                // Đang hồi -> VẼ HIỆU ỨNG MÀU XÁM XOAY VÒNG (Pie Chart Wipe)
                let progress = skill.currentCd / skill.cd; // Tỷ lệ giảm dần từ 1.0 về 0.0
                
                let startAngle = Phaser.Math.DegToRad(-90); // Bắt đầu từ góc 12 giờ (Đỉnh)
                let endAngle = startAngle + (Math.PI * 2 * progress); // Vòng xoay giảm dần
                
                skill.ui.overlay.clear();
                skill.ui.overlay.fillStyle(0x000000, 0.75); // Màu đen xám, độ mờ 75%
                skill.ui.overlay.beginPath();
                skill.ui.overlay.moveTo(skill.posX, skill.startY); // Kéo bút về tâm
                skill.ui.overlay.arc(skill.posX, skill.startY, 25, startAngle, endAngle, false); // Vẽ cung tròn
                skill.ui.overlay.closePath();
                skill.ui.overlay.fillPath();

                // Hiển thị số giây còn lại (làm tròn lên)
                let secondsLeft = Math.ceil(skill.currentCd / 1000);
                skill.ui.text.setText(secondsLeft);
            }
        }
    }
}