// ==========================================
// FILE: js/skills.js
// ==========================================

// Cấu hình Kỹ năng cho chế độ Vượt ải
export const SKILL_CAMPAIGN_CONFIG = {
    'meteor':   { name: "☄️ THIÊN THẠCH", icon: 'fireball',   cd: 3000,  baseCd: 3000,     currentCd: 0, level: 0, ui: null, hotkey: '1' },
    'swords':   { name: "⚔️ PHI KIẾM",    icon: 'sword',      cd: 5000,  baseCd: 5000,     currentCd: 0, level: 0, ui: null, hotkey: '2' },
    'lightning':{ name: "⚡ SẤM SÉT",     icon: 'lightning1', cd: 7000,  baseCd: 7000,     currentCd: 0, level: 0, ui: null, hotkey: '3' },
    'shield':   { name: "🛡️ LÁ CHẮN",     icon: 'shield',     cd: 12000, baseCd: 12000,    currentCd: 0, level: 0, ui: null, hotkey: '4' },
    'heal':     { name: "💚 HỒI MÁU",     icon: 'heal',       cd: 15000, baseCd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '5' },
    'earth':    { name: "⛰️ THỔ ĐỘN",     icon: 'earth2',     cd: 10000, baseCd: 10000,    currentCd: 0, level: 0, ui: null, hotkey: '6' },
    'arrows':   { name: "🏹 VẠN TIỄN",    icon: 'arrows',     cd: 8000,  baseCd: 8000,     currentCd: 0, level: 0, ui: null, hotkey: '7' },
    'anchor':   { name: "⚓ TÀU CHIẾN",   icon: 'anchor',     cd: 15000, baseCd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '8' },
    'doll':     { name: "🎎 HÌNH NHÂN",   icon: 'doll',       cd: 20000, baseCd: 20000,    currentCd: 0, level: 0, ui: null, hotkey: '9' },
};

// Định nghĩa màu sắc viền theo cấp độ Tiến hóa
export const EVO_COLORS = [
    0x00ffff, // Level 0: Mặc định (Xanh lục/Cyan như ảnh gốc)
    0x9b59b6, // Level 1: Tiến hóa lần 1 (Tím Dark Fantasy)
    0xffd700  // Level 2: Tiến hóa lần 2 (Vàng Kim/Gold)
];

// Hàm Nâng cấp (Tiến hóa) kỹ năng
export function evolveSkill(skillKey) {
    let skill = SKILL_CAMPAIGN_CONFIG[skillKey];
    if (skill.level < 2) {
        skill.level += 1; // Tăng cấp
        
        // Cập nhật sức mạnh (Giảm hồi chiêu hoặc tăng sát thương tùy ý)
        skill.cd = skill.cd * 0.8; // Ví dụ: Giảm 20% thời gian hồi chiêu mỗi lần tiến hóa
        
        // Đổi màu viền UI ngay lập tức
        if (skill.ui && skill.ui.glow) {
            skill.ui.glow.clear();
            skill.ui.glow.lineStyle(3, EVO_COLORS[skill.level], 1);
            skill.ui.glow.strokeCircle(skill.posX, skill.startY, 29);
        }
        console.log(`Tiến hóa: ${skill.name} lên cấp ${skill.level}`);
    }
}

// ==========================================
// KỸ NĂNG 1: THIÊN THẠCH (METEOR)
// ==========================================
export function castMeteorEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['meteor'].level;

    // 1. TÍNH TOÁN CHỈ SỐ THEO LEVEL
    // Level 0: Dame 30, Bán kính 120
    // Level 1: Dame 60, Bán kính 160
    // Level 2: Dame 90, Bán kính 200 (Thêm 2 thiên thạch nhỏ)
    let baseDamage = 30 + (level * 30); 
    let explosionRadius = 120 + (level * 40);
    let blastScale = 5 + (level * 2); // Vòng lửa nổ to hơn theo level

    // 2. TÌM MỤC TIÊU
    let targetX = player.x;
    let targetY = player.y;
    let minDist = Infinity;
    let foundTarget = false;
    
    // Lưu ý: Đã đổi 'this.monsters' thành 'scene.monsters'
    scene.monsters.getChildren().forEach(mon => {
        if (mon.active && !mon.isDead) {
            let dist = Phaser.Math.Distance.Between(player.x, player.y, mon.x, mon.y);
            if (dist < minDist && dist < 450) {
                minDist = dist; targetX = mon.x; targetY = mon.y;
                foundTarget = true;
            }
        }
    });

    // Nếu không có quái, ném ra trước mặt
    if (!foundTarget) {
        if (scene.lastDirection === 'left') targetX -= 150;
        else if (scene.lastDirection === 'right') targetX += 150;
        else if (scene.lastDirection === 'up') targetY -= 150;
        else if (scene.lastDirection === 'down') targetY += 150;
    }

    // 3. THẢ THIÊN THẠCH CHÍNH
    dropMeteor(scene, targetX, targetY, baseDamage, explosionRadius, blastScale, 0.4);

    // 4. TIẾN HÓA LEVEL 2: Gọi thêm 2 thiên thạch phụ nổ kế bên
    if (level === 2) {
        scene.time.delayedCall(200, () => {
            // Thiên thạch phụ sát thương và bán kính chỉ bằng một nửa
            dropMeteor(scene, targetX - 80, targetY + 40, baseDamage * 0.5, explosionRadius * 0.7, blastScale * 0.7, 0.25);
            dropMeteor(scene, targetX + 80, targetY - 40, baseDamage * 0.5, explosionRadius * 0.7, blastScale * 0.7, 0.25);
        });
    }
}

// Hàm phụ trợ xử lý Hoạt ảnh rơi và Nổ (Dùng chung cho cả cục to và cục nhỏ)
function dropMeteor(scene, targetX, targetY, damage, radius, blastScale, imgScale) {
    let startX = targetX + 300;
    let startY = targetY - 800;
    
    let meteor = scene.add.image(startX, startY, 'fireball');
    meteor.setScale(imgScale); 
    meteor.setDepth(targetY + 2000); 
    
    let angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    meteor.setRotation(angle);

    scene.tweens.add({
        targets: meteor,
        x: targetX, y: targetY,
        duration: 700, 
        ease: 'Cubic.easeIn', 
        onComplete: () => {
            meteor.destroy(); 
            
            // Rung màn hình
            scene.cameras.main.shake(250, 0.015);

            // Vết cháy đen dưới đất (To ra theo bán kính nổ)
            let scorch = scene.add.graphics();
            scorch.fillStyle(0x000000, 0.7);
            scorch.fillEllipse(targetX, targetY + 10, radius * 1.3, radius * 0.5); 
            scorch.setDepth(10); 

            scene.tweens.add({
                targets: scorch, alpha: 0, delay: 2000, duration: 1000,
                onComplete: () => scorch.destroy()
            });

            // Vòng nổ lửa
            let blast = scene.add.graphics();
            blast.lineStyle(6, 0xff5500, 1);
            blast.strokeEllipse(targetX, targetY + 10, 40, 15);
            blast.setDepth(targetY + 100);
            
            scene.tweens.add({
                targets: blast, scaleX: blastScale, scaleY: blastScale, alpha: 0, duration: 200,
                onComplete: () => blast.destroy()
            });

            // Gây sát thương AoE
            scene.monsters.getChildren().forEach(mon => {
                if (mon.active && !mon.isDead) {
                    let dist = Phaser.Math.Distance.Between(targetX, targetY, mon.x, mon.y);
                    if (dist <= radius) {
                        mon.takeDamage(damage);
                    }
                }
            });
        }
    });
}