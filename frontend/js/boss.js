// file: js/boss.js
import { BaseMonster } from './monster.js';

export function createBossAnimations(scene) {
    // Hoạt ảnh cơ bản
    if (!scene.anims.exists('campaign-boss-intro')) {
        scene.anims.create({ key: 'campaign-boss-intro', frames: scene.anims.generateFrameNames('boss', { prefix: 'intro_', suffix: '.png', start: 1, end: 14, zeroPad: 2 }), frameRate: 8, repeat: 0 });
    }
    if (!scene.anims.exists('campaign-boss-idle')) {
        scene.anims.create({ key: 'campaign-boss-idle', frames: scene.anims.generateFrameNames('boss', { prefix: 'idle_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 6, repeat: 0 });
    }
    if (!scene.anims.exists('campaign-boss-walk')) {
        scene.anims.create({ key: 'campaign-boss-walk', frames: scene.anims.generateFrameNames('boss', { prefix: 'walk_', suffix: '.png', start: 1, end: 4, zeroPad: 2 }), frameRate: 8, repeat: -1 });
    }
    if (!scene.anims.exists('campaign-boss-dead')) {
        scene.anims.create({ key: 'campaign-boss-dead', frames: scene.anims.generateFrameNames('boss', { prefix: 'dead_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 5, repeat: 0 });
    }

    // Kỹ năng 1: Attack (Đánh thường cận chiến)
    if (!scene.anims.exists('campaign-boss-attack')) scene.anims.create({ key: 'campaign-boss-attack', frames: scene.anims.generateFrameNames('boss', { prefix: 'attack_', suffix: '.png', start: 1, end: 4, zeroPad: 2 }), frameRate: 12, repeat: 0 });

    // Kỹ năng 2: Kick (Tốc biến đá)
    if (!scene.anims.exists('campaign-boss-kick-charge')) scene.anims.create({ key: 'campaign-boss-kick-charge', frames: scene.anims.generateFrameNames('boss', { prefix: 'kick_', suffix: '.png', start: 1, end: 2, zeroPad: 2 }), frameRate: 8, repeat: 0 });
    if (!scene.anims.exists('campaign-boss-kick-execute')) scene.anims.create({ key: 'campaign-boss-kick-execute', frames: scene.anims.generateFrameNames('boss', { prefix: 'kick_', suffix: '.png', start: 3, end: 5, zeroPad: 2 }), frameRate: 10, repeat: 0 });

    // Kỹ năng 3: Kii 1 (Chưởng xa 1)
    if (!scene.anims.exists('campaign-boss-kii1-cast')) scene.anims.create({ key: 'campaign-boss-kii1-cast', frames: scene.anims.generateFrameNames('boss', { prefix: 'kii1_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 10, repeat: 0 });
    if (!scene.anims.exists('campaign-boss-kii1-hit')) scene.anims.create({ key: 'campaign-boss-kii1-hit', frames: scene.anims.generateFrameNames('boss', { prefix: 'kii1_skill_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 12, repeat: 0 });

    // Kỹ năng 4: Kii 2 (Chưởng xa 2)
    if (!scene.anims.exists('campaign-boss-kii2-cast')) scene.anims.create({ key: 'campaign-boss-kii2-cast', frames: scene.anims.generateFrameNames('boss', { prefix: 'kii2_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 10, repeat: 0 });
    if (!scene.anims.exists('campaign-boss-kii2-travel')) scene.anims.create({ key: 'campaign-boss-kii2-travel', frames: scene.anims.generateFrameNames('boss', { prefix: 'kii2_skill_', suffix: '.png', start: 2, end: 3, zeroPad: 2 }), frameRate: 10, repeat: -1 });
    if (!scene.anims.exists('campaign-boss-kii2-hit')) scene.anims.create({ key: 'campaign-boss-kii2-hit', frames: scene.anims.generateFrameNames('boss', { prefix: 'kii2_skill_', suffix: '.png', start: 1, end: 3, zeroPad: 2 }), frameRate: 12, repeat: 0 });

    // Chiêu Cuối: Kame (Kamehameha)
    if (!scene.anims.exists('campaign-boss-kame-cast')) scene.anims.create({ key: 'campaign-boss-kame-cast', frames: scene.anims.generateFrameNames('boss', { prefix: 'kame_', suffix: '.png', start: 2, end: 3, zeroPad: 2 }), frameRate: 5, repeat: 0 });
    if (!scene.anims.exists('campaign-boss-kame-orb')) scene.anims.create({ key: 'campaign-boss-kame-orb', frames: scene.anims.generateFrameNames('boss', { prefix: 'kame_skill_', suffix: '.png', start: 1, end: 5, zeroPad: 2 }), frameRate: 6, repeat: 0 });
}

export class Boss extends BaseMonster {
    constructor(scene, x, y) {
        super(scene, x, y, 'boss', 'intro_01.png');
        this.setVisible(false); // Ẩn Boss chờ Thiên thạch rơi
        this.setOrigin(0.5, 0.5);
        this.setScale(2.5);

        this.currentBossAnimKey = null;
        this.bossIntroFrames = Array.from({ length: 14 }, (_, i) => `intro_${String(i + 1).padStart(2, '0')}.png`);
        this.bossIdleFrames = ['idle_01.png', 'idle_02.png', 'idle_03.png'];
        this.bossWalkFrames = ['walk_01.png', 'walk_02.png', 'walk_03.png', 'walk_04.png'];
        this.bossDeadFrames = ['dead_01.png', 'dead_02.png', 'dead_03.png'];

        this.body.setSize(40, 60);
        this.body.setOffset(20, 10);

        this.maxHp = 1000;
        this.hp = 1000;
        this.damage = 50;
        this.speed = 150;

        // Quản lý Trạng thái (State Machine)
        this.state = 'SPAWNING';
        this.hasHealed = false;
        this.kameUsed = false;
        this.nextAttackTime = 0;

        // Vòng tròn Aggro (Khu vực đánh thức Boss)
        this.aggroRadius = 500;
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

    stopBossAnimation() {
        if (this.anims) {
            this.anims.stop();
        }
        this.currentBossAnimKey = null;
    }

    playBossAnimation(key, onComplete = null) {
        if (this.currentBossAnimKey === key) return;
        this.stopBossAnimation();
        this.currentBossAnimKey = key;

        this.off(Phaser.Animations.Events.ANIMATION_COMPLETE);

        if (!this.scene.anims.exists(key)) {
            const frameGroup = key.replace('campaign-boss-', '');
            const frameName = `${frameGroup}_01.png`;
            this.setFrame(frameName);
            if (onComplete && frameGroup === 'dead') {
                this.scene.time.delayedCall(500, onComplete);
            }
            return;
        }

        this.anims.play(key, true);

        if (onComplete) {
            this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.currentBossAnimKey = null;
                onComplete();
            });
        }
    }

    createBossUI() {
        let cx = this.scene.cameras.main.width / 2;
        let cy = this.scene.cameras.main.height; // Lấy tọa độ đáy màn hình

        this.bossUiBg = this.scene.add.graphics().setScrollFactor(0).setDepth(10000).setVisible(false);
        this.bossUiFill = this.scene.add.graphics().setScrollFactor(0).setDepth(10001).setVisible(false);
        
        // Dời tên Boss xuống góc dưới (nằm ngay trên thanh máu Boss)
        this.bossNameText = this.scene.add.text(cx, cy - 170, '💀 KẺ CHINH PHẠT 💀', { 
            fontSize: '22px', fill: '#ff3333', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10002).setVisible(false);
        
        this.updateBossUI();
    }

    updateBossUI() {
        if (this.isDead) return;
        
        let cx = this.scene.cameras.main.width / 2;
        let cy = this.scene.cameras.main.height;
        let barW = 700, barH = 25; // Làm thanh máu to và dài hơn cho đúng chất Trùm
        let startX = cx - barW / 2;
        let startY = cy - 150; // Đặt cách đáy màn hình 150px

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
        
        this.anims.stop();
        this.playBossAnimation('campaign-boss-intro', () => {
            this.playBossAnimation('campaign-boss-idle');

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
        if (this.y != null) {
            this.setDepth(this.y);
        }
        if (this.isDead || this.state === 'SPAWNING' || this.state === 'INTRO') return;

        // Xác định mục tiêu sớm để truyền vào các kỹ năng (ưu tiên nhắm bù nhìn trước)
        let target = player; 
        if (this.scene.activeDoll && this.scene.activeDoll.active) target = this.scene.activeDoll; 

        // ==========================================
        // CƯỠNG CHẾ KAMEHAMEHA KHI MÁU <= 20%
        // Bất chấp đang làm gì hay đang bị choáng, hễ tụt máu là bùng nổ tung chiêu!
        // ==========================================
        if (this.hp <= this.maxHp * 0.2 && !this.kameUsed && this.state !== 'KAME_CASTING') {
            // Thanh tẩy ép buộc nếu Boss vô tình đang bị sét đánh
            if (this.isParalyzed) {
                this.isParalyzed = false;
                this.wasParalyzed = false;
                if (this.paralyzeEffect) {
                    this.paralyzeEffect.destroy();
                    this.paralyzeEffect = null;
                }
            }
            this.castKame(target);
            return; // Dừng lại ở đây, ưu tiên tuyệt đối cho việc gồng chiêu
        }

        // ==========================================
        // 1. THANH TẨY HIỆU ỨNG KHI ĐANG MIỄN NHIỄM
        // ==========================================
        // Nếu Boss đang WAITING hoặc HEALING mà bị ép trạng thái từ bên ngoài -> Xóa ngay
        if (this.state === 'WAITING' || this.state === 'HEALING' || this.state === 'KAME_CASTING') {
            if (this.isParalyzed) {
                this.isParalyzed = false;
                this.wasParalyzed = false;
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
            this.wasParalyzed = true;
            this.setVelocity(0, 0); // Khóa di chuyển
            if (this.anims && this.anims.isPlaying) this.anims.pause(); // Dừng hoạt ảnh hiện tại
            
            // Bắt hiệu ứng sấm sét bám theo người Boss
            if (this.paralyzeEffect) {
                this.paralyzeEffect.x = this.x; 
                this.paralyzeEffect.y = this.y;
                this.paralyzeEffect.setDepth(this.y + 1);
            }
            return;
        } else if (this.wasParalyzed) {
            // Khi vừa hết choáng
            this.wasParalyzed = false;
            
            // Nếu Boss đang tung chiêu (Attack, Kick, Kii) mà bị ngắt do choáng
            // Cưỡng chế hủy chiêu và quay về trạng thái rượt đuổi ngay lập tức!
            if (this.state === 'ATTACKING') {
                this.state = 'CHASING';
                this.nextAttackTime = this.scene.time.now + 1000; // Nghỉ 1 giây trước khi đánh tiếp
            }
            
            if (this.anims && !this.anims.isPlaying) this.anims.resume(); 
        }

        // ==========================================
        // 3. LOGIC DI CHUYỂN VÀ TÌM MỤC TIÊU
        // ==========================================
        let dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        let dx = target.x - this.x;
        let dy = target.y - this.y;

        // Lật ảnh (Hỗ trợ TẤT CẢ các hành động)
        if (Math.abs(dx) > 5 && this.state !== 'ATTACKING' && this.state !== 'KAME_CASTING') {
            this.setFlipX(dx < 0);
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

        // Cơ chế kích hoạt Kameha (Máu < 20% và chưa dùng bao giờ)
        if (this.hp <= this.maxHp * 0.2 && !this.kameUsed && this.state !== 'KAME_CASTING') {
            this.castKame(target);
            return;
        }

        // Cơ chế kích hoạt Hồi Máu (Máu < 50% và chưa hồi bao giờ)
        if (this.state === 'CHASING' && this.hp < this.maxHp * 0.5 && !this.hasHealed) {
            this.startHealSkill();
            return;
        }

        // Đang Hồi Máu, Tấn Công, Kameha thì không di chuyển hay tấn công
        if (this.state === 'HEALING' || this.state === 'ATTACKING' || this.state === 'KAME_CASTING') return;

        // Nếu kỹ năng đang hồi, đuổi theo
        if (dist > 70) {
            this.scene.physics.moveToObject(this, target, this.speed);
            this.playBossAnimation('campaign-boss-walk');
        } else {
            this.setVelocity(0, 0);
            this.playBossAnimation('campaign-boss-idle');
        }

        // LOGIC LỰA CHỌN CHIÊU THỨC TẤN CÔNG
        if (this.scene.time.now >= this.nextAttackTime) {
            if (dist <= 80) {
                this.castAttack(target);
                return;
            } else if (dist >= 150 && dist <= 250) {
                this.castKick(target);
                return;
            } else if (dist > 250) {
                // Xa hơn 250px: 50% dùng Kii 1, 50% dùng Kii 2
                if (Math.random() < 0.5) this.castKii1(target);
                else this.castKii2(target);
                return;
            }
        }
        
        this.setDepth(this.y);
    }

    // ==========================================
    // CÁC CHIÊU THỨC TẤN CÔNG
    // ==========================================

    castAttack(target) {
        this.state = 'ATTACKING';
        this.setVelocity(0, 0);
        this.playBossAnimation('campaign-boss-attack', () => {
            let player = this.scene.player;
            
            // 1. Kiểm tra sát thương lên Player
            if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 90) {
                this.scene.takeDamage(this.damage);
            }
            
            // 2. Kiểm tra sát thương lên Bù nhìn (nếu có)
            if (target !== player && target.active && typeof target.takeDamage === 'function') {
                if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= 90) {
                    target.takeDamage(this.damage);
                }
            }

            this.state = 'CHASING';
            this.nextAttackTime = this.scene.time.now + 1500; // Cooldown 1.5s
        });
    }

    castKick(target) {
        this.state = 'ATTACKING';
        this.setVelocity(0, 0);
        
        // 1. Gồng lấy đà
        this.playBossAnimation('campaign-boss-kick-charge', () => {
            // 2. Tốc biến ra sau lưng target (bù nhìn hoặc player)
            let jumpOffset = this.flipX ? 40 : -40;
            this.setPosition(target.x + jumpOffset, target.y);
            this.setFlipX(target.x > this.x); 
            
            // 3. Đá tung
            this.playBossAnimation('campaign-boss-kick-execute', () => {
                let player = this.scene.player;

                // Gây sát thương AoE vùng 100px lên Player
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 100) {
                    this.scene.takeDamage(this.damage * 1.5);
                }
                
                // Gây sát thương lên Bù nhìn
                if (target !== player && target.active && typeof target.takeDamage === 'function') {
                    if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= 100) {
                        target.takeDamage(this.damage * 1.5);
                    }
                }

                // Rung màn hình & Vẽ vết nứt
                this.scene.cameras.main.shake(200, 0.015); 
                let crack = this.scene.add.graphics({ x: this.x, y: this.y + 30 }).setDepth(this.y - 10);
                crack.lineStyle(3, 0x111111, 0.85);
                crack.beginPath();
                crack.fillStyle(0x000000, 0.9);
                crack.fillCircle(0, 0, 6);
                crack.moveTo(0, 0).lineTo(-20, 15).lineTo(-35, 10).lineTo(-50, 25);
                crack.moveTo(0, 0).lineTo(25, 12).lineTo(40, 28);
                crack.moveTo(0, 0).lineTo(15, -15).lineTo(10, -30);
                crack.moveTo(0, 0).lineTo(-15, -18).lineTo(-25, -15);
                crack.strokePath();
                
                this.scene.tweens.add({ targets: crack, alpha: 0, delay: 2500, duration: 500, onComplete: () => crack.destroy() });

                this.state = 'CHASING';
                this.nextAttackTime = this.scene.time.now + 2000;
            });
        });
    }

    castKii1(target) {
        this.state = 'ATTACKING';
        this.setVelocity(0, 0);
        this.playBossAnimation('campaign-boss-kii1-cast', () => {
            // Khóa mục tiêu (Tọa độ của bù nhìn hoặc player lúc tung chiêu)
            let targetX = target.x;
            let targetY = target.y;

            let proj = this.scene.add.image(this.x, this.y, 'boss', 'kii1_skill_03.png').setScale(2).setDepth(this.y + 100);
            
            // Bay thẳng tới mục tiêu
            this.scene.tweens.add({
                targets: proj, x: targetX, y: targetY, duration: 400, ease: 'Linear',
                onComplete: () => {
                    proj.destroy();
                    let hitSprite = this.scene.add.sprite(targetX, targetY, 'boss', 'kii1_skill_01.png').setScale(2).setDepth(targetY + 100);
                    hitSprite.play('campaign-boss-kii1-hit');
                    
                    let player = this.scene.player;

                    // Chỉ trừ máu nếu Player đứng gần vụ nổ
                    if (Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y) <= 50) {
                        this.scene.takeDamage(this.damage * 1.2);
                    }
                    if (target !== player && target.active && typeof target.takeDamage === 'function') {
                        if (Phaser.Math.Distance.Between(targetX, targetY, target.x, target.y) <= 50) {
                            target.takeDamage(this.damage * 1.2);
                        }
                    }
                    
                    hitSprite.once('animationcomplete', () => hitSprite.destroy());
                }
            });

            this.state = 'CHASING';
            this.nextAttackTime = this.scene.time.now + 2500;
        });
    }

    castKii2(target) {
        this.state = 'ATTACKING';
        this.setVelocity(0, 0);
        this.playBossAnimation('campaign-boss-kii2-cast', () => {
            let targetX = target.x;
            let targetY = target.y;

            let proj = this.scene.add.sprite(this.x, this.y, 'boss', 'kii2_skill_02.png').setScale(2).setDepth(this.y + 100);
            proj.play('campaign-boss-kii2-travel');
            
            this.scene.tweens.add({
                targets: proj, x: targetX, y: targetY, duration: 450, ease: 'Linear',
                onComplete: () => {
                    proj.destroy();
                    let hitSprite = this.scene.add.sprite(targetX, targetY, 'boss', 'kii2_skill_01.png').setScale(2.5).setDepth(targetY + 100);
                    hitSprite.play('campaign-boss-kii2-hit');
                    
                    let player = this.scene.player;

                    // Chỉ trừ máu nếu Player đứng gần vụ nổ
                    if (Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y) <= 60) {
                        this.scene.takeDamage(this.damage * 1.5);
                    }
                    if (target !== player && target.active && typeof target.takeDamage === 'function') {
                        if (Phaser.Math.Distance.Between(targetX, targetY, target.x, target.y) <= 60) {
                            target.takeDamage(this.damage * 1.5);
                        }
                    }
                    
                    hitSprite.once('animationcomplete', () => hitSprite.destroy());
                }
            });

            this.state = 'CHASING';
            this.nextAttackTime = this.scene.time.now + 2500;
        });
    }

    castKame(target) {
        this.kameUsed = true;
        this.state = 'KAME_CASTING'; // State này sẽ làm Boss miễn nhiễm sát thương
        this.setVelocity(0, 0);
        this.stopBossAnimation();

        // ==========================================
        // Ép mục tiêu luôn luôn là Player, bỏ qua Bù Nhìn
        // ==========================================
        let player = this.scene.player;
        
        // Ép Boss quay mặt về phía người chơi ngay lúc bắt đầu gồng
        this.setFlipX(player.x < this.x);

        // Cảnh báo người chơi
        let warnTxt = this.scene.add.text(this.scene.cameras.main.width/2, 100, '⚠️ CẢNH BÁO: CHIÊU CUỐI! ⚠️', { fontSize: '36px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(20000);
        this.scene.tweens.add({ targets: warnTxt, alpha: 0, delay: 2000, duration: 500, onComplete: () => warnTxt.destroy() });

        // Phase 1: Gồng năng lượng (Giữ frame kame_01 trong 3s)
        this.setFrame('kame_01.png');
        
        // Aura bao quanh
        let aura = this.scene.add.graphics({ x: this.x, y: this.y }).setDepth(this.y - 1);
        aura.lineStyle(6, 0x8a2be2, 1); // Màu tím Boss
        aura.strokeCircle(0, 0, 90);
        let auraTween = this.scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });

        this.scene.time.delayedCall(3000, () => {
            this.setFlipX(player.x < this.x);

            // Phase 2: Đẩy tay ra trước
            this.playBossAnimation('campaign-boss-kame-cast', () => {
                // Giữ frame kame_03
                this.setFrame('kame_03.png');
                
                // Spawn quả cầu skill to dần cạnh tay Boss
                let orbOffsetX = this.flipX ? -60 : 60;
                let orb = this.scene.add.sprite(this.x + orbOffsetX, this.y, 'boss', 'kame_skill_01.png').setDepth(this.y + 100).setScale(2);
                
                orb.play('campaign-boss-kame-orb');

                orb.once('animationcomplete', () => {
                    // Phase 3: Quả cầu đã max size (kame_skill_05), bắn vào Target!
                    orb.setFrame('kame_skill_05.png'); // Giữ nguyên frame to nhất
                    auraTween.remove(); aura.destroy();
                    
                    let targetX = player.x; 
                    let targetY = player.y;

                    this.state = 'CHASING'; 
                    this.nextAttackTime = this.scene.time.now + 3000;

                    this.scene.tweens.add({
                        targets: orb, x: targetX, y: targetY, duration: 800, ease: 'Sine.easeIn',
                        onComplete: () => {
                            // Cầu nổ
                            this.scene.cameras.main.shake(800, 0.04); // Rung cực mạnh
                            orb.destroy();

                            // ==========================================
                            // [ĐÃ SỬA]: LOGIC SÁT THƯƠNG XUYÊN KHIÊN
                            // ==========================================
                            let player = this.scene.player;
                            let distToPlayer = Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y);
                            
                            // Nếu Player nằm trong vùng nổ (Radius = 300)
                            if (distToPlayer <= 300) {
                                // Kiểm tra xem người chơi có đang bật khiên không
                                if (player.shieldCount && player.shieldCount > 0) {
                                    
                                    // 1. Phá sạch toàn bộ khiên ngay lập tức
                                    player.shieldCount = 0;
                                    if (player.shieldGroup) {
                                        this.scene.tweens.killTweensOf(player.shieldGroup);
                                        player.shieldGroup.destroy();
                                        player.shieldGroup = null;
                                    }
                                    
                                    // Vẽ hiệu ứng vỡ khiên diện rộng
                                    let breakFx = this.scene.add.graphics().lineStyle(4, 0x00ffff, 1).strokeCircle(player.x, player.y, 40).setDepth(player.y + 100);
                                    this.scene.tweens.add({ targets: breakFx, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 400, onComplete: () => breakFx.destroy() });

                                    // 2. Gây 100 sát thương thẳng vào máu (do shieldCount đã bằng 0)
                                    this.scene.takeDamage(100);
                                    
                                } else {
                                    // 3. Không có khiên -> Nhận đủ 180 sát thương
                                    this.scene.takeDamage(180);
                                }
                            }

                            // Vết nứt đen mờ dưới đất 3s
                            let nukeShadow = this.scene.add.graphics({ x: targetX, y: targetY }).setDepth(targetY - 100);
                            nukeShadow.fillStyle(0x000000, 0.8);
                            nukeShadow.fillCircle(0, 0, 350);
                            this.scene.tweens.add({ targets: nukeShadow, alpha: 0, delay: 2000, duration: 1000, onComplete: () => nukeShadow.destroy() });
                        }
                    });
                });
            });
        });
    }

    startHealSkill() {
        this.state = 'HEALING';
        this.hasHealed = true;
        this.setVelocity(0, 0);
        this.stopBossAnimation();
        
        // Chuyển sang frame heal_01, sau 100ms chuyển sang heal_02 và GIỮ NGUYÊN
        this.setFrame('heal_01.png');
        this.scene.time.delayedCall(100, () => {
            this.setFrame('heal_02.png');
            
            // Tạo luồng sáng xanh bao quanh
            let healAura = this.scene.add.graphics({ x: this.x, y: this.y, depth: this.y - 1 });
            healAura.lineStyle(4, 0x00ff00, 1);
            healAura.strokeCircle(0, 0, 80);

            let pulseTween = this.scene.tweens.add({
                targets: healAura,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.2,
                yoyo: true,
                repeat: -1,
                duration: 400,
                onUpdate: () => {
                    healAura.setPosition(this.x, this.y);
                }
            });

            // Rặn hồi máu trong 3 giây
            this.scene.time.delayedCall(3000, () => {
                // Hồi 30% máu
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
                this.updateBossUI();

                // Kết thúc: chuyển sang heal_03 rồi trở lại Chasing
                healAura.destroy();
                pulseTween.remove();
                this.setFrame('heal_03.png');
                
                this.scene.time.delayedCall(200, () => {
                    this.state = 'CHASING';
                });
            });
        });
    }

    takeDamage(amount) {
        if (this.isDead || this.state === 'SPAWNING' || this.state === 'INTRO') return;
        
        // Miễn nhiễm sát thương khi đang hồi máu, kame casting hoặc chờ đợi
        if (this.state === 'HEALING' || this.state === 'WAITING' || this.state === 'KAME_CASTING') {
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

        this.stopBossAnimation();
        this.playBossAnimation('campaign-boss-dead', () => {
            this.scene.time.delayedCall(1500, () => {
                this.scene.showVictoryScreen();
            });
        });
    }
}