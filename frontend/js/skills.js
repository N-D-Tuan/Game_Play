// ==========================================
// FILE: js/skills.js
// ==========================================

// Cấu hình Kỹ năng cho chế độ Vượt ải
export const SKILL_CAMPAIGN_CONFIG = {
    'meteor':   { name: "☄️ THIÊN THẠCH", icon: 'fireball',   cd: 3000,   baseCd: 3000,     currentCd: 0, level: 0, ui: null, hotkey: '1' },
    'swords':   { name: "⚔️ PHI KIẾM",    icon: 'sword',      cd: 5000,   baseCd: 5000,     currentCd: 0, level: 0, ui: null, hotkey: '2' },
    'lightning':{ name: "⚡ SẤM SÉT",     icon: 'lightning1', cd: 15000,  baseCd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '3' },
    'shield':   { name: "🛡️ LÁ CHẮN",     icon: 'shield',     cd: 12000,  baseCd: 12000,    currentCd: 0, level: 0, ui: null, hotkey: '4' },
    'heal':     { name: "💚 HỒI MÁU",     icon: 'heal',       cd: 15000,  baseCd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '5' },
    'earth':    { name: "⛰️ THỔ ĐỘN",     icon: 'earth2',     cd: 10000,  baseCd: 10000,    currentCd: 0, level: 0, ui: null, hotkey: '6' },
    'arrows':   { name: "🏹 VẠN TIỄN",    icon: 'arrows',     cd: 8000,   baseCd: 8000,     currentCd: 0, level: 0, ui: null, hotkey: '7' },
    'anchor':   { name: "⚓ TÀU CHIẾN",   icon: 'anchor',     cd: 15000,  baseCd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '8' },
    'doll':     { name: "🎎 HÌNH NHÂN",   icon: 'doll',       cd: 20000,  baseCd: 20000,    currentCd: 0, level: 0, ui: null, hotkey: '9' },
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
// ĐÁNH THƯỜNG (BASIC ATTACK)
// ==========================================
export function castBasicAttack(scene, player, direction) {
    // Cooldown đánh thường: 300ms đánh 1 lần
    if (scene.time.now - scene.lastAATime < 300) return;
    scene.lastAATime = scene.time.now;

    // 1. LẤY CẤP ĐỘ ĐÁNH THƯỜNG
    let level = player.aaLevel || 0;

    let px = player.x;
    let py = player.y;
    let vx = 0, vy = 0;
    let speed = 500; // Tốc độ bay của đạn

    // Xác định vận tốc và tọa độ xuất phát dựa theo hướng mặt
    if (direction === 'left') { vx = -speed; px -= 30; }
    else if (direction === 'right') { vx = speed; px += 30; }
    else if (direction === 'up') { vy = -speed; py -= 30; }
    else if (direction === 'down') { vy = speed; py += 30; }

    // 2. THAY ĐỔI HÌNH ẢNH THEO LEVEL ('aa0', 'aa1', 'aa2')
    let aaImageKey = 'aa' + level;
    let aa = scene.basicAttacks.create(px, py, aaImageKey);
    
    // ==========================================
    // CHỈNH SCALE RIÊNG CHO TỪNG LEVEL
    // ==========================================
    // Mảng chứa Scale tương ứng: [Level 0, Level 1, Level 2]
    let attackScales = [0.1, 0.1, 0.15]; 
    let currentScale = attackScales[level];
    
    aa.setScale(currentScale);

    // Xoay đầu viên đạn theo đúng hướng bay
    if (vx > 0) aa.setRotation(Math.PI / 2);         // Bắn phải
    else if (vx < 0) aa.setRotation(-Math.PI / 2);   // Bắn trái
    else if (vy > 0) aa.setRotation(Math.PI);        // Bắn xuống

    aa.setVelocity(vx, vy);
    aa.setDepth(player.y + 10);

    // 3. THAY ĐỔI KHOẢNG CÁCH (THỜI GIAN BAY) THEO LEVEL
    let flightDurations = [600, 700, 800];
    let currentDuration = flightDurations[level];

    // [GIỚI HẠN KHOẢNG CÁCH]: Viên đạn bay theo thời gian tương ứng rồi biến mất
    scene.time.delayedCall(currentDuration, () => {
        if (aa && aa.active) aa.destroy();
    });
}

// Hàm xử lý va chạm và thiết lập Sát thương
export function handleBasicAttackCollision(aa, monster) {
    if (aa.active && monster.active && !monster.isDead) {
        // Lấy cấp độ đánh thường của nhân vật (Nếu chưa có thì mặc định là 0)
        let level = aa.scene.player.aaLevel || 0;
        
        // Cấu hình sát thương: Level 0 (10), Level 1 (15), Level 2 (30)
        let damageArr = [10, 15, 30];
        let aaDamage = damageArr[level];

        aa.destroy(); // Xóa viên đạn
        
        monster.takeDamage(aaDamage); 
    }
}

// ==========================================
// KỸ NĂNG 1: THIÊN THẠCH (METEOR)
// ==========================================
export function castMeteorEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['meteor'].level;

    // 1. TÍNH TOÁN CHỈ SỐ THEO LEVEL
    // Level 0: Dame 30, Bán kính 120
    // Level 1: Dame 45, Bán kính 160
    // Level 2: Dame 60, Bán kính 200 (Thêm 2 thiên thạch nhỏ)
    let baseDamage = 30 + (level * 15); 
    let explosionRadius = 120 + (level * 40);
    let blastScale = 5 + (level * 2); // Vòng lửa nổ to hơn theo level

    // ==========================================
    // Auto Aim
    // ==========================================
    // // 2. TÌM MỤC TIÊU
    // let targetX = player.x;
    // let targetY = player.y;
    // let minDist = Infinity;
    // let foundTarget = false;
    
    // // Lưu ý: Đã đổi 'this.monsters' thành 'scene.monsters'
    // scene.monsters.getChildren().forEach(mon => {
    //     if (mon.active && !mon.isDead) {
    //         let dist = Phaser.Math.Distance.Between(player.x, player.y, mon.x, mon.y);
    //         if (dist < minDist && dist < 450) {
    //             minDist = dist; targetX = mon.x; targetY = mon.y;
    //             foundTarget = true;
    //         }
    //     }
    // });
    // // Nếu không có quái, ném ra trước mặt
    // if (!foundTarget) {
    //     if (scene.lastDirection === 'left') targetX -= 150;
    //     else if (scene.lastDirection === 'right') targetX += 150;
    //     else if (scene.lastDirection === 'up') targetY -= 150;
    //     else if (scene.lastDirection === 'down') targetY += 150;
    // }

    // 2. XÁC ĐỊNH MỤC TIÊU CỐ ĐỊNH PHÍA TRƯỚC (BỎ AUTO-AIM ĐỂ TĂNG ĐỘ KHÓ)
    let targetX = player.x;
    let targetY = player.y;
    
    // Bạn có thể tùy chỉnh khoảng cách ném xa hay gần ở biến này
    let castDistance = 250; 

    // Luôn ném thẳng ra trước mặt theo hướng nhân vật đang nhìn
    let dir = scene.lastDirection || 'down';
    if (dir === 'left') targetX -= castDistance;
    else if (dir === 'right') targetX += castDistance;
    else if (dir === 'up') targetY -= castDistance;
    else if (dir === 'down') targetY += castDistance;

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

// ==========================================
// KỸ NĂNG 2: PHI KIẾM (SWORDS)
// ==========================================
export function castSwordsEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['swords'].level;

    // 1. TÍNH TOÁN CHỈ SỐ THEO LEVEL
    // Level 0: Dame 30, Level 1: Dame 45, Level 2: Dame 60
    let baseDamage = 30 + (level * 15); 
    
    // Level 0: 1 vòng, Level 1: 2 vòng, Level 2: 3 vòng
    let numWaves = level + 1; 
    let radius = 200; // Bán kính khu vực kiếm rơi xung quanh người chơi

    // Vòng lặp thả các đợt kiếm (Mỗi đợt cách nhau 500ms để tạo nhịp điệu)
    for (let w = 0; w < numWaves; w++) {
        scene.time.delayedCall(w * 500, () => {
            // Lấy tọa độ của người chơi ngay TẠI THỜI ĐIỂM thả vòng kiếm này
            let cx = player.x;
            let cy = player.y;

            // 1. Vẽ vòng tròn vùng ảnh hưởng (Sáng lóe lên rồi mờ đi)
            let blastZone = scene.add.graphics();
            blastZone.lineStyle(4, 0x00ffff, 0.8); // Viền xanh cyan
            blastZone.fillStyle(0x00ffff, 0.15);   // Nền xanh mờ
            blastZone.strokeCircle(cx, cy, radius);
            blastZone.fillCircle(cx, cy, radius);
            blastZone.setDepth(cy - 100); // Nằm dưới đất

            scene.tweens.add({
                targets: blastZone, alpha: 0, duration: 400, onComplete: () => blastZone.destroy()
            });

            // 2. Hiệu ứng MƯA KIẾM rơi từ trên trời xuống
            let swordsCount = 15; // 15 thanh kiếm
            for (let i = 0; i < swordsCount; i++) {
                // Dùng Math.sqrt() để đảm bảo kiếm rải đều đặn trên diện tích hình tròn, không bị túm tụm lại ở tâm
                let randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                let randomDist = Math.sqrt(Math.random()) * (radius * 0.95); 
                
                let dropX = cx + Math.cos(randomAngle) * randomDist;
                let dropY = cy + Math.sin(randomAngle) * randomDist;

                // Tạo kiếm trên trời cao (Y - 600)
                let sword = scene.add.image(dropX, dropY - 600, 'sword');
                
                // Kích thước kiếm to hơn và rõ nét
                sword.setScale(0.18);
                sword.setDepth(dropY + 2000); 

                // Hoạt ảnh kiếm cắm phập xuống đất
                scene.tweens.add({
                    targets: sword,
                    y: dropY,
                    // Cho thời gian rơi dao động ngẫu nhiên một chút (200ms - 350ms) 
                    // để tạo cảm giác "mưa rơi lác đác" cực đẹp thay vì rớt cái rụp cùng 1 lúc
                    duration: Phaser.Math.Between(200, 350), 
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        // Kiếm găm trên đất một lúc rồi từ từ tan biến
                        scene.tweens.add({
                            targets: sword, alpha: 0, delay: 500, duration: 400, 
                            onComplete: () => {
                                sword.destroy();

                                // ==========================================
                                // TẠO VẾT CHÉM TRÊN MẶT ĐẤT
                                // ==========================================
                                let slash = scene.add.graphics();
                                slash.lineStyle(3, 0x222222, 0.5); // Nét chém màu đen xám, hơi mờ (50%)
                                slash.beginPath();

                                let slashType = Phaser.Math.Between(1, 3); // Random 3 kiểu chém
                                let size = 8; // Độ dài của vết chém (từ tâm ra)
                                
                                if (slashType === 1) { // Dấu /
                                    slash.moveTo(dropX - size, dropY + size);
                                    slash.lineTo(dropX + size, dropY - size);
                                } else if (slashType === 2) { // Dấu \
                                    slash.moveTo(dropX - size, dropY - size);
                                    slash.lineTo(dropX + size, dropY + size);
                                } else { // Dấu X
                                    slash.moveTo(dropX - size, dropY + size); 
                                    slash.lineTo(dropX + size, dropY - size);
                                    slash.moveTo(dropX - size, dropY - size); 
                                    slash.lineTo(dropX + size, dropY + size);
                                }
                                
                                slash.strokePath();
                                slash.setDepth(10); // Đặt Depth = 10 để vết chém nằm sát đất, dưới chân người và quái

                                // Giữ vết chém 2 giây (2000ms) rồi từ từ mờ đi trong 500ms
                                scene.tweens.add({
                                    targets: slash,
                                    alpha: 0,
                                    delay: 2000,
                                    duration: 500,
                                    onComplete: () => slash.destroy()
                                });
                            }
                        });
                    }
                });
            }

            // 3. Xử lý sát thương AoE (Đợi 300ms cho phần lớn kiếm rớt tới đất rồi mới trừ máu)
            scene.time.delayedCall(300, () => {
                scene.monsters.getChildren().forEach(mon => {
                    if (mon.active && !mon.isDead) {
                        let dist = Phaser.Math.Distance.Between(cx, cy, mon.x, mon.y);
                        // Nếu quái nằm trong bán kính r = 200
                        if (dist <= radius) {
                            mon.takeDamage(baseDamage);
                        }
                    }
                });
            });

        });
    }
}

