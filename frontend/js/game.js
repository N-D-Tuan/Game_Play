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

// Hệ thống Máu & Trạng thái Game
let playerHealth = 100;
let isGameOver = false;
let healthBarBg;
let healthBarFill;
let healthBarBorder;

// ==========================================
// 1. TẢI TÀI NGUYÊN
// ==========================================
function preload() {
    this.load.image('bg', '../assets/bg.png');
    this.load.image('player', '../assets/player.png'); 
    this.load.image('monster', '../assets/monster.png'); 
    this.load.image('fireball', '../assets/fireball.png'); 
}

// ==========================================
// 2. KHỞI TẠO VÀ SẮP XẾP ĐỐI TƯỢNG
// ==========================================
function create() {
    playerHealth = 100;
    isGameOver = false;

    bg = this.add.image(window.innerWidth / 2, window.innerHeight / 2, 'bg');
    bg.setDisplaySize(window.innerWidth, window.innerHeight);

    player = this.physics.add.sprite(window.innerWidth / 2, window.innerHeight - 150, 'player');
    player.setCollideWorldBounds(true); 
    
    const targetHeight = 250;
    const scaleRatio = targetHeight / player.height;
    player.setScale(scaleRatio); 

    monsters = this.physics.add.group();
    projectiles = this.physics.add.group(); 

    spawnEvent = this.time.addEvent({
        delay: 3500, 
        callback: spawnMonster,
        callbackScope: this,
        loop: true
    });

    this.physics.add.overlap(player, monsters, hitPlayer, null, this);
    this.physics.add.overlap(projectiles, monsters, hitMonster, null, this);

    // VẼ THANH MÁU (UI)
    drawHealthBar.call(this);

    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
        bg.setPosition(window.innerWidth / 2, window.innerHeight / 2);
        bg.setDisplaySize(window.innerWidth, window.innerHeight);
        player.y = window.innerHeight - 150;
    });

    // LẮNG NGHE LỆNH TỪ AI 
    const actionHandler = (e) => {
        if (isGameOver) return; 

        const action = e.detail; 
        if (action === "⬅ NÉ TRÁI!") {
            this.tweens.add({ targets: player, x: player.x - 300, duration: 200, ease: 'Power2' });
        } 
        else if (action === "NÉ PHẢI! ➡") {
            this.tweens.add({ targets: player, x: player.x + 300, duration: 200, ease: 'Power2' });
        }
        else if (action === "☄️ THIÊN THẠCH (Đường chéo)") {
            shootMeteor.call(this);
        }
    };

    window.addEventListener('PlayerAction', actionHandler);

    this.events.on('shutdown', () => {
        window.removeEventListener('PlayerAction', actionHandler);
    });
}

// ==========================================
// HỆ THỐNG THANH MÁU BẢN MỚI
// ==========================================
function drawHealthBar() {
    // 1. Viền ngoài (Border vàng bao quanh)
    healthBarBorder = this.add.graphics();
    healthBarBorder.lineStyle(4, 0xffcc00, 1);
    healthBarBorder.strokeRect(18, 18, 304, 29);
    healthBarBorder.setDepth(1000);

    // 2. Nền đen bên trong (khi mất máu sẽ lộ nền này)
    healthBarBg = this.add.graphics();
    healthBarBg.fillStyle(0x222222, 1);
    healthBarBg.fillRect(20, 20, 300, 25);
    healthBarBg.setDepth(1000);

    // 3. Thanh máu màu đỏ
    healthBarFill = this.add.graphics();
    updateHealthBarWidth(100);

    // Thêm Text "HP"
    this.add.text(20, 55, 'MÁU PHÁP SƯ', { fontSize: '18px', fill: '#ffffff', fontStyle: 'bold' }).setDepth(1000);
}

// Hàm vẽ lại độ dài thanh máu
function updateHealthBarWidth(healthValue) {
    healthBarFill.clear();
    healthBarFill.fillStyle(0xff0000, 1); // Đổi thành màu Đỏ
    
    let currentWidth = (healthValue / 100) * 300;
    if (currentWidth < 0) currentWidth = 0;
    
    healthBarFill.fillRect(20, 20, currentWidth, 25);
    healthBarFill.setDepth(1001);
}

// ==========================================
// HÀM BẮN SKILL THIÊN THẠCH
// ==========================================
function getClosestMonster() {
    let closest = null;
    let maxScale = 0; 
    monsters.children.iterate(function(monster) {
        if (monster && monster.active && monster.scale > maxScale) {
            maxScale = monster.scale;
            closest = monster;
        }
    });
    return closest;
}

