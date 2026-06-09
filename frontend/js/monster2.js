// file: js/monster2.js
import { BaseMonster } from './monster.js';

// ==========================================
// TẠO HOẠT ẢNH CHO RỒNG (3 khung hình / 1 hướng)
// ==========================================
export function createMonster2Animations(scene) {
    // Hàng 0 (Down): frames 0 -> 2
    scene.anims.create({ key: 'mon2-move-down', frames: scene.anims.generateFrameNumbers('monster2', { start: 0, end: 2 }), frameRate: 6, repeat: -1 });
    // Hàng 1 (Left): frames 3 -> 5
    scene.anims.create({ key: 'mon2-move-left', frames: scene.anims.generateFrameNumbers('monster2', { start: 3, end: 5 }), frameRate: 6, repeat: -1 });
    // Hàng 2 (Right): frames 6 -> 8
    scene.anims.create({ key: 'mon2-move-right', frames: scene.anims.generateFrameNumbers('monster2', { start: 6, end: 8 }), frameRate: 6, repeat: -1 });
    // Hàng 3 (Up): frames 9 -> 11
    scene.anims.create({ key: 'mon2-move-up', frames: scene.anims.generateFrameNumbers('monster2', { start: 9, end: 11 }), frameRate: 6, repeat: -1 });
}

export class Monster2 extends BaseMonster {
    constructor(scene, x, y) {
        super(scene, x, y, 'monster2');
        
        // Bạn có thể tự chỉnh lại tỷ lệ to nhỏ ở đây
        this.setScale(3); 
        
        // Thu nhỏ hitbox lại cho vừa với thân hình con rồng
        this.body.setSize(60, 50); 
        this.body.setOffset(20, 10);
        
        // Các thông số cơ bản (Bạn tự tinh chỉnh lại sau)
        this.hp = 300;
        this.maxHp = 300;
        this.damage = 15;
        this.speed = 125;
    }

    updateAI(player) {
        if (this.isDead) return;

        // Vị trí thanh máu bám theo đầu rồng
        this.hpBarBg.x = this.x - 20; this.hpBarBg.y = this.y - 70;
        this.hpBarFill.x = this.x - 20; this.hpBarFill.y = this.y - 70;

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
        
        // Xác định hướng để bật hoạt ảnh
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';

        if (dist <= 110) {
            // ==========================================
            // TẦM GẦN -> DÙNG CODE ĐỂ TẠO HIỆU ỨNG TẤN CÔNG (LUNGE)
            // ==========================================
            this.setVelocity(0, 0);
            this.anims.stop(); // Dừng vỗ cánh đi bộ
            
            if (this.scene.time.now - this.lastAttackTime > 3000) {
                this.isAttacking = true;
                
                // Tính toán góc và vị trí để lao tới
                let angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                let pullBackX = this.x - Math.cos(angle) * 15; // Lùi đà 15px
                let pullBackY = this.y - Math.sin(angle) * 15;
                let lungeX = this.x + Math.cos(angle) * 45;    // Phóng tới 45px
                let lungeY = this.y + Math.sin(angle) * 45;
                let originalX = this.x;
                let originalY = this.y;

                // Chuỗi Tween giả lập cú cắn
                this.scene.tweens.add({
                    targets: this, x: pullBackX, y: pullBackY, duration: 250, ease: 'Quad.easeOut', // 1. Lùi lấy đà
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this, x: lungeX, y: lungeY, duration: 150, ease: 'Expo.easeIn', // 2. Phóng vọt tới
                            onComplete: () => {
                                // 3. Trừ máu ngay khoảnh khắc cắn trúng
                                if (target === player && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 130) {
                                    this.scene.takeDamage(this.damage); 
                                }
                                
                                // 4. Giật lùi về vị trí cũ
                                this.scene.tweens.add({
                                    targets: this, x: originalX, y: originalY, duration: 250, ease: 'Quad.easeOut',
                                    onComplete: () => {
                                        this.isAttacking = false;
                                        this.lastAttackTime = this.scene.time.now;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        } else {
            // ==========================================
            // XA -> CHẠY VỀ PHÍA MỤC TIÊU
            // ==========================================
            let currentSpeed = this.speed * this.speedMultiplier;
            this.scene.physics.moveToObject(this, target, currentSpeed);
            this.anims.play(`mon2-move-${dir}`, true);
        }
        
        this.setDepth(this.y);
    }

    // ==========================================
    // DÙNG CODE ĐỂ TẠO HIỆU ỨNG CHẾT (BAY HƠI)
    // ==========================================
    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.body.enable = false; // Tắt va chạm
        
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();
        if (this.paralyzeEffect) this.paralyzeEffect.destroy();

        this.anims.stop(); 
        
        // Nhuộm đỏ xác rồng
        this.setTint(0xff0000);

        // Tween: Vừa mờ đi, vừa teo nhỏ, vừa trôi nhẹ lên trời như cát bụi
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            y: this.y - 40, 
            duration: 1200, // Bay hơi từ từ trong 1.2 giây
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.destroy(); // Xóa sổ hoàn toàn
            }
        });
    }
}