// ==========================================
// KỸ NĂNG 3: SẤM SÉT (LIGHTNING)
// ==========================================
export function castLightningEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['lightning'].level;

    // 1. CHỈ SỐ THEO CẤP (Level 0 / 1 / 2)
    let damageArr = [40, 50, 70];
    let stunChanceArr = [0.4, 0.5, 0.7]; // Xác suất 40-50-70%
    let stunDurArr = [1000, 1500, 2000]; // Tê liệt 1s-1.5s-2s
    let strikeCountArr = [4, 5, 7];      // Số lượng tia sét

    let damage = damageArr[level];
    let stunChance = stunChanceArr[level];
    let stunDur = stunDurArr[level];
    let strikeCount = strikeCountArr[level];

    // 2. HIỆU ỨNG THỜI TIẾT TỐI DẦN (MÂY ĐEN)
    // Dùng đồ họa che toàn màn hình ở lớp Z-index cao để màn hình sập tối
    let darkCloud = scene.add.graphics().setScrollFactor(0).setDepth(13000); 
    darkCloud.fillStyle(0x000010, 1); // Màu xanh đen sấm chớp

    let padding = 100;
    darkCloud.fillRect(
        -padding,                   // Kéo lùi sang trái 100px
        -padding,                   // Kéo lùi lên trên 100px
        scene.cameras.main.width + (padding * 2),  // Mở rộng chiều ngang thêm 200px
        scene.cameras.main.height + (padding * 2)  // Mở rộng chiều dọc thêm 200px
    );
    darkCloud.setAlpha(0);

    // Kéo mây đen tối dần trong 2 giây
    scene.tweens.add({
        targets: darkCloud, alpha: 0.65, duration: 2000,
        onComplete: () => {
            
            // 3. ĐÁNH SÉT LIÊN TỤC TRONG 3 GIÂY
            let strikeInterval = 3000 / strikeCount; // Tính toán khoảng cách giữa các lần giật sét

            for (let i = 0; i < strikeCount; i++) {
                scene.time.delayedCall(i * strikeInterval, () => {
                    
                    // Lấy danh sách quái sống, chọn random 1 con
                    let activeMonsters = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
                    let targetX, targetY;

                    if (activeMonsters.length > 0) {
                        let randomMon = Phaser.Utils.Array.GetRandom(activeMonsters);
                        targetX = randomMon.x; targetY = randomMon.y;
                    } else {
                        // Không có quái -> Đánh random quanh người chơi (để vẫn nhìn thấy được trên camera)
                        targetX = player.x + Phaser.Math.Between(-500, 500);
                        targetY = player.y + Phaser.Math.Between(-300, 300);
                    }

                    // A. VẼ TIA SÉT CHÍNH
                    let lightningKey = 'lightning' + Phaser.Math.Between(1, 4); // Chọn random hình nét sét
                    let lightning = scene.add.image(targetX, targetY, lightningKey);

                    // ==========================================
                    // Phát âm thanh sấm sét nổ
                    // ==========================================
                    scene.sound.play('thunder', { volume: 0.8 });

                    lightning.setOrigin(0.5, 1); // Đặt tâm ở đáy bức ảnh để nó cắm từ trên xuống
                    lightning.setDepth(targetY + 2000);
                    lightning.setScale(1.5);
                    lightning.setBlendMode(Phaser.BlendModes.ADD);

                    scene.tweens.add({ targets: lightning, alpha: 0, duration: 300, onComplete: () => lightning.destroy() });

                    // B. CHỚP SÁNG TẠI CHỖ (Flash tỏa ra)
                    let flash = scene.add.graphics();
                    flash.setPosition(targetX, targetY);
                    flash.fillStyle(0xbbffff, 1);
                    flash.fillCircle(0, 0, 40);
                    flash.setDepth(targetY + 10);
                    flash.setBlendMode(Phaser.BlendModes.ADD);
                    
                    scene.tweens.add({
                        targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => flash.destroy()
                    });

                    // C. VẾT CHÁY ĐEN DƯỚI ĐẤT (Lưu lại 3s)
                    let scorch = scene.add.graphics();
                    scorch.fillStyle(0x000000, 0.8);
                    scorch.fillEllipse(targetX, targetY + 10, 70, 25);
                    scorch.setDepth(10); // Nằm dưới đất
                    
                    scene.tweens.add({
                        targets: scorch, alpha: 0, delay: 3000, duration: 500, onComplete: () => scorch.destroy()
                    });

                    // D. XỬ LÝ SÁT THƯƠNG VÀ TÊ LIỆT TẠI TÂM NỔ
                    let blastRadius = 90; // Sét có AoE rất nhỏ, chủ yếu trúng mục tiêu bị nhắm
                    scene.monsters.getChildren().forEach(mon => {
                        if (mon.active && !mon.isDead) {
                            let dist = Phaser.Math.Distance.Between(targetX, targetY, mon.x, mon.y);
                            if (dist <= blastRadius) {
                                mon.takeDamage(damage);
                                // Gieo xúc xắc xem có bị Tê liệt không?
                                if (!mon.isDead && Math.random() < stunChance) {
                                    if (typeof mon.applyParalysis === 'function') mon.applyParalysis(stunDur);
                                }
                            }
                        }
                    });
                });
            } // Hết vòng lặp For đánh sét

            // 4. SÁNG LẠI SAU KHI ĐÁNH XONG (Sau 3 giây sấm chớp + 2 giây để tan mây)
            scene.time.delayedCall(3000, () => {
                scene.tweens.add({
                    targets: darkCloud, alpha: 0, duration: 2000,
                    onComplete: () => darkCloud.destroy()
                });
            });

        } // Hết onComplete của vụ kéo mây đen
    });
}

