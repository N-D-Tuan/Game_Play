export function createMonsterAnimations(scene) {
    const dirs = ['right', 'left', 'down', 'up'];
    for (let i = 0; i < 4; i++) {
        // Đi bộ (Hàng 0, 1, 2, 3) -> frame 0 đến 15
        scene.anims.create({
            key: `mon-move-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: i * 4, end: i * 4 + 3 }),
            frameRate: 8, repeat: -1
        });
        // Tấn công (Hàng 4, 5, 6, 7) -> frame 16 đến 31
        scene.anims.create({
            key: `mon-attack-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: 16 + i * 4, end: 16 + i * 4 + 3 }),
            frameRate: 5, repeat: 0
        });
        // Bị tiêu diệt (Hàng 8, 9, 10, 11) -> frame 32 đến 47
        scene.anims.create({
            key: `mon-dead-${dirs[i]}`,
            frames: scene.anims.generateFrameNumbers('monster1', { start: 32 + i * 4, end: 32 + i * 4 + 3 }),
            frameRate: 6, repeat: 0
        });
    }
}

export class Monster extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // Thêm quái vật vào scene hiện tại
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(3);
        this.setCollideWorldBounds(true);
        
        // Thu hẹp Hitbox để quái va chạm chuẩn hơn
        this.body.setSize(50, 40); 
        this.body.setOffset(47, 0);

        // Thuộc tính cơ bản
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 5;
        this.speed = 100;
        this.lastAttackTime = 0;
        
        this.isAttacking = false;
        this.isDead = false;

        // Tạo thanh máu nhỏ trên đầu
        this.hpBarBg = scene.add.graphics().setDepth(9000);
        this.hpBarFill = scene.add.graphics().setDepth(9001);
        this.updateHpBar();
    }

    updateHpBar() {
        if (this.isDead) return;
        this.hpBarBg.clear();
        this.hpBarBg.fillStyle(0x000000, 0.8);
        this.hpBarBg.fillRect(0, 0, 40, 6);

        this.hpBarFill.clear();
        this.hpBarFill.fillStyle(0xff0000, 1);
        let hpWidth = (this.hp / this.maxHp) * 40;
        if (hpWidth < 0) hpWidth = 0;
        this.hpBarFill.fillRect(0, 0, hpWidth, 6);
    }

    updateAI(player) {
        if (this.isDead) return;

        // Vị trí thanh máu bám theo đầu quái
        let barX = this.x - 20;
        let barY = this.y - 30;
        this.hpBarBg.x = barX; this.hpBarBg.y = barY;
        this.hpBarFill.x = barX; this.hpBarFill.y = barY;

        if (this.isAttacking) return; // Đang chém thì không chạy

        // Tính toán khoảng cách
        let dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        
        // Phán đoán hướng quay mặt (Ưu tiên trục lớn hơn)
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? 'right' : 'left';
        } else {
            dir = dy > 0 ? 'down' : 'up';
        }

        // Quyết định hành động
        if (dist <= 90) {
            // TẦM GẦN -> ĐỨNG LẠI CHÉM
            this.setVelocity(0, 0);
            
            if (this.scene.time.now - this.lastAttackTime > 3000) {
                this.isAttacking = true;
                this.anims.play(`mon-attack-${dir}`, true);
                
                // Đợi 500ms cho rìu bổ xuống mới tính sát thương
                this.scene.time.delayedCall(500, () => {
                    if (!this.scene.isGameOver && !this.isDead && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 100) {
                        this.scene.takeDamage(this.damage); // Gọi hàm trừ máu Player
                    }
                });

                // Hồi thao tác sau đòn đánh
                this.scene.time.delayedCall(500, () => {
                    this.isAttacking = false;
                    this.lastAttackTime = this.scene.time.now;
                });
            }
        } else {
            // XA -> CHẠY VỀ PHÍA PLAYER
            this.scene.physics.moveToObject(this, player, this.speed);
            this.anims.play(`mon-move-${dir}`, true);
        }
        
        // Che khuất 3D
        this.setDepth(this.y);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        this.updateHpBar();
        
        // Hiệu ứng nhấp nháy đỏ
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => this.clearTint());

        // Hiện số máu bị trừ
        let dmgText = this.scene.add.text(this.x, this.y - 40, `-${amount}`, { fontSize: '24px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 3 }).setOrigin(0.5).setDepth(8000);
        this.scene.tweens.add({ targets: dmgText, y: this.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();

        // Tự động phát hoạt ảnh chết theo đúng hướng nó đang quay mặt
        let currentAnim = this.anims.currentAnim ? this.anims.currentAnim.key : 'mon-move-down';
        let dir = currentAnim.split('-').pop(); // Tách lấy chữ right/left/down/up
        
        this.anims.play(`mon-dead-${dir}`, true);

        // Vô hiệu hóa va chạm nhưng để xác nằm lại trên mặt đất
        this.scene.time.delayedCall(500, () => {
            this.body.enable = false; 
        });
    }
}