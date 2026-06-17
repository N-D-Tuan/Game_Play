// file: js/pet.js

// ==========================================
// 1. HIỆU ỨNG ĐẬP TRỨNG (GACHA ANIMATION)
// ==========================================
export function playEggHatchAnimation(scene, petName, petImageKey, onComplete) {
    // Tạo màn che đen làm tối toàn bộ game
    let overlay = scene.add.graphics().fillStyle(0x000000, 1).fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height).setDepth(50000).setScrollFactor(0);
    
    let cx = scene.cameras.main.width / 2;
    let cy = scene.cameras.main.height / 2;

    // Load ảnh quả trứng (ban đầu scale = 0 để làm hiệu ứng phóng to)
    let egg = scene.add.image(cx, cy, 'egg').setScale(0).setDepth(50001).setScrollFactor(0);

    // Bước 1: Trứng bay ra giữa màn hình và phóng to
    scene.tweens.add({
        targets: egg, scale: 2.0, duration: 800, ease: 'Back.easeOut',
        onComplete: () => {
            
            // Bước 2: Rung lắc và xuất hiện vết nứt
            let shakeCount = 0;
            let cracks = [];
            
            let shakeTimer = scene.time.addEvent({
                delay: 600, repeat: 4,
                callback: () => {
                    shakeCount++;
                    
                    // Rung lắc quả trứng
                    scene.tweens.add({ targets: egg, angle: {from: -15, to: 15}, duration: 50, yoyo: true, repeat: 3 });
                    scene.cameras.main.shake(100, 0.005); // Camera giật nhẹ

                    // Thêm 1 vết nứt ngẫu nhiên đè lên trứng
                    let crack = scene.add.image(cx + Phaser.Math.Between(-25, 25), cy + Phaser.Math.Between(-30, 30), 'crack').setDepth(50002).setScrollFactor(0);
                    crack.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2)).setScale(Phaser.Math.FloatBetween(0.5, 1.2));
                    cracks.push(crack);

                    // Bước 3: NỔ TUNG (BOOM)
                    if (shakeCount === 5) {
                        scene.cameras.main.shake(800, 0.03); // Giật mạnh
                        
                        // Tia chớp trắng chói lóa từ tâm nổ
                        let flash = scene.add.circle(cx, cy, 20, 0xffffff).setDepth(50003).setScrollFactor(0);
                        scene.tweens.add({
                            targets: flash, scale: 50, alpha: 0, duration: 800,
                            onComplete: () => {
                                // Xóa rác
                                egg.destroy();
                                cracks.forEach(c => c.destroy());
                                
                                // Hiển thị Pet vừa nở
                                let newPet = scene.add.image(cx, cy, petImageKey).setScale(0).setDepth(50004).setScrollFactor(0);
                                
                                // Hào quang tỏa sáng phía sau lưng Pet
                                let glow = scene.add.graphics().setDepth(50001).setScrollFactor(0);
                                glow.fillStyle(0xffdd00, 0.5).fillCircle(cx, cy, 150);

                                // Tên Pet nổi lên
                                let nameTxt = scene.add.text(cx, cy + 150, `Nhận được\n${petName}`, { fontSize: '36px', fill: '#ffcc00', fontStyle: 'bold', align: 'center', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(50005).setScrollFactor(0);

                                scene.tweens.add({ targets: newPet, scale: 1.5, duration: 1000, ease: 'Elastic.easeOut' });

                                // Tạo hàm dọn dẹp chung để dùng cho cả 2 trường hợp (Hết giờ / Click chuột)
                                let isCleanedUp = false;

                                let cleanupGacha = () => {
                                    if (isCleanedUp) return;
                                    isCleanedUp = true;
                                    
                                    // Hủy lắng nghe sự kiện click để tránh lỗi bộ nhớ
                                    scene.input.off('pointerdown', cleanupGacha);

                                    overlay.destroy(); 
                                    flash.destroy(); 
                                    newPet.destroy(); 
                                    glow.destroy(); 
                                    nameTxt.destroy();
                                    
                                    if (onComplete) onComplete();
                                };

                                // 1. Lắng nghe sự kiện click chuột vào màn hình để tắt ngay lập tức
                                scene.input.on('pointerdown', cleanupGacha);

                                // 2. Tự động tắt sau 3.5 giây nếu người chơi không click
                                scene.time.delayedCall(3500, cleanupGacha);
                            }
                        });
                    }
                }
            });
        }
    });
}