// ==========================================
// KỸ NĂNG 4: LÁ CHẮN (SHIELD)
// ==========================================
export function castShieldEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['shield'].level;
    let shieldCounts = [1, 2, 3];
    let count = shieldCounts[level];

    // Xóa khiên cũ nếu bấm thi triển lại
    if (player.shieldTween) {
        player.shieldTween.stop();
        player.shieldTween.remove();
    }

    if (player.shieldGroup) {
        player.shieldGroup.destroy();
    }

    // Gắn biến vào player để theo dõi số lượng và cấp độ khiên
    player.shieldCount = count;
    player.shieldLevel = level;

    // Tạo Container chứa các mảnh khiên quay xung quanh người
    player.shieldGroup = scene.add.container(player.x, player.y).setDepth(player.y + 50);

    for (let i = 0; i < count; i++) {
        let angle = (i * Math.PI * 2) / count;
        let sx = Math.cos(angle) * 45; // Khoảng cách từ khiên đến người
        let sy = Math.sin(angle) * 45;

        // Ảnh khiên được tăng độ tương phản (Tint)
        let sImg = scene.add.image(sx, sy, 'shield').setScale(0.1);
        sImg.setTint(0xffffff); // Giữ màu gốc, tăng độ sáng
        sImg.setAlpha(1);       // Đảm bảo không bị mờ
        player.shieldGroup.add(sImg);
    }

    // Tween làm cho các mảnh khiên xoay tròn vĩnh viễn
    player.shieldTween = scene.tweens.add({
        targets: player.shieldGroup,
        angle: 360,
        duration: 2500,
        repeat: -1,
        ease: 'Linear'
    });
}

