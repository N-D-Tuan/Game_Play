// file: js/player.js

// ==========================================
// TẠO HOẠT ẢNH CHO NGƯỜI CHƠI
// ==========================================
export function createPlayerAnimations(scene) {
    scene.anims.create({ key: 'walk-down', frames: scene.anims.generateFrameNumbers('player_anim', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk-left', frames: scene.anims.generateFrameNumbers('player_anim', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk-right', frames: scene.anims.generateFrameNumbers('player_anim', { start: 8, end: 11 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk-up', frames: scene.anims.generateFrameNumbers('player_anim', { start: 12, end: 15 }), frameRate: 8, repeat: -1 });
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_anim');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // ==========================================
        // CÁC THUỘC TÍNH CƠ BẢN & KỸ NĂNG
        // ==========================================
        this.aaLevel = 0;           // Cấp độ đánh thường
        this.speedMultiplier = 1;   // Hệ số nhân tốc độ (dùng cho buff)
        
        // Thuộc tính phục vụ cho Kỹ năng
        this.shieldCount = 0;       // Số lớp khiên hiện có
        this.shieldLevel = 0;       // Cấp độ của khiên
        this.shieldGroup = null;    // Hình ảnh khiên xoay quanh
        
        this.buffAura = null;       // Hào quang dưới chân (từ chiêu Heal)
        this.buffTimer = null;      // Bộ đếm thời gian tắt Hào quang
    }

    // ==========================================
    // HÀM XỬ LÝ DI CHUYỂN (Được gọi mỗi khung hình)
    // ==========================================
    updateMovement(moveState) {
        let speed = 200 * this.speedMultiplier;

        // Xác định vector hướng
        let dirX = 0, dirY = 0;
        if (moveState.left) dirX = -1;
        else if (moveState.right) dirX = 1;
        
        if (moveState.up) dirY = -1;
        else if (moveState.down) dirY = 1;

        // Chuẩn hóa vector để đi chéo không bị vọt tốc độ
        let moveVector = new Phaser.Math.Vector2(dirX, dirY);
        moveVector.normalize();
        
        this.setVelocity(moveVector.x * speed, moveVector.y * speed);
        this.setDepth(this.y);

        // Biến lưu hướng quay mặt để trả về cho chiến đấu
        let currentDir = null;

        if (dirX < 0) { this.anims.play('walk-left', true); currentDir = 'left'; }
        else if (dirX > 0) { this.anims.play('walk-right', true); currentDir = 'right'; }
        else if (dirY < 0) { this.anims.play('walk-up', true); currentDir = 'up'; }
        else if (dirY > 0) { this.anims.play('walk-down', true); currentDir = 'down'; }
        else { this.anims.stop(); }

        // ==========================================
        // BẮT HIỆU ỨNG BÁM THEO NGƯỜI CHƠI
        // ==========================================
        if (this.shieldGroup) {
            this.shieldGroup.x = this.x;
            this.shieldGroup.y = this.y;
            this.shieldGroup.setDepth(this.y + 50);
        }
        if (this.buffAura) {
            this.buffAura.x = this.x;
            this.buffAura.y = this.y;
            this.buffAura.setDepth(this.y - 10);
        }

        return currentDir; // Trả về hướng để scene lưu lại (phục vụ cho việc bắn đạn)
    }
}