function shootMeteor() {
    const startX = 0;
    const startY = 0;
    const fireball = projectiles.create(startX, startY, 'fireball');
    
    // [CẢI TIẾN]: Xuất hiện to hơn (0.15 thay vì 0.01) để nhìn rõ ngay từ đầu
    fireball.setScale(0.15); 

    let targetMonster = getClosestMonster();
    let destX = window.innerWidth / 2;
    let destY = window.innerHeight - 100;
    
    // [CẢI TIẾN]: Kích thước khổng lồ khi rơi xuống (chiều cao 350px)
    const fireballMaxHeight = 350; 
    let destScale = fireballMaxHeight / fireball.height; 

    if (targetMonster) {
        destX = targetMonster.x;
        destY = targetMonster.y;
        
        // Vẫn giữ tỷ lệ to, nhưng tinh chỉnh một chút theo mục tiêu để ăn khớp va chạm
        destScale = Math.max(destScale, targetMonster.scale * 1.5); 
    }

    this.tweens.add({
        targets: fireball,
        x: destX,
        y: destY,
        scale: destScale, 
        duration: 900, // Bay nhanh hơn 1 chút
        ease: 'Cubic.easeIn', 
        onUpdate: function (tween, target) {
            if (target && target.active && target.body) {
                target.body.setSize(target.width, target.height, true);
                target.setDepth(target.y); 
                
                if (targetMonster && targetMonster.active) {
                    target.x += (targetMonster.x - target.x) * 0.06;
                }
            }
        },
        onComplete: function(tween, targets) {
            if (targets[0] && targets[0].active) {
                targets[0].destroy(); 
            }
        }
    });
}

// ==========================================
// HÀM SINH QUÁI VẬT
// ==========================================
function spawnMonster() {
    const horizonY = window.innerHeight * 0.25; 
    const startX = (window.innerWidth / 2) + Phaser.Math.Between(-400, 400);

    const monster = monsters.create(startX, horizonY, 'monster');
    monster.setScale(0.01);

    const targetX = player.x + Phaser.Math.Between(-150, 150); 
    const targetY = window.innerHeight + 150; 

    const targetHeight = 250;
    const targetScale = targetHeight / monster.height;

    this.tweens.add({
        targets: monster,
        x: targetX,
        y: targetY,
        scale: targetScale,
        duration: 12000, 
        ease: 'Quad.easeIn', 
        onUpdate: function (tween, target) {
            if (target && target.active && target.body) {
                target.body.setSize(target.width, target.height, true);
                target.setDepth(target.y); 
            }
        },
        onComplete: function(tween, targets) {
            if (targets[0] && targets[0].active) {
                targets[0].destroy(); 
            }
        }
    });
}

// ==========================================
// XỬ LÝ VA CHẠM (NGƯỜI VÀ QUÁI)
// ==========================================
function hitPlayer(player, monster) {
    if (isGameOver) return;

    monster.destroy(); 
    player.setTint(0xff0000);
    setTimeout(() => { player.clearTint(); }, 300);
    
    // [CẢI TIẾN]: Tụt máu từ từ mượt mà
    let oldHealth = playerHealth;
    playerHealth -= 20;
    
    this.tweens.addCounter({
        from: oldHealth,
        to: playerHealth,
        duration: 400, // Tụt dần trong 0.4 giây
        onUpdate: (tween) => {
            updateHealthBarWidth(tween.getValue());
        }
    });

    if (playerHealth <= 0) {
        triggerGameOver.call(this);
    }
}

// ==========================================
// XỬ LÝ VA CHẠM (ĐẠN VÀ QUÁI) - CÓ SÁT THƯƠNG LAN
// ==========================================
function hitMonster(projectile, monster) {
    // [CẢI TIẾN]: Nới lỏng sai số 3D từ 0.25 lên 0.4 giúp cực kỳ dễ trúng
    if (Math.abs(projectile.scale - monster.scale) < 0.4) {
        
        let blastX = projectile.x;
        let blastScale = projectile.scale;
        
        projectile.destroy(); // Đạn nổ
        
        // [CẢI TIẾN]: SÁT THƯƠNG LAN (AoE)
        // Thay vì chỉ diệt 1 con, vòng lặp này quét qua toàn bộ quái.
        // Con nào đứng gần tâm vụ nổ (bán kính 350px) đều bị nát gáo.
        monsters.children.iterate(function(m) {
            if (m && m.active) {
                if (Math.abs(m.x - blastX) < 350 && Math.abs(m.scale - blastScale) < 0.4) {
                    m.destroy(); 
                }
            }
        });
        
        console.log("🔥 ĐẠN NỔ LAN!");
    }
}

// ==========================================
// MÀN HÌNH GAME OVER
// ==========================================
function triggerGameOver() {
    isGameOver = true;
    
    this.physics.pause();
    spawnEvent.remove(); 

    let overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, window.innerWidth, window.innerHeight);
    overlay.setDepth(2000);

    this.add.text(window.innerWidth / 2, window.innerHeight / 2 - 80, '💀 BẠN ĐÃ CHẾT! 💀', { 
        fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' 
    }).setOrigin(0.5).setDepth(2001);

    let retryBtn = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 50, '[ CHƠI LẠI ]', { 
        fontSize: '32px', fill: '#00ff00', backgroundColor: '#333', padding: {x: 20, y: 10} 
    }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true });
    
    retryBtn.on('pointerdown', () => {
        this.scene.restart(); 
    });

    let homeBtn = this.add.text(window.innerWidth / 2, window.innerHeight / 2 + 130, '[ VỀ TRANG CHỦ ]', { 
        fontSize: '24px', fill: '#ffffff', backgroundColor: '#333', padding: {x: 20, y: 10} 
    }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true });
    
    homeBtn.on('pointerdown', () => {
        window.location.reload(); 
    });
}

function update() { }