// ==========================================
// HÀM: VỤ NỔ KHIÊN LEVEL 2
// ==========================================
export function triggerShieldExplosion(scene, x, y) {
    scene.cameras.main.shake(150, 0.01);

    // Hiệu ứng nổ sóng năng lượng màu Cyan
    let blast = scene.add.graphics();
    blast.setPosition(x, y); // Dùng setPosition để tâm nổ chính xác
    blast.lineStyle(6, 0x00ffff, 1);
    blast.strokeCircle(0, 0, 60);
    blast.setDepth(y + 100);

    scene.tweens.add({
        targets: blast, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => blast.destroy()
    });

    // Gây sát thương (25) và Đẩy lùi (Knockback)
    let explosionRadius = 180;
    let knockbackDist = 120;

    scene.monsters.getChildren().forEach(mon => {
        if (mon.active && !mon.isDead) {
            let dist = Phaser.Math.Distance.Between(x, y, mon.x, mon.y);
            if (dist <= explosionRadius) {
                mon.takeDamage(25);

                let angle = Phaser.Math.Angle.Between(x, y, mon.x, mon.y);
                let nx = mon.x + Math.cos(angle) * knockbackDist;
                let ny = mon.y + Math.sin(angle) * knockbackDist;

                mon.isParalyzed = true; 
                scene.tweens.add({
                    targets: mon, x: nx, y: ny, duration: 250, ease: 'Cubic.easeOut',
                    onComplete: () => { mon.isParalyzed = false; }
                });
            }
        }
    });
}

// ==========================================
// KỸ NĂNG 5: HỒI MÁU (HEAL)
// ==========================================
export function castHealEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['heal'].level;
    let healAmounts = [30, 50, 100]; // Level 2 hồi max 100 máu
    let healAmt = healAmounts[level];

    // 1. Phục hồi sinh lực
    scene.playerHealth += healAmt;
    if (scene.playerHealth > scene.maxHealth) {
        scene.playerHealth = scene.maxHealth;
    }
    scene.updateHealthBarWidth(scene.playerHealth);

    // 2. Hiệu ứng: Chỉ 1 trái tim bay thẳng lên từ đỉnh đầu nhân vật
    let hx = player.x;
    let hy = player.y - 50; // Trừ đi 50px để xuất hiện ngay trên đầu
    let heart = scene.add.image(hx, hy, 'heal').setScale(0.1).setDepth(player.y + 2000);
    
    scene.tweens.add({
        targets: heart, 
        y: hy - 60, // Bay thẳng lên trên thêm 60px nữa
        alpha: 0, 
        duration: 1500, 
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy()
    });

    // 3. ĐẶC QUYỀN LEVEL 2: BAN PHƯỚC (Tăng 50% tốc chạy trong 3 giây)
    if (level === 2) {
        player.speedMultiplier = 1.5;

        // Xóa hào quang cũ nếu spam chiêu
        if (player.buffAura) player.buffAura.destroy();
        
        // Tạo Hào quang đặc biệt dưới chân
        player.buffAura = scene.add.graphics();
        player.buffAura.lineStyle(4, 0x00ff00, 0.8);
        player.buffAura.strokeCircle(0, 0, 35);
        
        // Nhịp đập liên tục của hào quang
        scene.tweens.add({
            targets: player.buffAura, scaleX: 1.3, scaleY: 1.3, alpha: 0.2, yoyo: true, repeat: -1, duration: 500
        });

        // Hẹn giờ tắt bùa lợi
        if (player.buffTimer) player.buffTimer.remove();
        player.buffTimer = scene.time.delayedCall(3000, () => {
            player.speedMultiplier = 1;
            if (player.buffAura) {
                player.buffAura.destroy();
                player.buffAura = null;
            }
        });
    }
}