// ==========================================
// 2. CLASS: THÚ CƯNG THEO ĐUÔI (HỖ TRỢ SPRITESHEET ĐỘNG)
// ==========================================
export class CompanionPet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey) {
        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1); // Điều chỉnh lại độ to nhỏ của Pet (có thể đổi thành 0.8, 1.2 tùy size ảnh)
        this.setDepth(y + 10);
        
        this.isIdle = false;
        this.idleTimer = null;
        this.textureKey = textureKey; // Lưu lại key để gọi animation sau này

        // KHỞI TẠO 4 HƯỚNG HOẠT ẢNH (Dựa trên cấu trúc 4 hàng x 4 cột của bạn)
        if (!scene.anims.exists(textureKey + '_down')) {
            // Hàng 1 (Frame 0 đến 3): Đi Xuống
            scene.anims.create({ key: textureKey + '_down', frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
            // Hàng 2 (Frame 4 đến 7): Đi Trái
            scene.anims.create({ key: textureKey + '_left', frames: scene.anims.generateFrameNumbers(textureKey, { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
            // Hàng 3 (Frame 8 đến 11): Đi Phải
            scene.anims.create({ key: textureKey + '_right', frames: scene.anims.generateFrameNumbers(textureKey, { start: 8, end: 11 }), frameRate: 8, repeat: -1 });
            // Hàng 4 (Frame 12 đến 15): Đi Lên
            scene.anims.create({ key: textureKey + '_up', frames: scene.anims.generateFrameNumbers(textureKey, { start: 12, end: 15 }), frameRate: 8, repeat: -1 });
        }

        this.play(textureKey + '_down', true); // Mặc định đứng quay mặt xuống
        this.stop(); // Dừng animation lại (chờ chạy mới play)
    }

    updateBehavior(player) {
        let scene = this.scene;
        if (!player || !player.active) return;

        let targetX = player.flipX ? player.x + 45 : player.x - 45;
        let targetY = player.y - 45;

        let baseSpeed = window.playerStats ? window.playerStats.speed : 200;
        let playerSpeed = baseSpeed * player.speedMultiplier;
        let petSpeed = playerSpeed * 1.1; 

        // Kiểm tra xem Chủ nhân đang chạy hay Pet đang phải lết theo
        let isMoving = (player.body.velocity.x !== 0 || player.body.velocity.y !== 0);
        let dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

        if (isMoving || dist >= 30) {
            // ĐANG DI CHUYỂN
            this.isIdle = false;
            if (this.idleTimer) { scene.time.removeEvent(this.idleTimer); this.idleTimer = null; }
            
            scene.tweens.killTweensOf(this); // Ngắt lộn nhào
            this.setRotation(0);

            // Bám theo mục tiêu
            scene.physics.moveTo(this, targetX, targetY, petSpeed);

            // TÍNH TOÁN HOẠT ẢNH DỰA VÀO VẬN TỐC CỦA CHÍNH CON PET
            let vx = this.body.velocity.x;
            let vy = this.body.velocity.y;

            if (Math.abs(vx) > Math.abs(vy)) {
                // Đi ngang nhiều hơn
                if (vx > 0) this.play(this.textureKey + '_right', true);
                else this.play(this.textureKey + '_left', true);
            } else {
                // Đi dọc nhiều hơn
                if (vy > 0) this.play(this.textureKey + '_down', true);
                else if (vy < 0) this.play(this.textureKey + '_up', true);
            }
        } else {
            // ĐÃ TỚI VAI CHỦ NHÂN -> ĐỨNG YÊN
            this.setVelocity(0, 0); 
            this.stop(); // Dừng animation đi bộ
            
            if (!this.isIdle) {
                this.isIdle = true;
                this.idleTimer = scene.time.delayedCall(1500, () => this.playAcrobatics());
            }
        }
        
        this.setDepth(this.y + 10);
    }

    playAcrobatics() {
        if (!this.isIdle) return;
        let scene = this.scene;
        let startX = this.x;
        let startY = this.y;
        let tValue = { v: 0 };
        
        // Vẫn giữ lại hoạt ảnh bay vòng số 8 giải trí
        scene.tweens.add({
            targets: tValue, v: Math.PI * 2, duration: 3000, ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.setPosition(startX + 40 * Math.sin(tValue.v), startY + 15 * Math.sin(tValue.v) * Math.cos(tValue.v));
            },
            onComplete: () => {
                if (!this.isIdle) return;
                scene.tweens.add({
                    targets: this, y: this.y - 60, angle: 360, duration: 600, yoyo: true, ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.setAngle(0);
                        if (this.isIdle) this.idleTimer = scene.time.delayedCall(1000, () => this.playAcrobatics());
                    }
                });
            }
        });
    }
}