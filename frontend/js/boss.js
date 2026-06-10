// file: js/boss.js
import { BaseMonster } from './monster.js';

export function createBossAnimations(scene) {
    // Sử dụng generateFrameNames cho file JSON (Atlas)
    scene.anims.create({ key: 'boss-intro', frames: scene.anims.generateFrameNames('boss', { prefix: 'intro_', suffix: '.png', start: 1, end: 14, zeroPad: 2 }), frameRate: 8, repeat: 0 });
    scene.anims.create({ key: 'boss-idle', frames: scene.anims.generateFrameNames('boss', { prefix: 'idle_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'boss-walk', frames: scene.anims.generateFrameNames('boss', { prefix: 'walk_', suffix: '.png', start: 1, end: 4, zeroPad: 2 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'boss-dead', frames: scene.anims.generateFrameNames('boss', { prefix: 'dead_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 5, repeat: 0 });
}

export class Boss extends BaseMonster {
    constructor(scene, x, y) {
        // Tạm thời chưa truyền texture vì Boss bị ẩn lúc đầu
        super(scene, x, y, null); 
        this.setTexture('boss', 'intro_01.png');
        this.setVisible(false); // Ẩn Boss chờ Thiên thạch rơi
        this.setScale(2.5);

        this.body.setSize(40, 60);
        this.body.setOffset(20, 10);

        this.maxHp = 1000;
        this.hp = 1000;
        this.damage = 50;
        this.speed = 150;

        // Quản lý Trạng thái (State Machine)
        this.state = 'SPAWNING';
        this.hasHealed = false;

        // Vòng tròn Aggro (Khu vực đánh thức Boss)
        this.aggroRadius = 300;
        this.aggroZone = scene.add.graphics().setDepth(1);
        this.drawAggroZone();

        // Ẩn thanh máu nhỏ mặc định của BaseMonster
        if (this.hpBarBg) { this.hpBarBg.destroy(); this.hpBarBg = null; }
        if (this.hpBarFill) { this.hpBarFill.destroy(); this.hpBarFill = null; }
        
        // Tạo thanh máu to đùng cho Boss (Sẽ hiện sau đoạn Intro)
        this.createBossUI();

        // Bắt đầu chuỗi xuất hiện
        this.startSpawnSequence();
    }

    drawAggroZone() {
        this.aggroZone.clear();
        this.aggroZone.lineStyle(2, 0xff0000, 0.5);
        this.aggroZone.strokeCircle(this.x, this.y, this.aggroRadius);
        this.aggroZone.fillStyle(0xff0000, 0.1); // Màu đỏ mờ vùng đất
        this.aggroZone.fillCircle(this.x, this.y, this.aggroRadius);
    }

    createBossUI() {
        let cx = this.scene.cameras.main.width / 2;
        let cy = this.scene.cameras.main.height; // Lấy tọa độ đáy màn hình

        this.bossUiBg = this.scene.add.graphics().setScrollFactor(0).setDepth(20000).setVisible(false);
        this.bossUiFill = this.scene.add.graphics().setScrollFactor(0).setDepth(20001).setVisible(false);
        
        // Dời tên Boss xuống góc dưới (nằm ngay trên thanh máu Boss)
        this.bossNameText = this.scene.add.text(cx, cy - 170, '💀 KẺ THÁCH THỨC VĨ ĐẠI 💀', { 
            fontSize: '22px', fill: '#ff3333', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20002).setVisible(false);
        
        this.updateBossUI();
    }

    updateBossUI() {
        if (this.isDead) return;
        
        let cx = this.scene.cameras.main.width / 2;
        let cy = this.scene.cameras.main.height;
        let barW = 700, barH = 25; // Làm thanh máu to và dài hơn cho đúng chất Trùm
        let startX = cx - barW / 2;
        let startY = cy - 150; // Đặt cách đáy màn hình 120px (nằm vặn vặn trên dàn skill)

        // Vẽ viền màu đỏ thẫm và nền đen nhám
        this.bossUiBg.clear()
            .fillStyle(0x111111, 0.9) 
            .fillRect(startX, startY, barW, barH)
            .lineStyle(4, 0x550000, 1) 
            .strokeRect(startX - 2, startY - 2, barW + 4, barH + 4);
        
        // Vẽ lượng máu còn lại bằng màu đỏ tươi
        let hpPct = Math.max(0, this.hp / this.maxHp);
        this.bossUiFill.clear()
            .fillStyle(0xff0000, 1) 
            .fillRect(startX, startY, barW * hpPct, barH);
    }

    startSpawnSequence() {
        // Tạo thiên thạch bay từ góc phải trên
        let meteor = this.scene.add.image(this.x + 600, this.y - 800, 'start_boss1').setScale(1).setDepth(this.y + 100);
        
        // Cam theo dõi thiên thạch
        this.scene.cameras.main.startFollow(meteor, true, 0.05, 0.05);

        this.scene.tweens.add({
            targets: meteor, x: this.x, y: this.y, duration: 1500, ease: 'Cubic.easeIn',
            onComplete: () => {
                // Đổi thành vụ nổ
                meteor.setTexture('start_boss2');
                this.scene.cameras.main.shake(500, 0.02); // Rung màn hình
                
                this.scene.tweens.add({
                    targets: meteor, scaleX: 4, scaleY: 4, alpha: 0, duration: 1000,
                    onComplete: () => {
                        meteor.destroy();
                        this.playIntro(); // Gọi Boss ra
                    }
                });
            }
        });
    }

    playIntro() {
        this.state = 'INTRO';
        this.setVisible(true);
        this.scene.cameras.main.startFollow(this, true, 0.05, 0.05); // Cam theo dõi Boss
        
        this.anims.play('boss-intro', true);
        
        this.once('animationcomplete-boss-intro', () => {
            this.anims.play('boss-idle', true);
            
            // Hiện câu thoại Chat
            let chatBg = this.scene.add.graphics().fillStyle(0x000000, 0.7).fillRoundedRect(this.x - 150, this.y - 120, 300, 40, 10).setDepth(this.y + 200);
            let chatText = this.scene.add.text(this.x, this.y - 100, 'Hãy đến đây đi, kẻ thách thức!', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(this.y + 201);
            
            this.scene.time.delayedCall(2000, () => {
                chatBg.destroy(); chatText.destroy();
                this.state = 'WAITING'; // Sẵn sàng chờ người chơi
                this.scene.onBossIntroComplete(this); // Bật lại UI, trả Cam cho Player
            });
        });
    }

    // ==========================================
    // LOGIC ĐƯỢC GỌI MỖI KHUNG HÌNH (THAY THẾ AI CŨ)
    // ==========================================
    updateAI(player) {
        if (this.isDead || this.state === 'SPAWNING' || this.state === 'INTRO') return;

        // ==========================================
        // 1. THANH TẨY HIỆU ỨNG KHI ĐANG MIỄN NHIỄM
        // ==========================================
        // Nếu Boss đang WAITING hoặc HEALING mà bị ép trạng thái từ bên ngoài -> Xóa ngay
        if (this.state === 'WAITING' || this.state === 'HEALING') {
            if (this.isParalyzed) {
                this.isParalyzed = false;
                if (this.paralyzeEffect) {
                    this.paralyzeEffect.destroy();
                    this.paralyzeEffect = null;
                }
            }
        }

        // ==========================================
        // 2. XỬ LÝ TRẠNG THÁI CHOÁNG KHI ĐANG CHIẾN ĐẤU
        // ==========================================
        if (this.isParalyzed) {
            this.setVelocity(0, 0); // Khóa di chuyển
            if (this.anims && this.anims.isPlaying) this.anims.pause(); // Dừng hoạt ảnh hiện tại
            
            // Bắt hiệu ứng sấm sét bám theo người Boss
            if (this.paralyzeEffect) {
                this.paralyzeEffect.x = this.x; 
                this.paralyzeEffect.y = this.y;
                this.paralyzeEffect.setDepth(this.y + 1);
            }
            return; // Thoát hàm, không cho làm gì khác
        } else {
            // Khi hết choáng -> Tiếp tục chạy hoạt ảnh
            if (this.anims && !this.anims.isPlaying) this.anims.resume(); 
        }

        // ==========================================
        // 3. LOGIC DI CHUYỂN VÀ TÌM MỤC TIÊU
        // ==========================================
        let target = player; 
        if (this.scene.activeDoll && this.scene.activeDoll.active) target = this.scene.activeDoll; 

        let dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        let dx = target.x - this.x;
        let dy = target.y - this.y;

        // Lật ảnh (Hỗ trợ TẤT CẢ các hành động)
        if (Math.abs(dx) > 5) {
            this.setFlipX(dx < 0); // Lật nếu mục tiêu ở bên Trái
        }

        // Chờ người chơi bước vào vùng đánh thức
        if (this.state === 'WAITING') {
            if (dist <= this.aggroRadius) {
                this.state = 'CHASING';
                this.aggroZone.destroy(); // Xóa vòng tròn đỏ
                
                // Hiệu ứng bùng nổ chữ Boss
                this.scene.stageTextUI.setText('TRÙM CUỐI').setTint(0xff0000);
            }
            return; // Đứng yên idle chờ
        }

        // Cơ chế kích hoạt Hồi Máu (Máu < 50% và chưa hồi bao giờ)
        if (this.state === 'CHASING' && this.hp < this.maxHp * 0.5 && !this.hasHealed) {
            this.startHealSkill();
            return;
        }

        // Đang Hồi Máu thì không di chuyển hay tấn công
        if (this.state === 'HEALING') return; 

        // Đuổi theo người chơi
        if (this.state === 'CHASING') {
            if (dist > 100) {
                this.scene.physics.moveToObject(this, target, this.speed);
                this.anims.play('boss-walk', true);
            } else {
                this.setVelocity(0, 0);
                this.anims.play('boss-idle', true); // Tạm thời đứng im
            }
        }
        
        this.setDepth(this.y);
    }

    startHealSkill() {
        this.state = 'HEALING';
        this.hasHealed = true;
        this.setVelocity(0, 0);
        
        // Chuyển sang frame heal_01, sau 100ms chuyển sang heal_02 và GIỮ NGUYÊN
        this.setTexture('boss', 'heal_01.png');
        this.scene.time.delayedCall(100, () => {
            this.setTexture('boss', 'heal_02.png');
            
            // Tạo luồng sáng xanh bao quanh
            let healAura = this.scene.add.graphics().lineStyle(4, 0x00ff00, 1).strokeCircle(this.x, this.y, 80).setDepth(this.y - 1);
            let pulseTween = this.scene.tweens.add({ targets: healAura, scaleX: 1.2, scaleY: 1.2, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });

            // Rặn hồi máu trong 3 giây
            this.scene.time.delayedCall(3000, () => {
                // Hồi 30% máu
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
                this.updateBossUI();

                // Kết thúc: chuyển sang heal_03 rồi trở lại Chasing
                healAura.destroy();
                pulseTween.remove();
                this.setTexture('boss', 'heal_03.png');
                
                this.scene.time.delayedCall(200, () => {
                    this.state = 'CHASING';
                });
            });
        });
    }

    takeDamage(amount) {
        if (this.isDead || this.state === 'SPAWNING' || this.state === 'INTRO') return;
        
        // [QUAN TRỌNG]: Miễn nhiễm sát thương khi đang hồi máu
        if (this.state === 'HEALING' || this.state === 'WAITING') {
            let immuneText = this.scene.add.text(this.x, this.y - 60, 'MIỄN NHIỄM!', { fontSize: '20px', fill: '#aaaaaa', fontStyle: 'bold' }).setOrigin(0.5).setDepth(8000);
            this.scene.tweens.add({ targets: immuneText, y: this.y - 100, alpha: 0, duration: 800, onComplete: () => immuneText.destroy() });
            return;
        }

        this.hp -= amount;
        this.updateBossUI();
        
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => this.clearTint());

        let dmgText = this.scene.add.text(this.x, this.y - 40, `-${amount}`, { fontSize: '30px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        this.scene.tweens.add({ targets: dmgText, y: this.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

        if (this.hp <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.state = 'DEAD';
        this.setVelocity(0, 0);
        this.body.enable = false;
        
        this.bossUiBg.destroy();
        this.bossUiFill.destroy();
        this.bossNameText.destroy();
        if (this.aggroZone) this.aggroZone.destroy();

        this.anims.play('boss-dead', true);
        
        // Đợi chết xong (dead_03) rồi mới end game
        this.once('animationcomplete-boss-dead', () => {
            this.scene.time.delayedCall(1500, () => {
                this.scene.showVictoryScreen();
            });
        });
    }
}