// ==========================================
// KỸ NĂNG 6: THỔ ĐỘN (EARTH)
// ==========================================
export function castEarthEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['earth'].level;
    
    // 1. Chỉ số theo cấp
    let damageArr = [30, 35, 40];
    let durationArr = [2000, 2500, 3000]; // Thời gian núi tồn tại: 2s, 2.5s, 3s
    let damage = damageArr[level];
    let activeDuration = durationArr[level];

    // Rung màn hình nhẹ báo hiệu động đất chuẩn bị xảy ra
    scene.cameras.main.shake(2000, 0.003);

    // 2. Xác định hướng trước mặt nhân vật
    let dir = scene.lastDirection || 'down';
    let cx = player.x;
    let cy = player.y;
    let dist = 140; // Khoảng cách từ người chơi đến ngọn núi trung tâm

    if (dir === 'left') cx -= dist;
    else if (dir === 'right') cx += dist;
    else if (dir === 'up') cy -= dist;
    else if (dir === 'down') cy += dist;

    // Tọa độ 3 ngọn núi (Tạo thành bức tường chắn ngang hướng nhìn)
    let mPos = [];
    let offset = 80; // Khoảng cách giữa các ngọn núi với nhau
    if (dir === 'left' || dir === 'right') {
        mPos.push({ x: cx, y: cy });           // Giữa
        mPos.push({ x: cx, y: cy - offset });  // Trên
        mPos.push({ x: cx, y: cy + offset });  // Dưới
    } else {
        mPos.push({ x: cx, y: cy });           // Giữa
        mPos.push({ x: cx - offset, y: cy });  // Trái
        mPos.push({ x: cx + offset, y: cy });  // Phải
    }

    // 3. TẠO VẾT NỨT DƯỚI ĐẤT TRƯỚC (Từ từ hiện rõ trong 2 giây)
    let cracks = scene.add.graphics();
    cracks.lineStyle(3, 0x1a1a1a, 0.9); // Màu xám đen
    cracks.setDepth(10); // Nằm sát mặt cỏ
    cracks.setAlpha(0);  // Bắt đầu với tàng hình
    
    // Vẽ các đường zíc-zắc nứt nẻ chân thực quanh 3 vị trí
    mPos.forEach(pos => {
        for(let i = 0; i < 4; i++) {
            let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            let d = 0;
            cracks.beginPath();
            cracks.moveTo(pos.x, pos.y);
            // Kéo 3 đoạn gấp khúc cho mỗi tia nứt
            for(let j = 0; j < 3; j++) {
                d += Phaser.Math.Between(15, 25);
                angle += Phaser.Math.FloatBetween(-0.5, 0.5); // Lệch góc ngẫu nhiên
                cracks.lineTo(pos.x + Math.cos(angle) * d, pos.y + Math.sin(angle) * d);
            }
            cracks.strokePath();
        }
    });

    // Tween làm cho vết nứt hiện dần lên
    scene.tweens.add({ targets: cracks, alpha: 1, duration: 2000 });

    // 4. SAU 2 GIÂY: NÚI TRỒI LÊN, GÂY DAME VÀ ĐẨY LÙI QUÁI
    scene.time.delayedCall(2000, () => {
        // Rung màn hình mạnh khi núi đội đất chui lên
        scene.cameras.main.shake(300, 0.015);

        let mountains = [];
        let physicsBlockers = []; // Dùng cho Level 2
        let mountainCollider = null;

        let earthImages = ['earth1', 'earth2', 'earth3'];

        // Trồi 3 ngọn núi lên
        mPos.forEach((pos, index) => {

            // Gọi earthImages[index] để lấy lần lượt earth1, earth2, earth3
            let m = scene.add.image(pos.x, pos.y + 60, earthImages[index]); 

            m.setScale(0.85); 
            m.setDepth(pos.y + 60); 
            mountains.push(m);

            // Hoạt ảnh vọt lên
            scene.tweens.add({
                targets: m, y: pos.y, duration: 300, ease: 'Back.easeOut'
            });

            // ĐẶC QUYỀN LEVEL 2: TẠO TƯỜNG VẬT LÝ VÔ HÌNH
            if (level === 2) {
                // Tạo một vùng cản (Zone) vô hình hình vuông ở chân núi
                let blocker = scene.add.zone(pos.x, pos.y, 60, 60);
                scene.physics.add.existing(blocker, true); // true = Vị trí cố định (Static Body)
                physicsBlockers.push(blocker);
            }
        });

        // Bật va chạm vật lý chặn đường quái vật (Level 2)
        if (level === 2) {
            mountainCollider = scene.physics.add.collider(scene.monsters, physicsBlockers);
        }

        // Quét sát thương vùng (AoE) và Đẩy lùi
        let effectRadius = 150; // Quét một vòng tròn to bao phủ cả 3 núi
        scene.monsters.getChildren().forEach(mon => {
            if (mon.active && !mon.isDead) {
                let distToCenter = Phaser.Math.Distance.Between(cx, cy, mon.x, mon.y);
                if (distToCenter <= effectRadius) {
                    // Trừ máu
                    mon.takeDamage(damage);

                    // Toán học: Hất văng quái vật ra xa khỏi tâm 3 ngọn núi
                    let angle = Phaser.Math.Angle.Between(cx, cy, mon.x, mon.y);
                    let knockbackDist = 140; 
                    let nx = mon.x + Math.cos(angle) * knockbackDist;
                    let ny = mon.y + Math.sin(angle) * knockbackDist;

                    mon.isParalyzed = true; 
                    scene.tweens.add({
                        targets: mon, x: nx, y: ny, duration: 300, ease: 'Cubic.easeOut',
                        onComplete: () => { mon.isParalyzed = false; }
                    });
                }
            }
        });

        // 5. SAU KHI HẾT THỜI GIAN (2s - 2.5s - 3s): NÚI HẠ XUỐNG VÀ XÓA VẾT NỨT
        scene.time.delayedCall(activeDuration, () => {
            // Tắt ngay bức tường cản đường để quái có thể tràn qua
            if (mountainCollider) scene.physics.world.removeCollider(mountainCollider);
            physicsBlockers.forEach(b => b.destroy());

            // Núi tụt xuống đất
            mountains.forEach(m => {
                scene.tweens.add({
                    targets: m, y: m.y + 60, alpha: 0, duration: 800,
                    onComplete: () => m.destroy()
                });
            });

            // Vết nứt mờ dần rồi biến mất hoàn toàn
            scene.tweens.add({
                targets: cracks, alpha: 0, duration: 2000, delay: 500, // Đợi núi xuống 1 chút rồi mới mờ nứt
                onComplete: () => cracks.destroy()
            });
        });
    });
}

