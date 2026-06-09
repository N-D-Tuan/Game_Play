// file: js/monster.js

export class BaseMonster extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // Thêm quái vật vào scene hiện tại
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(3);
        this.setCollideWorldBounds(true);
        
        // Thu hẹp Hitbox mặc định
        this.body.setSize(50, 40); 
        this.body.setOffset(47, 0);

        // Thuộc tính cơ bản (Sẽ được ghi đè ở Class Con)
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 5;
        this.speed = 100;

        // Khởi tạo hệ số nhân tốc độ
        this.speedMultiplier = 1; 
        this.lastAttackTime = 0;
        this.isAttacking = false;
        this.isDead = false;

        // Biến quản lý trạng thái Tê Liệt
        this.isParalyzed = false;
        this.paralyzeEffect = null;
        this.paralyzeTimer = null;

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

    applyParalysis(duration) {
        if (this.isDead) return;
        
        this.isParalyzed = true;
        this.anims.stop(); // Ngừng hoạt ảnh
        this.setVelocity(0, 0); // Khóa di chuyển

        // Tạo hiệu ứng sét
        if (!this.paralyzeEffect) {
            this.paralyzeEffect = this.scene.add.sprite(this.x, this.y, 'lightning2');
            this.paralyzeEffect.setScale(0.8);
            this.paralyzeEffect.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: this.paralyzeEffect, alpha: 0.3, yoyo: true, repeat: -1, duration: 100
            });
        }

        if (this.paralyzeTimer) this.paralyzeTimer.remove();
        this.paralyzeTimer = this.scene.time.delayedCall(duration, () => {
            this.isParalyzed = false;
            if (this.paralyzeEffect) {
                this.paralyzeEffect.destroy();
                this.paralyzeEffect = null;
            }
        });
    }

    die() {
        this.isDead = true;
        this.setVelocity(0, 0);
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();

        if (this.paralyzeEffect) this.paralyzeEffect.destroy();

        // Mặc định class cha sẽ dùng tween bay hơi (giống con rồng) để tránh lỗi nếu thiếu hình ảnh chết
        this.setTint(0xff0000);
        this.scene.tweens.add({
            targets: this, alpha: 0, scaleX: 0, scaleY: 0, y: this.y - 30, 
            duration: 1000, ease: 'Sine.easeOut',
            onComplete: () => this.destroy()
        });
    }

    // Class Cha chỉ cung cấp vỏ hàm updateAI, các Class Con sẽ tự viết ruột bên trong
    updateAI(player) {}
}