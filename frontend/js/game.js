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

// Các biến quản lý Lá chắn
let activeShields = 0;   // Số lớp khiên đang có
let shieldSprites = [];  // Mảng chứa hình ảnh 3 cái khiên
let shieldTimer = null;  // Đồng hồ đếm ngược 3 giây

// Biến trạng thái để biết Pháp sư có đang là Hình nhân không
let isDoll = false;      
let originalPlayerScale = 1;

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
}

// ==========================================
// 2. KHỞI TẠO VÀ SẮP XẾP ĐỐI TƯỢNG
// ==========================================
function create() {
    playerHealth = 100;
    isGameOver = false;
    isDoll = false; 
    activeShields = 0;
    shieldSprites = [];

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
        if (isGameOver|| isDoll) return; 

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
        else if (action === "⚔️ PHI KIẾM (Đường kiếm dọc)") {
            shootSwords.call(this);
        }
        else if (action === "⚡ SẤM SÉT (Zic-zac)") {
            shootLightning.call(this);
        }
        else if (action === "🛡️ LÁ CHẮN (Khép kín)") {
            activateShield.call(this);
        }
        else if (action === "💚 HỒI MÁU (Trái tim)") {
            activateHeal.call(this);
        }
        else if (action === "⛰️ THỔ ĐỘN (Mũi tên hướng lên)") {
            activateEarth.call(this);
        }
        else if (action === "🏹 VẠN TIỄN (Mũi tên hướng phải)") {
            shootArrows.call(this);
        }
        else if (action === "⚓ TÀU CHIẾN (Mũi tên hướng xuống)") {
            shootAnchor.call(this);
        }
        else if (action === "🎎 HÌNH NHÂN THẾ MẠNG") {
            activateDoll.call(this);
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
// HỆ THỐNG KỸ NĂNG HÌNH NHÂN THẾ MẠNG
// ==========================================
function activateDoll() {
    isDoll = true;
    
    // 1. Ẩn pháp sư đi để tránh lỗi văng vật lý
    player.setVisible(false);

    // 2. Tạo một hình ảnh con rối giả đè đúng vào tọa độ của Pháp sư
    let dollImg = this.add.image(player.x, player.y, 'doll');
    
    // Căn chỉnh tỷ lệ cho doll cao khoảng 250px
    let scaleRatio = 250 / dollImg.height;
    dollImg.setScale(scaleRatio);
    dollImg.setDepth(player.y);

    console.log("🎎 ĐÃ HÓA HÌNH NHÂN! BẤT TỬ VÀ BẤT ĐỘNG TRONG 4 GIÂY!");

    // Cài đặt đồng hồ 4 giây
    this.time.delayedCall(4000, () => {
        
        // 3. Rung lắc màn hình cực mạnh
        this.cameras.main.shake(600, 0.02);

        // 4. VẼ HIỆU ỨNG NỔ BẰNG CODE (Sóng xung kích màu vàng cam)
        let blastRadius = 350;
        let shockwave = this.add.graphics();
        shockwave.setDepth(3000);

        // Vòng tròn to dần ra và mờ đi nhanh chóng (trong 0.3 giây)
        this.tweens.addCounter({
            from: 20,          
            to: blastRadius,   
            duration: 300,     
            onUpdate: (tween) => {
                shockwave.clear();
                // Nét vẽ dày 15px, màu vàng cam, độ mờ giảm dần
                shockwave.lineStyle(15, 0xffaa00, 1 - tween.progress);
                shockwave.strokeCircle(player.x, player.y, tween.getValue());
            },
            onComplete: () => {
                shockwave.destroy(); 
            }
        });

        // 5. Quét sát thương lan, tiêu diệt quái xung quanh vụ nổ
        monsters.children.iterate((m) => {
            if (m && m.active) {
                if (Math.abs(m.x - player.x) < blastRadius && Math.abs(m.y - player.y) < 200) {
                    m.destroy(); 
                }
            }
        });

        // 6. Trở lại thành pháp sư bình thường
        dollImg.destroy();       // Xóa búp bê đi
        player.setVisible(true); // Tắt tàng hình, hiện lại Pháp sư
        isDoll = false;
        
        console.log("💥 BÙM! HÌNH NHÂN ĐÃ NỔ TUNG VÀ TRỞ LẠI BÌNH THƯỜNG!");
    });
}

// ==========================================
// HỆ THỐNG KỸ NĂNG TÀU CHIẾN (CÀN QUÉT)
// ==========================================
function shootAnchor() {
    // Rung lắc nhẹ khi tàu xuất kích
    this.cameras.main.shake(1000, 0.005);

    // Xuất phát từ bên trái ngoài màn hình
    let startX = -400;
    // Cho tàu chạy ngang qua độ sâu của Pháp sư đang đứng
    let startY = player.y - 150; 
    
    let anchor = this.add.image(startX, startY, 'anchor');
    // Nếu bạn muốn tàu phát sáng thì có thể bật BlendMode, nếu muốn rõ nét thì bỏ dòng này đi
    anchor.setBlendMode(Phaser.BlendModes.ADD); 
    
    let targetHeight = window.innerHeight;
    let scaleRatio = targetHeight / anchor.height;
    anchor.setScale(scaleRatio); 

    anchor.setDepth(startY + 200); 
    
    this.tweens.add({
        targets: anchor,
        x: window.innerWidth + 400, // Chạy tít ra ngoài màn hình bên phải rồi mới biến mất
        duration: 3000, 
        ease: 'Linear',
        onUpdate: (tween, target) => {
            
            let hitRadius = target.displayWidth / 2; 

            monsters.children.iterate((m) => {
                if (m && m.active) {
                    // Nếu quái nằm trong tầm thân tàu quét qua
                    if (Math.abs(m.x - target.x) < hitRadius && Math.abs(m.y - player.y) < 200) {
                        m.destroy(); 
                    }
                }
            });
        },
        onComplete: (tween, targets) => {
            if (targets[0]) targets[0].destroy(); 
        }
    });
    
    console.log("⚓ TÀU CHIẾN ĐÃ XUẤT KÍCH VÀ CÀN QUÉT BẢN ĐỒ!");
}

// ==========================================
// HỆ THỐNG KỸ NĂNG VẠN TIỄN (ARROWS)
// ==========================================
function shootArrows() {
    // Rung lắc màn hình nhẹ trong suốt 2 giây để tạo cảm giác uy lực
    this.cameras.main.shake(2000, 0.003);

    // Tạo một Event lặp lại mỗi 100ms, lặp 19 lần (tổng 20 lần = 2000ms = 2 giây)
    let arrowTimer = this.time.addEvent({
        delay: 100, 
        repeat: 19,
        callback: () => {
            // Mỗi nhịp rớt xuống ngẫu nhiên từ 3 đến 5 mũi tên
            let numArrows = Phaser.Math.Between(3, 5);
            
            for (let i = 0; i < numArrows; i++) {
                // Xuất hiện ngẫu nhiên rải rác theo chiều ngang màn hình
                let startX = Phaser.Math.Between(50, window.innerWidth - 50);
                let startY = -100; // Trên nóc màn hình
                
                let arrow = projectiles.create(startX, startY, 'arrows');
                arrow.setBlendMode(Phaser.BlendModes.ADD); // Làm mũi tên phát sáng ma thuật
                
                // Mũi tên to nhỏ ngẫu nhiên một chút cho tự nhiên
                arrow.setScale(Phaser.Math.FloatBetween(0.08, 0.15)); 
                
                let destY = window.innerHeight + 100; // Rơi cắm xuống đáy màn hình

                this.tweens.add({
                    targets: arrow,
                    y: destY,
                    // Tốc độ rơi xé gió (ngẫu nhiên từ 0.6s đến 0.9s)
                    duration: Phaser.Math.Between(600, 900), 
                    ease: 'Linear',
                    onUpdate: (tween, target) => {
                        if (target && target.active && target.body) {
                            target.body.setSize(target.width, target.height, true);
                            target.setDepth(target.y);
                        }
                    },
                    onComplete: (tween, targets) => {
                        if (targets[0] && targets[0].active) {
                            targets[0].destroy(); // Rơi xuống đáy thì biến mất
                        }
                    }
                });
            }
        },
        callbackScope: this
    });

    console.log("🏹 VẠN TIỄN ĐÃ KÍCH HOẠT TRONG 2 GIÂY!");
}

// ==========================================
// HỆ THỐNG KỸ NĂNG THỔ ĐỘN
// ==========================================
function activateEarth() {
    let earthBlocks = [];
    let keys = ['earth1', 'earth2', 'earth3'];
    
    let blockWidth = (window.innerWidth / 3) + 200; 
    let blockHeight = window.innerHeight; 

    for (let i = 0; i < 3; i++) {
        let xPos = (window.innerWidth / 3) * i + (window.innerWidth / 6);

        let e = this.add.image(xPos, window.innerHeight, keys[i]);
        
        e.setOrigin(0.5, 0); 
        e.setDisplaySize(blockWidth, blockHeight); 
        e.setDepth(player.y + 200); 
        
        earthBlocks.push(e);
    }

    this.cameras.main.shake(5000, 0.005);

    this.tweens.add({
        targets: earthBlocks,
        y: 150, 
        duration: 3000,   
        ease: 'Linear',   
        onUpdate: (tween) => {
            let currentEarthY = earthBlocks[0].y;
            
            monsters.children.iterate((m) => {
                if (m && m.active) {
                    // [FIX SÁT THƯƠNG]: Bất kỳ quái nào lọt xuống DƯỚI đỉnh núi đều chết.
                    // Trừ hao 50px để quái vừa chạm mép ngọn núi là bốc hơi.
                    if (m.y >= currentEarthY - 50) {
                        m.destroy(); 
                    }
                }
            });
        },
        onComplete: (tween, targets) => {
            this.time.delayedCall(500, () => {
                this.tweens.add({
                    targets: targets,
                    y: window.innerHeight + 100, 
                    alpha: 0,          
                    duration: 1000,
                    onComplete: (tw, tgs) => {
                        tgs.forEach(t => { if(t) t.destroy(); });
                    }
                });
            });
        }
    });

    console.log("⛰️ THỔ ĐỘN TOÀN BẢN ĐỒ ĐÃ KÍCH HOẠT!");
}

// ==========================================
// HỆ THỐNG KỸ NĂNG HỒI MÁU
// ==========================================
function activateHeal() {
    if (playerHealth >= 100) {
        console.log("💚 Máu đang đầy, không thể hồi thêm!");
        return; // Đầy máu thì không hồi
    }

    let oldHealth = playerHealth;
    playerHealth += 50; // Hồi 50 HP
    if (playerHealth > 100) playerHealth = 100; // Không vượt quá 100 HP

    // Hiệu ứng thanh máu tăng lên từ từ
    this.tweens.addCounter({
        from: oldHealth,
        to: playerHealth,
        duration: 500, // Thanh máu chạy trong 0.5s
        onUpdate: (tween) => {
            updateHealthBarWidth(tween.getValue());
        }
    });

    // Pháp sư nháy sáng màu xanh lá
    player.setTint(0x00ff00);
    setTimeout(() => { player.clearTint(); }, 300);

    // Hoạt ảnh trái tim bay lên
    let healIcon = this.add.image(player.x, player.y - 100, 'heal');
    healIcon.setScale(0.05); // Khởi đầu nhỏ xíu
    healIcon.setDepth(2000);

    this.tweens.add({
        targets: healIcon,
        y: player.y - 250, // Bay bổng lên trên
        scale: 0.25,       // Phình to ra
        alpha: 0,          // Mờ dần thành trong suốt
        duration: 2000,    // Kéo dài đúng 2 giây
        ease: 'Power1',
        onComplete: function(tween, targets) {
            if (targets[0]) targets[0].destroy();
        }
    });

    console.log("💚 ĐÃ HỒI 50 MÁU!");
}

// ==========================================
// HỆ THỐNG KỸ NĂNG LÁ CHẮN
// ==========================================
function activateShield() {
    // Nếu đang có khiên cũ thì xóa đi để reset lại 3 khiên mới
    if (activeShields > 0) {
        removeShields();
    }
    
    activeShields = 3;

    // Tạo 3 hình ảnh khiên
    for (let i = 0; i < 3; i++) {
        let shield = this.add.image(player.x, player.y, 'shield');
        shield.setBlendMode(Phaser.BlendModes.ADD); // Làm khiên phát sáng
        shield.setScale(0.4); // Kích thước khiên (có thể chỉnh lại cho vừa)
        
        // Tính toán góc độ để 3 khiên nằm đều nhau (mỗi cái cách nhau 120 độ)
        shield.angleOffset = (i * (Math.PI * 2)) / 3; 
        shieldSprites.push(shield);
    }

    // Đặt đồng hồ đếm ngược 5 giây (5000ms)
    if (shieldTimer) shieldTimer.remove();
    shieldTimer = this.time.delayedCall(5000, () => {
        removeShields();
    });

    console.log("🛡️ ĐÃ KÍCH HOẠT 3 LỚP LÁ CHẮN!");
}

function removeShields() {
    activeShields = 0;
    shieldSprites.forEach(s => {
        if (s) s.destroy();
    });
    shieldSprites = [];
    console.log("Hết thời gian hiệu lực Lá chắn!");
}

// ==========================================
// HÀM TRIỆU HỒI SẤM SÉT
// ==========================================
function shootLightning() {
    const numBolts = 4; 

    let activeMonsters = [];
    monsters.children.iterate(function(monster) {
        if (monster && monster.active) activeMonsters.push(monster);
    });

    Phaser.Utils.Array.Shuffle(activeMonsters);
    this.cameras.main.shake(250, 0.015);

    for (let i = 0; i < numBolts; i++) {
        let destX, destY, destScale;

        if (activeMonsters.length > 0) {
            let targetMonster = activeMonsters.pop();
            destX = targetMonster.x;
            destY = targetMonster.y;
            destScale = Math.max(0.6, targetMonster.scale * 2.5); 
        } else {
            destX = Phaser.Math.Between(50, window.innerWidth - 50);
            destY = window.innerHeight - Phaser.Math.Between(50, 150);
            destScale = 1; 
        }

        let randomLightning = 'lightning' + Phaser.Math.Between(1, 4);
        let lightning = this.add.image(destX, destY, randomLightning);
        lightning.setOrigin(0.5, 1); 
        lightning.setBlendMode(Phaser.BlendModes.ADD); 
        lightning.setDepth(destY + 200); 
        lightning.setScale(destScale); 

        // --- TẠO VÙNG SÁT THƯƠNG LIÊN TỤC (AOE) ---
        // Hàm này sẽ kiểm tra xem có quái nào nằm trong bán kính sét đánh không
        const checkDamage = () => {
            monsters.children.iterate(function(m) {
                if (m && m.active) {
                    if (Math.abs(m.x - destX) < 250 && Math.abs(m.y - destY) < 150) {
                        m.destroy(); 
                    }
                }
            });
        };

        // Giật chết ngay lập tức những con quái đang đứng đó lúc sét mới giáng xuống
        checkDamage();

        // [MỚI]: Thiết lập Máy quét sát thương, chạy lặp lại mỗi 50ms (giống bị điện giật)
        let damageTimer = this.time.addEvent({
            delay: 50, 
            callback: checkDamage,
            callbackScope: this,
            loop: true
        });

        // [MỚI]: Cài đặt đồng hồ đếm ngược đúng 2 giây (2000ms)
        this.time.delayedCall(2000, () => {
            damageTimer.remove(); // Hết 2 giây -> Tắt máy quét sát thương
            
            // Bắt đầu làm mờ ảnh tia sét trong 0.4s rồi xóa hẳn
            this.tweens.add({
                targets: lightning,
                alpha: 0, 
                duration: 400, 
                ease: 'Power2',
                onComplete: function(tween, targets) {
                    if (targets[0]) targets[0].destroy(); 
                }
            });
        });
    }
    console.log("⚡ SẤM SÉT LƯU ĐIỆN 2 GIÂY ĐÃ GIÁNG XUỐNG!");
}

// ==========================================
// HÀM TRIỆU HỒI PHI KIẾM
// ==========================================
function shootSwords() {
    const numSwords = 5; // Số lượng kiếm rơi xuống 1 lần

    // Lọc ra các quái vật hiện đang sống trên bản đồ để làm mục tiêu
    let activeMonsters = [];
    monsters.children.iterate(function(monster) {
        if (monster && monster.active) activeMonsters.push(monster);
    });

    // [CẢI TIẾN]: Xáo trộn ngẫu nhiên danh sách quái vật (như tráo bài)
    Phaser.Utils.Array.Shuffle(activeMonsters);

    for (let i = 0; i < numSwords; i++) {
        // Điểm xuất phát: Nằm rải rác ở mép trên cùng của màn hình
        let startX = Phaser.Math.Between(50, window.innerWidth - 50);
        let startY = -100; 

        let sword = projectiles.create(startX, startY, 'sword');
        sword.setBlendMode(Phaser.BlendModes.ADD);
        sword.setScale(0.08); 

        // Đích đến mặc định: Rơi thẳng xuống đất
        let destX = startX;
        let destY = window.innerHeight - 50;
        let swordMaxHeight = 250;
        let destScale = swordMaxHeight / sword.height; 

        let targetMonster = null;
        
        // [CẢI TIẾN LỘI]: Lấy 1 con quái ra khỏi danh sách để gán cho kiếm.
        // Dùng .pop() để lấy xong là xóa quái đó khỏi mảng luôn, kiếm khác không tranh được nữa.
        // Nếu trên bản đồ có ít hơn 5 con quái, mảng sẽ bị rỗng -> kiếm rơi thẳng.
        if (activeMonsters.length > 0) {
            targetMonster = activeMonsters.pop(); 
            destX = targetMonster.x;
            destY = targetMonster.y;
            destScale = Math.max(destScale, targetMonster.scale * 1.5); 
        }

        // Tạo vật lý rơi cho từng thanh kiếm
        this.tweens.add({
            targets: sword,
            x: destX,
            y: destY,
            scale: destScale, 
            duration: 750, 
            delay: i * 150, 
            ease: 'Cubic.easeIn', 
            onUpdate: function (tween, target) {
                if (target && target.active && target.body) {
                    target.body.setSize(target.width, target.height, true);
                    target.setDepth(target.y); 
                    
                    // Kiếm tự động lượn nhẹ theo mục tiêu đã khóa
                    if (targetMonster && targetMonster.active) {
                        target.x += (targetMonster.x - target.x) * 0.08;
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

    // NẾU ĐANG CÓ KHIÊN -> CHẶN ĐÒN VÀ KHÔNG MẤT MÁU
    if (activeShields > 0) {
        monster.destroy(); // Quái đâm vào khiên cũng bị dội chết
        activeShields--;   // Trừ đi 1 lượt đỡ đòn
        
        // Phá vỡ 1 hình ảnh khiên
        if (shieldSprites.length > 0) {
            let s = shieldSprites.pop();
            s.destroy(); 
        }

        // Nháy nhân vật sang màu xanh lam nhạt để báo hiệu chặn thành công
        player.setTint(0x00ffff);
        setTimeout(() => { player.clearTint(); }, 200);

        // Nếu vỡ hết 3 lớp thì dọn dẹp
        if (activeShields === 0) {
            removeShields();
        }
        
        return; // Thoát hàm ngay, không trừ máu
    }

    // NẾU HẾT KHIÊN HOẶC KHÔNG CÓ KHIÊN -> TRỪ MÁU BÌNH THƯỜNG
    monster.destroy(); 
    player.setTint(0xff0000);
    setTimeout(() => { player.clearTint(); }, 300);
    
    let oldHealth = playerHealth;
    playerHealth -= 20;
    
    this.tweens.addCounter({
        from: oldHealth,
        to: playerHealth,
        duration: 400, 
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
    // [FIX LỖI]: So sánh trục Y (Độ sâu 3D) thay vì Scale. 
    // Sai số 150 pixel (chênh lệch trên dưới) giúp chiêu thức cực kỳ dễ trúng.
    if (Math.abs(projectile.y - monster.y) < 150) {
        
        let blastX = projectile.x;
        let blastY = projectile.y; // Lấy tọa độ Y của vụ nổ
        
        projectile.destroy(); // Đạn nổ
        monster.destroy();    // [QUAN TRỌNG] Chắc chắn tiêu diệt con quái bị đâm trúng
        
        // SÁT THƯƠNG LAN (AoE)
        // Quét qua toàn bộ quái vật, con nào đứng gần tâm vụ nổ sẽ chết chùm
        monsters.children.iterate(function(m) {
            if (m && m.active) {
                // Kiểm tra xem quái có nằm trong vùng nổ (Ngang 350px, Dọc 150px) không
                if (Math.abs(m.x - blastX) < 350 && Math.abs(m.y - blastY) < 150) {
                    m.destroy(); 
                }
            }
        });
        
        console.log("🔥 ĐẠN NỔ TRÚNG MỤC TIÊU!");
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

function update(time, delta) { 
    // Nếu có khiên, bắt chúng xoay tròn liên tục quanh người chơi
    if (activeShields > 0) {
        let radius = 120; // Khoảng cách từ khiên tới nhân vật
        let rotationSpeed = 0.004; // Tốc độ xoay
        
        shieldSprites.forEach((shield) => {
            if (shield && shield.active) {
                // Tăng dần góc xoay
                shield.angleOffset += rotationSpeed * delta; 
                
                // Toán học lượng giác: Tính tọa độ X, Y xoay quanh tâm (Player)
                shield.x = player.x + Math.cos(shield.angleOffset) * radius;
                shield.y = player.y + Math.sin(shield.angleOffset) * radius;
                
                // Luôn giữ khiên nổi lên trên
                shield.setDepth(player.y + 10); 
            }
        });
    }
}