// ==========================================
// KỸ NĂNG 7: VẠN TIỄN (ARROWS)
// ==========================================
export function castArrowsEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['arrows'].level;
    let portalCount = level + 1; // Level 0: 1 cổng, Level 1: 2 cổng, Level 2: 3 cổng

    // 1. Xác định khu vực xả mưa tên (Phía trước mặt nhân vật)
    let dir = scene.lastDirection || 'down';
    let cx = player.x;
    let cy = player.y;
    let targetDist = 250; // Khoảng cách từ người chơi đến tâm bãi bắn

    if (dir === 'left') cx -= targetDist;
    else if (dir === 'right') cx += targetDist;
    else if (dir === 'up') cy -= targetDist;
    else if (dir === 'down') cy += targetDist;

    let targetRadius = 160; // Bán kính vùng xả tên

    // Hiệu ứng vòng tròn ngắm bắn dưới đất
    let aimZone = scene.add.graphics();
    aimZone.lineStyle(2, 0xff0000, 0.5);
    aimZone.fillStyle(0xff0000, 0.1);
    aimZone.strokeCircle(cx, cy, targetRadius);
    aimZone.fillCircle(cx, cy, targetRadius);
    aimZone.setDepth(cy - 10);
    scene.tweens.add({ targets: aimZone, alpha: 0, delay: 500, duration: 1000, onComplete: () => aimZone.destroy() });

    // 2. Mở Cổng Không Gian (Portals) trên đầu nhân vật
    let pPos = [];
    let px = player.x;
    let py = player.y - 180; // Nằm tít trên cao

    if (portalCount === 1) {
        pPos.push({ x: px, y: py });
    } else if (portalCount === 2) {
        pPos.push({ x: px - 70, y: py });
        pPos.push({ x: px + 70, y: py });
    } else {
        // 3 cổng xếp hình tam giác
        pPos.push({ x: px, y: py - 40 });
        pPos.push({ x: px - 90, y: py + 20 });
        pPos.push({ x: px + 90, y: py + 20 });
    }

    pPos.forEach((pos) => {
        // Vẽ Cổng Không gian (Vòng Elip đen viền Tím)
        let portal = scene.add.graphics();
        portal.fillStyle(0x000000, 0.9);
        portal.fillEllipse(pos.x, pos.y, 70, 25);
        portal.lineStyle(4, 0x9b59b6, 1);
        portal.strokeEllipse(pos.x, pos.y, 70, 25);
        portal.setDepth(pos.y + 2000);

        // 3. Cơ chế Xúc Xắc: 20% ra Thần Tiễn (Chỉ áp dụng ở Level 2)
        let isSpecial = (level === 2 && Math.random() < 0.2);

        if (isSpecial) {
            // ==========================================
            // THẦN TIỄN (SPECIAL ARROW)
            // ==========================================
            scene.time.delayedCall(400, () => {
                let sArrow = scene.add.image(pos.x, pos.y, 'arrows_special');
                sArrow.setScale(0.7);
                sArrow.setDepth(cy + 3000);
                
                let angle = Phaser.Math.Angle.Between(pos.x, pos.y, cx, cy);
                sArrow.setRotation(angle + Math.PI / 2); 

                // Phi thẳng xuống đất
                scene.tweens.add({
                    targets: sArrow, x: cx, y: cy, 
                    duration: 700,
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        scene.cameras.main.shake(400, 0.025); // Rung màn hình cực mạnh

                        // 1. Gây sát thương siêu to (100 ngay tâm, 80 diện rộng)
                        scene.monsters.getChildren().forEach(mon => {
                            if (mon.active && !mon.isDead) {
                                let dist = Phaser.Math.Distance.Between(cx, cy, mon.x, mon.y);
                                if (dist <= 70) mon.takeDamage(100);       // Nổ ngay mặt
                                else if (dist <= 200) mon.takeDamage(80);  // Sát thương AOE (Văng miểng)
                            }
                        });

                        // 2. TÌM QUÁI VẬT ĐỂ GĂM VÀO (Khoảng cách < 70 tức là ngay tâm nổ)
                        let hitMon = null;
                        let minDist = 70; 
                        
                        scene.monsters.getChildren().forEach(mon => {
                            if (mon.active && !mon.isDead) {
                                let dist = Phaser.Math.Distance.Between(cx, cy, mon.x, mon.y);
                                if (dist < minDist) { minDist = dist; hitMon = mon; }
                            }
                        });

                        if (hitMon) {
                            // GĂM LÊN NGƯỜI QUÁI TRONG 2 GIÂY
                            sArrow.setDepth(hitMon.y + 10);
                            let offsetX = sArrow.x - hitMon.x;
                            let offsetY = sArrow.y - hitMon.y;
                            
                            let updateStuckArrow = () => {
                                if (!sArrow.active || !hitMon.active || hitMon.isDead) {
                                    scene.events.off('update', updateStuckArrow); 
                                    if (sArrow.active) sArrow.destroy();
                                    return;
                                }
                                sArrow.x = hitMon.x + offsetX;
                                sArrow.y = hitMon.y + offsetY;
                                sArrow.setDepth(hitMon.y + 10);
                            };
                            scene.events.on('update', updateStuckArrow);

                            scene.time.delayedCall(2000, () => {
                                scene.events.off('update', updateStuckArrow);
                                if (sArrow.active) sArrow.destroy();
                            });
                        } else {
                            // TRƯỢT TÂM -> GĂM XUỐNG ĐẤT TRONG 2 GIÂY RỒI MỜ ĐI
                            sArrow.setDepth(cy); 
                            scene.tweens.add({ targets: sArrow, alpha: 0, delay: 2000, duration: 500, onComplete: () => sArrow.destroy() });
                        }
                    }
                });
            });

            // Đóng cổng
            scene.time.delayedCall(1200, () => {
                scene.tweens.add({ targets: portal, scaleX: 0, scaleY: 0, duration: 300, onComplete: () => portal.destroy() });
            });

        } else {
            // ==========================================
            // VẠN TIỄN BÌNH THƯỜNG (20 mũi / cổng)
            // ==========================================
            let arrowCount = 20;
            for (let i = 0; i < arrowCount; i++) {
                // Delay xả tên liên tục như súng máy (Cách nhau 60ms)
                scene.time.delayedCall(i * 60, () => {
                    // Chọn 1 điểm rơi ngẫu nhiên trong vùng ngắm
                    let tx = cx + Phaser.Math.Between(-targetRadius, targetRadius);
                    let ty = cy + Phaser.Math.Between(-targetRadius, targetRadius);

                    let arrow = scene.add.image(pos.x, pos.y, 'arrows');
                    arrow.setScale(0.1);
                    arrow.setDepth(ty + 2000);
                    
                    let angle = Phaser.Math.Angle.Between(pos.x, pos.y, tx, ty);
                    arrow.setRotation(angle - Math.PI / 2); 

                    scene.tweens.add({
                        targets: arrow, x: tx, y: ty, duration: 250, ease: 'Linear',
                        onComplete: () => {
                            // ==========================================
                            // GÂY SÁT THƯƠNG AOE TẠI ĐIỂM RƠI
                            // ==========================================
                            let arrowAoERadius = 60; // Bán kính nổ sát thương của mỗi mũi tên
                            scene.monsters.getChildren().forEach(mon => {
                                if (mon.active && !mon.isDead) {
                                    // Bất kỳ quái nào đứng gần điểm tên rơi đều dính 30 dame
                                    if (Phaser.Math.Distance.Between(tx, ty, mon.x, mon.y) <= arrowAoERadius) {
                                        mon.takeDamage(30);
                                    }
                                }
                            });

                            // ==========================================
                            // TÌM QUÁI VẬT ĐỂ GĂM TÊN LÊN (Chỉ để tạo hiệu ứng hình ảnh)
                            // ==========================================
                            let hitMon = null;
                            let minDist = 40; // Khoảng cách bám dính
                            
                            scene.monsters.getChildren().forEach(mon => {
                                if (mon.active && !mon.isDead) {
                                    let dist = Phaser.Math.Distance.Between(tx, ty, mon.x, mon.y);
                                    if (dist < minDist) { minDist = dist; hitMon = mon; }
                                }
                            });

                            if (hitMon) {
                                // GĂM LÊN NGƯỜI QUÁI
                                arrow.setDepth(hitMon.y + 10);
                                let offsetX = arrow.x - hitMon.x;
                                let offsetY = arrow.y - hitMon.y;
                                
                                // Cập nhật liên tục để mũi tên di chuyển theo quái
                                let updateStuckArrow = () => {
                                    if (!arrow.active || !hitMon.active || hitMon.isDead) {
                                        scene.events.off('update', updateStuckArrow); 
                                        if (arrow.active) arrow.destroy();
                                        return;
                                    }
                                    arrow.x = hitMon.x + offsetX;
                                    arrow.y = hitMon.y + offsetY;
                                    arrow.setDepth(hitMon.y + 10);
                                };
                                scene.events.on('update', updateStuckArrow);

                                // Sau 2 giây, mũi tên tan biến
                                scene.time.delayedCall(2000, () => {
                                    scene.events.off('update', updateStuckArrow);
                                    if (arrow.active) arrow.destroy();
                                });
                            } else {
                                // KHÔNG TRÚNG AI -> GĂM XUỐNG ĐẤT
                                arrow.setDepth(ty); 
                                scene.tweens.add({ targets: arrow, alpha: 0, delay: 2000, duration: 500, onComplete: () => arrow.destroy() });
                            }
                        }
                    });
                });
            }

            // Đóng cổng sau khi xả xong 20 mũi tên
            scene.time.delayedCall((arrowCount * 60) + 500, () => {
                scene.tweens.add({ targets: portal, scaleX: 0, scaleY: 0, duration: 300, onComplete: () => portal.destroy() });
            });
        }
    });
}

