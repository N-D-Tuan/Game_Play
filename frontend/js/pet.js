// file: js/pet.js

// ==========================================
// 1. HIỆU ỨNG ĐẬP TRỨNG (GACHA ANIMATION)
// ==========================================
export function playEggHatchAnimation(scene, petName, petImageKey, onComplete) {
    // Tạo màn che đen làm tối toàn bộ game
    let overlay = scene.add.graphics().fillStyle(0x000000, 0.9).fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height).setDepth(50000).setScrollFactor(0);
    
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
                                scene.tweens.add({ targets: glow, scale: 1.2, alpha: 0.1, yoyo: true, repeat: -1, duration: 1000 });

                                // Tên Pet nổi lên
                                let nameTxt = scene.add.text(cx, cy + 150, `Nhận được\n${petName}`, { fontSize: '36px', fill: '#ffcc00', fontStyle: 'bold', align: 'center', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(50005).setScrollFactor(0);

                                scene.tweens.add({ targets: newPet, scale: 1.5, duration: 1000, ease: 'Elastic.easeOut' });

                                // Đợi 3.5 giây cho người chơi ngắm, rồi dọn dẹp và trả lại UI Balo
                                scene.time.delayedCall(3500, () => {
                                    overlay.destroy(); flash.destroy(); newPet.destroy(); glow.destroy(); nameTxt.destroy();
                                    if (onComplete) onComplete();
                                });
                            }
                        });
                    }
                }
            });
        }
    });
}

// ==========================================
// 2. CLASS: THÚ CƯNG THEO ĐUÔI
// ==========================================
export class CompanionPet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey) {
        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.8); // Độ to của Pet trên bản đồ
        this.setDepth(y + 10);
        
        this.isIdle = false;
        this.idleTimer = null;
    }

    updateBehavior(player) {
        let scene = this.scene;
        if (!player || !player.active) return;

        // Vị trí muốn Pet bay tới (Chếch lên trên vai người chơi)
        let targetX = player.flipX ? player.x + 45 : player.x - 45;
        let targetY = player.y - 45;

        // ==========================================
        // ĐỒNG BỘ TỐC ĐỘ VỚI NGƯỜI CHƠI
        // ==========================================
        let baseSpeed = window.playerStats ? window.playerStats.speed : 200;
        let playerSpeed = baseSpeed * player.speedMultiplier;
        
        // Cho Pet bay nhanh hơn người chơi đúng 10% để nó không bị tụt lại quá xa khi người chơi đổi hướng đột ngột
        let petSpeed = playerSpeed * 1.1; 

        // BẮT ĐẦU CHẠY
        if (player.body.velocity.x !== 0 || player.body.velocity.y !== 0) {
            this.isIdle = false;
            if (this.idleTimer) { scene.time.removeEvent(this.idleTimer); this.idleTimer = null; }
            
            scene.tweens.killTweensOf(this); // Ngắt lập tức hoạt ảnh lộn nhào
            this.setRotation(0);

            // Sử dụng tốc độ động vừa tính toán
            scene.physics.moveTo(this, targetX, targetY, petSpeed);

            // Lật mặt Pet theo hướng bay
            if (this.body.velocity.x > 0) this.setFlipX(false);
            else if (this.body.velocity.x < 0) this.setFlipX(true);
            
        } else {
            // ĐỨNG YÊN
            let dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
            if (dist < 30) {
                this.setVelocity(0, 0); // Đã tới vai -> Phanh lại
                if (!this.isIdle) {
                    this.isIdle = true;
                    // Nếu đứng im 1.5 giây thì bắt đầu lộn nhào giải trí
                    this.idleTimer = scene.time.delayedCall(1500, () => this.playAcrobatics());
                }
            } else {
                // Sử dụng tốc độ động để bám theo khi người chơi vừa dừng lại
                scene.physics.moveTo(this, targetX, targetY, petSpeed);
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
        
        // Tween vẽ đường bay hình số 8
        scene.tweens.add({
            targets: tValue,
            v: Math.PI * 2,
            duration: 3000,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.setPosition(startX + 40 * Math.sin(tValue.v), startY + 15 * Math.sin(tValue.v) * Math.cos(tValue.v));
            },
            onComplete: () => {
                if (!this.isIdle) return;
                // Bay vút lên lộn vòng 360 độ (Backflip)
                scene.tweens.add({
                    targets: this,
                    y: this.y - 60,
                    angle: 360,
                    duration: 600,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.setAngle(0);
                        // Cứ thế lặp lại mãi cho đến khi bị gọi đi
                        if (this.isIdle) this.idleTimer = scene.time.delayedCall(1000, () => this.playAcrobatics());
                    }
                });
            }
        });
    }
}