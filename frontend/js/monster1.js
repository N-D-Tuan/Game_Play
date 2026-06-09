// file: js/monster1.js
import { BaseMonster } from './monster.js'; // Gọi Class Cha vào

// Hàm tạo hoạt ảnh cho riêng Ngưu Ma Vương
export function createMonster1Animations(scene) {
    const dirs = ['right', 'left', 'down', 'up'];
    for (let i = 0; i < 4; i++) {
        scene.anims.create({
            key: `mon-move-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: i * 4, end: i * 4 + 3 }),
            frameRate: 8, repeat: -1
        });
        scene.anims.create({
            key: `mon-attack-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: 16 + i * 4, end: 16 + i * 4 + 3 }),
            frameRate: 5, repeat: 0
        });
        scene.anims.create({
            key: `mon-dead-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: 32 + i * 4, end: 32 + i * 4 + 3 }),
            frameRate: 6, repeat: 0
        });
    }
}

// Lớp Monster1 kế thừa BaseMonster
export class Monster1 extends BaseMonster {
    constructor(scene, x, y) {
        // Gọi lên BaseMonster, truyền hình ảnh 'monster1' vào
        super(scene, x, y, 'monster1');
        
        // Bạn có thể ghi đè các chỉ số ở đây nếu muốn
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 5;
        this.speed = 100;
    }

    // Code AI rượt đuổi và chém của Ngưu Ma Vương
    updateAI(player) {
        if (this.isDead) return;

        let barX = this.x - 20;
        let barY = this.y - 65;
        this.hpBarBg.x = barX; this.hpBarBg.y = barY;
        this.hpBarFill.x = barX; this.hpBarFill.y = barY;

        if (this.isParalyzed) {
            if (this.paralyzeEffect) {
                this.paralyzeEffect.x = this.x; this.paralyzeEffect.y = this.y;
                this.paralyzeEffect.setDepth(this.y + 1);
            }
            return; 
        }

        if (this.isAttacking) return;

        let target = player; 
        if (this.scene.activeDoll && this.scene.activeDoll.active) {
            target = this.scene.activeDoll; 
        }

        let dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';

        if (dist <= 90) {
            this.setVelocity(0, 0);
            
            if (this.scene.time.now - this.lastAttackTime > 3000) {
                this.isAttacking = true;
                this.anims.play(`mon-attack-${dir}`, true);
                
                this.scene.time.delayedCall(500, () => {
                    if (target === player) {
                        if (!this.scene.isGameOver && !this.isDead && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 100) {
                            this.scene.takeDamage(this.damage); 
                        }
                    }
                });

                this.scene.time.delayedCall(500, () => {
                    this.isAttacking = false;
                    this.lastAttackTime = this.scene.time.now;
                });
            }
        } else {
            let currentSpeed = this.speed * this.speedMultiplier;
            this.scene.physics.moveToObject(this, target, currentSpeed);
            this.anims.play(`mon-move-${dir}`, true);
        }
        
        this.setDepth(this.y);
    }

    // Ghi đè hiệu ứng chết đặc trưng của Ngưu Ma Vương
    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();

        if (this.paralyzeEffect) this.paralyzeEffect.destroy();

        let currentAnim = this.anims.currentAnim ? this.anims.currentAnim.key : 'mon-move-down';
        let dir = currentAnim.split('-').pop(); 
        
        this.anims.play(`mon-dead-${dir}`, true);

        this.scene.time.delayedCall(500, () => {
            this.body.enable = false; 
        });
    }
}