// ==========================================
// KỸ NĂNG 8: TÀU CHIẾN (ANCHOR / GHOST SHIP)
// ==========================================
export function castAnchorEvo(scene, player) {
    let level = SKILL_CAMPAIGN_CONFIG['anchor'].level;

    // 1. CHỈ SỐ THEO CẤP (Level 0 / 1 / 2)
    let speedBuffArr = [1.1, 1.15, 1.25]; // Buff tốc độ người chơi: 10%, 15%, 25%
    let damageArr = [10, 10, 20];         // Sát thương tông trúng
    let slowDebuffArr = [0.9, 0.85, 0.75]; // Giảm tốc độ quái: 10%, 15%, 25%

    let pBuff = speedBuffArr[level];
    let mDamage = damageArr[level];
    let mSlow = slowDebuffArr[level];

    // 2. TRIỆU HỒI TÀU MA
    let cam = scene.cameras.main;
    // Điểm xuất phát: Nằm sát mép bên phải của màn hình (camera)
    let startX = cam.worldView.left + 200; 
    // Điểm kết thúc: Chạy lố qua mép bên trái màn hình
    let endX = cam.worldView.right - 200;    
    let py = player.y; // Trùng tọa độ Y với người chơi lúc thi triển

    let ship = scene.add.image(startX, py, 'anchor');
    ship.setScale(1.3); // Phóng to hình ảnh để ra dáng con tàu
    ship.setAlpha(0.65); // Làm trong suốt như bóng ma
    ship.setTint(0x00ffcc); // Phủ lớp màu xanh lam ma quái
    ship.setDepth(py + 50); // Nằm đè lên các vật thể khác

    // 3. LOGIC VA CHẠM (CẬP NHẬT LIÊN TỤC TRONG LÚC TÀU CHẠY)
    let hitMonsters = new Set(); // Ghi nhớ quái đã tông để không trừ máu nhiều lần
    let isPlayerBuffed = false;

    let shipUpdate = () => {
        if (!ship.active) return;

        // A. Va chạm với Người chơi -> BUFF TỐC ĐỘ
        if (!isPlayerBuffed && Phaser.Math.Distance.Between(ship.x, ship.y, player.x, player.y) < 180) {
            isPlayerBuffed = true;
            player.speedMultiplier = pBuff;

            // Hiệu ứng vòng tròn xanh biển quanh người khi buff tốc
            if (player.anchorBuffAura) {
                player.anchorBuffAura.destroy();
            }
            player.anchorBuffAura = scene.add.graphics();
            player.anchorBuffAura.lineStyle(3, 0x00ffff, 0.9);
            player.anchorBuffAura.strokeCircle(0, 0, 42);
            player.anchorBuffAura.setPosition(player.x, player.y);
            player.anchorBuffAura.setDepth(player.y - 15);

            scene.tweens.add({
                targets: player.anchorBuffAura,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.25,
                yoyo: true,
                repeat: -1,
                duration: 400
            });

            // Hủy Buff sau 4 giây
            if (player.anchorBuffTimer) player.anchorBuffTimer.remove();
            player.anchorBuffTimer = scene.time.delayedCall(4000, () => {
                player.speedMultiplier = 1;
                if (player.anchorBuffAura) {
                    player.anchorBuffAura.destroy();
                    player.anchorBuffAura = null;
                }
            });
        }

        // B. Va chạm với Quái vật -> GÂY DAME & GIẢM TỐC
        scene.monsters.getChildren().forEach(mon => {
            if (mon.active && !mon.isDead && !hitMonsters.has(mon)) {
                if (Phaser.Math.Distance.Between(ship.x, ship.y, mon.x, mon.y) < 150) {
                    hitMonsters.add(mon); // Đánh dấu đã tông
                    mon.takeDamage(mDamage);

                    // Giảm tốc độ chạy của quái trong 3 giây
                    mon.speedMultiplier = mSlow;
                    scene.time.delayedCall(3000, () => {
                        if (mon.active) mon.speedMultiplier = 1;
                    });
                }
            }
        });
    };

    // Bật vòng lặp kiểm tra va chạm
    scene.events.on('update', shipUpdate);

    // 4. CHO TÀU CHẠY XUYÊN MÀN HÌNH (Mất 3 giây)
    scene.tweens.add({
        targets: ship,
        x: endX,
        duration: 3000,
        ease: 'Linear',
        onComplete: () => {
            scene.events.off('update', shipUpdate); // Tắt sự kiện khi tàu biến mất
            ship.destroy();
        }
    });

    // 5. ĐẶC QUYỀN LEVEL 2: BẮN 3 PHÁT ĐẠI BÁC
    if (level === 2) {
        // Tàu chạy 3 giây -> Bắn ở các mốc 0.6s, 1.4s, và 2.2s
        let fireTimes = [600, 1400, 2200];
        
        fireTimes.forEach((delayTime) => {
            scene.time.delayedCall(delayTime, () => {
                if (!ship.active) return; // Nếu tàu đã biến mất thì thôi

                // Tìm quái vật sống sót trên bản đồ
                let activeMons = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
                if (activeMons.length === 0) return; // Không có quái thì không bắn

                // Sắp xếp quái vật theo khoảng cách GẦN TÀU NHẤT
                activeMons.sort((a, b) => {
                    let distA = Phaser.Math.Distance.Between(ship.x, ship.y, a.x, a.y);
                    let distB = Phaser.Math.Distance.Between(ship.x, ship.y, b.x, b.y);
                    return distA - distB;
                });

                // Lấy con quái gần nhất làm mục tiêu
                let targetMon = activeMons[0];

                scene.cameras.main.shake(100, 0.005); // Giật màn hình nhẹ

                // Vẽ viên đạn đại bác (Vòng tròn đen đặc)
                let cannonball = scene.add.graphics();
                cannonball.fillStyle(0x1a1a1a, 1); // Đen nhám
                cannonball.fillCircle(0, 0, 12);
                cannonball.setPosition(ship.x, ship.y + 20);
                cannonball.setDepth(ship.depth + 2);

                // Cho đạn bay thẳng vào quái vật
                scene.tweens.add({
                    targets: cannonball, x: targetMon.x, y: targetMon.y, duration: 350, ease: 'Linear',
                    onComplete: () => {
                        cannonball.destroy();

                        // Trừ máu (50) và Làm chậm (Giảm 10% -> còn 90%)
                        if (targetMon.active && !targetMon.isDead) {
                            targetMon.takeDamage(50);
                            targetMon.speedMultiplier = 0.9;
                            
                            scene.time.delayedCall(3000, () => {
                                if (targetMon.active) targetMon.speedMultiplier = 1;
                            });
                        }
                    }
                });
            });
        });
    }
}

