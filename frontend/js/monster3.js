// file: js/monster3.js
import { BaseMonster } from './monster.js';

// ==========================================
// TẠO HOẠT ẢNH CHO RỒNG LỬA (128x96)
// ==========================================
export function createMonster3Animations(scene) {
    scene.anims.create({ key: 'mon3-move-down', frames: scene.anims.generateFrameNumbers('monster3', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'mon3-move-left', frames: scene.anims.generateFrameNumbers('monster3', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'mon3-move-right', frames: scene.anims.generateFrameNumbers('monster3', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'mon3-move-up', frames: scene.anims.generateFrameNumbers('monster3', { start: 12, end: 15 }), frameRate: 6, repeat: -1 });
}

export class Monster3 extends BaseMonster {
    constructor(scene, x, y) {
        super(scene, x, y, 'monster3');
        
        // ==========================================
        // CÁC THÔNG SỐ ĐỂ CHỈNH SỬA
        // ==========================================
        this.setScale(5); // Kích thước của Rồng
        
        // Hitbox: Cắt gọt lại cho vừa với thân hình
        this.body.setSize(60, 50); 
        this.body.setOffset(34, 30);
        
        this.maxHp = 400;   // Máu tối đa
        this.hp = 400;      // Máu hiện tại
        this.damage = 30;   // Sát thương của quả cầu lửa
        this.speed = 140;    // Tốc độ di chuyển
        
        this.attackRange = 300; // Tầm khạc lửa (Khoảng cách bắt đầu tấn công)
        // ==========================================
    }

    updateAI(player) {
        if (this.isDead) return;

        this.hpBarBg.x = this.x - 20; this.hpBarBg.y = this.y - 75;
        this.hpBarFill.x = this.x - 20; this.hpBarFill.y = this.y - 75;

        if (this.isParalyzed) {
            if (this.paralyzeEffect) {
                this.paralyzeEffect.x = this.x; this.paralyzeEffect.y = this.y;
                this.paralyzeEffect.setDepth(this.y + 1);
            }
            return; 
        }

        if (this.isAttacking) return; 

        // Ưu tiên mục tiêu là hình nhân nếu có
        let target = player; 
        if (this.scene.activeDoll && this.scene.activeDoll.active) target = this.scene.activeDoll; 

        let dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';

        // ==========================================
        // TẤN CÔNG TỪ XA: PHUN QUẢ CẦU LỬA
        // ==========================================
        if (dist <= this.attackRange) {
            this.setVelocity(0, 0); // Đứng lại để rặn chiêu
            this.anims.play(`mon3-move-${dir}`, true); // Quay mặt về phía mục tiêu
            
            // Hồi chiêu khạc lửa: 3.5 giây (3500ms)
            if (this.scene.time.now - this.lastAttackTime > 3500) {
                this.isAttacking = true;
                this.lastAttackTime = this.scene.time.now;
                
                // Khạc lửa sau khi dừng lại 0.3s (tạo cảm giác lấy hơi)
                this.scene.time.delayedCall(300, () => {
                    if (this.isDead) return;

                    let angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                    
                    // Điểm rơi của quả cầu lửa (Bắn thẳng vào vị trí mục tiêu đang đứng)
                    let tx = target.x;
                    let ty = target.y;

                    // Tạo hình ảnh quả cầu lửa
                    let fireball = this.scene.add.image(this.x, this.y, 'dragon_breath');
                    fireball.setScale(0.3); // Bạn có thể chỉnh độ to của quả cầu ở đây
                    fireball.setRotation(angle + Math.PI / 2); // Xoay đầu lửa
                    fireball.setDepth(this.y + 100);

                    // Bay tới mục tiêu trong 0.5s
                    this.scene.tweens.add({
                        targets: fireball, x: tx, y: ty, duration: 500, ease: 'Linear',
                        // Truyền biến 'tween' vào hàm onUpdate
                        onUpdate: (tween) => { 
                            // Nếu player chạm vào đạn khi nó đang bay -> Nổ sớm
                            if (fireball.active && Phaser.Math.Distance.Between(fireball.x, fireball.y, player.x, player.y) < 40) {
                                fireball.active = false; 
                                
                                tween.stop(); // Phải DỪNG tween lại một cách an toàn trước...
                                
                                this.triggerExplosion(fireball.x, fireball.y, player);
                                fireball.destroy(); // ...rồi mới được phép XÓA đạn.
                            }
                        },
                        onComplete: () => {
                            if (fireball.active) {
                                this.triggerExplosion(tx, ty, player);
                                fireball.destroy();
                            }
                        }
                    });
                });

                // Kết thúc trạng thái tấn công sau 1 giây
                this.scene.time.delayedCall(1000, () => { this.isAttacking = false; });
            }
        } else {
            // XA -> CHẠY VỀ PHÍA MỤC TIÊU
            let currentSpeed = this.speed * this.speedMultiplier;
            this.scene.physics.moveToObject(this, target, currentSpeed);
            this.anims.play(`mon3-move-${dir}`, true);
        }
        
        this.setDepth(this.y);
    }

    // ==========================================
    // XỬ LÝ VẾT CHÁY VÀ SÁT THƯƠNG DIỆN RỘNG (AOE)
    // ==========================================
    triggerExplosion(ex, ey, player) {
        // 1. Tạo vết cháy đen trên mặt đất (Tồn tại 5s)
        let scorch = this.scene.add.graphics();
        scorch.fillStyle(0x1a1a1a, 0.85); // Màu đen nhám
        scorch.fillEllipse(ex, ey, 120, 70); // Hình elip bẹp bẹp dưới đất
        scorch.setDepth(-1); // Luôn nằm dưới rồng và các nhân vật

        // Vết cháy mờ dần sau 5 giây (5000ms)
        this.scene.tweens.add({
            targets: scorch, alpha: 0, delay: 5000, duration: 1000, 
            onComplete: () => scorch.destroy()
        });

        // 2. Gây sát thương (Hitbox rộng hình tròn bán kính 100px)
        if (Phaser.Math.Distance.Between(ex, ey, player.x, player.y) <= 100) {
            this.scene.takeDamage(this.damage);
        }
    }

    // ==========================================
    // HIỆU ỨNG CHẾT: CHÁY THÀNH THAN, BẸP XUỐNG ĐẤT
    // ==========================================
    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.body.enable = false; 
        
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();
        if (this.paralyzeEffect) this.paralyzeEffect.destroy();

        this.anims.stop(); 
        
        // Bước 1: Chớp nháy màu trắng (Giật điện / Đau đớn)
        this.setTintFill(0xffffff);

        // Bước 2: Chuyển sang màu đen sì sừng sững (Thành than), xẹp xuống và mờ đi
        this.scene.time.delayedCall(150, () => {
            this.clearTint();
            this.setTint(0x111111); // Nhuộm đen toàn bộ
            this.setDepth(this.y - 10); // Đưa xuống thành lớp xác dưới đất

            this.scene.tweens.add({
                targets: this,
                scaleY: 0.2,   // Bẹp dúm xuống theo chiều dọc
                alpha: 0,      // Mờ dần
                duration: 2000, // Quá trình mất 2 giây
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.destroy(); // Xóa sổ
                }
            });
        });
    }
}