// ==========================================
// KỸ NĂNG 9: HÌNH NHÂN (DOLL)
// ==========================================
export function castDollEvo(scene, player) {
    // Kỹ năng này không phụ thuộc level, cả 3 cấp đều chung 1 tác dụng

    // 1. Tạo hình nhân tại vị trí người chơi
    let doll = scene.add.image(player.x, player.y, 'doll');
    
    // Bạn có thể chỉnh sửa setScale tùy theo kích thước ảnh thật của doll
    let targetScale = 0.3;

    doll.setScale(targetScale); 
    doll.setDepth(player.y);

    // [QUAN TRỌNG]: Lưu hình nhân vào biến toàn cục của Scene để quái vật dễ dàng tìm thấy
    scene.activeDoll = doll;

    // Hiệu ứng xuất hiện (Phóng to nảy nhẹ)
    scene.tweens.add({
        targets: doll,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 0, to: targetScale },
        scaleY: { from: 0, to: targetScale },
        duration: 250,
        ease: 'Back.easeOut'
    });

    // 2. Hình nhân tồn tại trong 5 giây rồi tan biến
    scene.time.delayedCall(5000, () => {
        scene.tweens.add({
            targets: doll,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 200,
            onComplete: () => {
                // Xóa biến tham chiếu để quái vật biết hình nhân đã mất
                if (scene.activeDoll === doll) {
                    scene.activeDoll = null; 
                }
                doll.destroy();
            }
        });
    });
}