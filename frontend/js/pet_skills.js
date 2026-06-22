export const PET_SKILL_HOTKEYS = { pet_skill_1: 'O', pet_skill_2: 'P' };

export const PET_SKILL_DATA = {
    'kien_xanh': {
        1: { name: 'Bản Năng Sinh Tồn', type: 'passive', desc: 'Khi HP dưới 50%,\ntăng 20% Hút máu và Hồi 1% máu mỗi giây.' },
        50: { name: 'Cường Hóa Sinh Mệnh', type: 'active', cd: 50000, desc: 'Tăng thêm 50% Hút máu và Hồi 25% Máu trong 5 giây.' },
        100: { name: 'Địa Hành Kiến Chúa', type: 'active', cd: 100000, desc: 'Triệu hồi 5 Kiến Chúa tấn công AoE,\ngây 200% ATK mỗi kiến và hút máu.' }
    },
    'kien_do': {
        1: { name: 'Sát Khí', type: 'passive', desc: 'Khi đánh chí mạng,\ntăng 20% Né tránh trong 3 giây.' },
        50: { name: 'Cuồng Nộ', type: 'active', cd: 50000, desc: 'Tăng 50% Tấn công và 30% Tỉ lệ CM trong 5 giây.' },
        100: { name: 'Huyết Kiến Truy Sát', type: 'active', cd: 100000, desc: 'Triệu hồi 5 Huyết Kiến truy đuổi quái\ntrong 10s. Gây 150% ATK liên tục.' }
    },
    'ngoc_long': {
        1: { name: 'Long Khí', type: 'passive', desc: 'Hồi phục định kỳ lượng HP\ntương đương 10% Máu tối đa mỗi 10s.' },
        50: { name: 'Long Khí Hộ Thể', type: 'active', cd: 50000, desc: 'Hồi 25% Máu và tăng 40% Né tránh trong 5 giây.' },
        100: { name: 'Long Thần Chúc Phúc', type: 'active', cd: 100000, desc: 'Ngọc long chúc phúc 5s: Bơm 15% MaxHP/s,\ntăng 30% Hút Máu và Giảm 30% sát thương.' }
    },
    'phuong_hoang_bang': {
        1: { name: 'Hơi Thở Băng Giá', type: 'passive', desc: 'Đòn đánh có 50% làm chậm địch.\n(Tăng thành 80% ở map Tuyết).' },
        50: { name: 'Hàn Băng Lĩnh Vực', type: 'active', cd: 50000, desc: 'Tạo vùng băng gây sát thương 30% ATK và làm chậm 60% trong 5s.' },
        100: { name: 'Băng Hậu Giáng Thế', type: 'active', cd: 100000, desc: 'Gọi Băng Hậu khóa băng và làm chậm quái trong 5s. \nGây sát thương cao.' }
    },
    'rong_lua': {
        1: { name: 'Long Hỏa', type: 'passive', desc: 'Đòn đánh gây thiêu đốt 10% ATK \nliên tục trong 2 giây.' },
        50: { name: 'Chân Long Nộ Khí', type: 'active', cd: 50000, desc: 'Triệu hồi Rồng gây 300% ATK toàn bản đồ\n(Gây 500% nếu chỉ có 1 quái).' },
        100: { name: 'Hỏa Long Giáng Thế', type: 'active', cd: 100000, desc: 'Rồng giáng thế xé toạc bầu trời,\ngây sát thương và thiêu đốt diện rộng.' }
    },
    'default': {
        1: { name: 'Bản Năng Sinh Tồn', type: 'passive', desc: 'Tăng 2% mọi chỉ số.' },
        50: { name: 'Tiếng Gầm Áp Đảo', type: 'active', cd: 12000, desc: 'Đẩy lùi kẻ địch xung quanh.' },
        100: { name: 'Cơn Thịnh Nộ', type: 'active', cd: 40000, desc: 'Cường hóa tối đa sát thương trong 5s.' }
    }
};

// 1. HÀM CHO KHO ĐỒ (Chỉ dùng cho các Buff Tĩnh cố định)
export function applyPetPassiveEffects(currentStats, petCode, level) {
    if (level < 1) return currentStats;

    return currentStats;
}

// 2. HÀM CHO VƯỢT ẢI
export function getPetDynamicBuffs(scene, petCode, petLevel) {
    let buffs = { lifesteal: 0, hpRegen: 0, atkPercent: 0, critRate: 0, dodge: 0 };
    if (petLevel < 1) return buffs;

    if (petCode === 'kien_xanh') {
        let hpPercent = scene.playerHealth / scene.maxHealth;
        let bonusRegen = 0;
        if (scene.maxHealth) {
            bonusRegen = Math.round(scene.maxHealth * 0.01);
        }
        if (hpPercent < 0.5) {
            buffs.lifesteal += 20; 
            buffs.hpRegen += bonusRegen;   
        }
    }

    if (petCode === 'ngoc_long') {
        // Thuật toán: Hồi 10% HP mỗi 10s -> Tương đương hồi 1% HP Tối đa mỗi 1 giây.
        if (scene.maxHealth) {
            buffs.hpRegen += Math.round(scene.maxHealth * 0.01);
        }
    }

    if (scene.player && scene.player.petActiveBuffs) {
        buffs.lifesteal += (scene.player.petActiveBuffs.lifesteal || 0);
        buffs.hpRegen += (scene.player.petActiveBuffs.hpRegen || 0);
        buffs.atkPercent += (scene.player.petActiveBuffs.atkPercent || 0);
        buffs.critRate += (scene.player.petActiveBuffs.critRate || 0);
        buffs.dodge += (scene.player.petActiveBuffs.dodge || 0);
    }

    return buffs;
}

// 3. HÀM THỰC THI HOẠT ẢNH KHI ẤN PHÍM
export function executePetActiveSkill(scene, petCode, skillLevel) {
    if (!scene.player) return;
    
    if (!scene.player.petActiveBuffs) scene.player.petActiveBuffs = { lifesteal: 0, hpRegen: 0, atkPercent: 0, critRate: 0, dodge: 0, damageReduction: 0 };

    //Kĩ năng Kiến xanh cấp 50
    if (petCode === 'kien_xanh' && skillLevel === 50) {
        let bonusRegen = 0;
        if (scene.maxHealth) {
            bonusRegen = Math.round(scene.maxHealth * 0.05);
        }

        scene.player.petActiveBuffs.lifesteal += 50;
        scene.player.petActiveBuffs.hpRegen += bonusRegen;

        let aura = scene.add.circle(scene.player.x, scene.player.y, 40, 0x0000ff, 0.4).setDepth(10000);
        let followEvent = scene.time.addEvent({
            delay: 20, loop: true,
            callback: () => { if (scene.player && aura.active) { aura.setPosition(scene.player.x, scene.player.y); aura.setDepth(scene.player.y - 1); } }
        });
        scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 800, repeat: 5 }); // Lặp trong khoảng 5s

        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'CƯỜNG HÓA SINH MỆNH!', { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        scene.time.delayedCall(5000, () => {
            scene.player.petActiveBuffs.lifesteal -= 50;
            scene.player.petActiveBuffs.hpRegen -= bonusRegen;
            if (aura) aura.destroy();
            followEvent.remove();
        });
    } 
    
    // Kỹ năng Kiến đỏ cấp 50
    else if (petCode === 'kien_do' && skillLevel === 50) {
        scene.player.petActiveBuffs.atkPercent += 50;
        scene.player.petActiveBuffs.critRate += 30;

        let aura = scene.add.circle(scene.player.x, scene.player.y, 40, 0xff0000, 0.4).setDepth(10000);
        let followEvent = scene.time.addEvent({ delay: 20, loop: true, callback: () => { if (scene.player && aura.active) { aura.setPosition(scene.player.x, scene.player.y); aura.setDepth(scene.player.y - 1); } } });
        scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 800, repeat: 5 });

        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'CUỒNG NỘ!', { fontSize: '20px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        scene.time.delayedCall(5000, () => {
            if (scene.player && scene.player.petActiveBuffs) { scene.player.petActiveBuffs.atkPercent -= 50; scene.player.petActiveBuffs.critRate -= 30; }
            if (aura) aura.destroy(); followEvent.remove();
        });
    }

    // Kỹ năng Ngọc Long cấp 50
    else if (petCode === 'ngoc_long' && skillLevel === 50) {
        let bonusRegen = 0;
        if (scene.maxHealth) {
            bonusRegen = Math.round(scene.maxHealth * 0.05);
        }

        scene.player.petActiveBuffs.hpRegen += bonusRegen; // Tăng lượng lớn Hồi máu
        scene.player.petActiveBuffs.dodge += 40;    // Tăng 40% Né tránh

        let aura = scene.add.circle(scene.player.x, scene.player.y, 40, 0x00ff00, 0.4).setDepth(10000);
        let followEvent = scene.time.addEvent({ delay: 20, loop: true, callback: () => { if (scene.player && aura.active) { aura.setPosition(scene.player.x, scene.player.y); aura.setDepth(scene.player.y - 1); } } });
        scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 800, repeat: 5 });

        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'LONG KHÍ HỘ THỂ!', { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        scene.time.delayedCall(5000, () => {
            if (scene.player && scene.player.petActiveBuffs) { 
                scene.player.petActiveBuffs.hpRegen -= bonusRegen; 
                scene.player.petActiveBuffs.dodge -= 40; 
            }
            if (aura) aura.destroy(); followEvent.remove();
        });
    }

    // Kỹ năng Phượng Hoàng Băng cấp 50
    else if (petCode === 'phuong_hoang_bang' && skillLevel === 50) {
        // Vòng sáng Băng rộng 300px
        let aura = scene.add.circle(scene.player.x, scene.player.y, 300, 0x00ffff, 0.3).setDepth(10000);
        
        let followEvent = scene.time.addEvent({ 
            delay: 20, loop: true, 
            callback: () => { if (scene.player && aura.active) { aura.setPosition(scene.player.x, scene.player.y); aura.setDepth(scene.player.y - 1); } } 
        });
        
        // Hiệu ứng nhấp nháy cho Vòng Băng
        scene.tweens.add({ targets: aura, alpha: 0.1, duration: 500, yoyo: true, repeat: 9 });

        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'HÀN BĂNG LĨNH VỰC!', { fontSize: '24px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // Gây sát thương và Làm chậm liên tục mỗi 0.5 giây (Lặp 10 lần = 5 giây)
        let damageTick = scene.time.addEvent({
            delay: 500,
            repeat: 9,
            callback: () => {
                if (!scene.player || !scene.monsters) return;

                let baseAtk = window.playerStats ? window.playerStats.atk : 50;
                let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
                let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);
                let tickDamage = totalAtk * 0.30;
                
                scene.monsters.getChildren().forEach(mon => {
                    if (!mon.isDead && Phaser.Math.Distance.Between(scene.player.x, scene.player.y, mon.x, mon.y) <= 300) {
                        // Sát thương mạnh diện rộng (Không kích hoạt bạo kích/hút máu)
                        if (typeof mon.takeDamage === 'function') mon.takeDamage(tickDamage, false); 
                        
                        // Áp dụng trạng thái Đóng Băng
                        if (mon.active && !mon.isDead) {
                            mon.isSlowed = true;
                            mon.setTint(0xaaffff);
                            
                            if (mon.slowTimer) mon.slowTimer.remove(); 
                            mon.slowTimer = scene.time.delayedCall(2000, () => {
                                if (mon && mon.active && !mon.isDead) { mon.isSlowed = false; mon.clearTint(); }
                            });
                        }
                    }
                });
            }
        });

        // Kết thúc chiêu
        scene.time.delayedCall(5000, () => {
            if (aura) aura.destroy();
            followEvent.remove();
        });
    }

    // Kỹ năng Rồng Lửa cấp 50
    else if (petCode === 'rong_lua' && skillLevel === 50) {
        let cx = scene.player.x;
        let cy = scene.player.y;
        
        // Triệu hồi rồng tại vị trí hiện tại (Đứng im, Không gắn followEvent)
        let dragon = scene.add.sprite(cx, cy, 'rong_lua_idle').setDepth(cy + 1);
        dragon.setScale(0.5);
        dragon.play('rong_lua_anim');

        let roarSound = scene.sound.add('rong_ngam', { volume: 0.8 });
        roarSound.play();

        let txt = scene.add.text(cx, cy - 80, 'CHÂN LONG NỘ KHÍ!', { fontSize: '24px', fill: '#ff4400', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: cy - 130, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // Đợi rồng gầm thét đúng 3 giây rồi nổ sát thương
        scene.time.delayedCall(3000, () => {
            if (dragon) dragon.destroy();
            if (roarSound) roarSound.stop();
            if (!scene.monsters) return;

            // Đếm số lượng quái đang còn sống trên toàn bản đồ
            let aliveMonsters = scene.monsters.getChildren().filter(m => !m.isDead && m.active);
            let count = aliveMonsters.length;
            if (count === 0) return;

            // Tính toán ATK hiện tại của nhân vật
            let baseAtk = window.playerStats ? window.playerStats.atk : 50;
            let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
            let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);

            // Hệ số nhân (500% nếu chỉ có 1 quái, ngược lại 300%)
            let multiplier = (count === 1) ? 5 : 3;
            let finalDamage = totalAtk * multiplier;

            aliveMonsters.forEach(mon => {
                if (typeof mon.takeDamage === 'function') {
                    let mx = mon.x;
                    let my = mon.y;

                    mon.takeDamage(finalDamage, false); // Gây sát thương
                    
                    // Nổ 1 cục lửa to ngay dưới chân mỗi con quái
                    let explosion = scene.add.circle(mx, my, 40, 0xff4400, 0.7).setDepth(my + 1);
                    scene.tweens.add({ targets: explosion, scale: 2, alpha: 0, duration: 400, onComplete: () => explosion.destroy() });
                }
            });
            
            // Giật màn hình cực mạnh tạo cảm giác "Clear map"
            scene.cameras.main.shake(500, 0.03);
        });
    }

    // ==========================================
    // KỸ NĂNG CẤP 100: ĐỊA HÀNH KIẾN CHÚA (KIẾN XANH)
    // ==========================================
    else if (petCode === 'kien_xanh' && skillLevel === 100) {
        let cx = scene.player.x;
        let cy = scene.player.y;
        let ants = [];

        // 1. Triệu hồi 5 con kiến quanh người chơi và bắt đầu đào đất
        for(let i = 0; i < 5; i++) {
            let angle = (i / 5) * Math.PI * 2;
            let ax = cx + Math.cos(angle) * 60;
            let ay = cy + Math.sin(angle) * 60;
            let ant = scene.add.sprite(ax, ay, 'kien_xanh_atlas').setDepth(ay);
            ant.setScale(1);
            ant.play('kien_xanh_down_anim');
            ants.push(ant);
        }

        let txt = scene.add.text(cx, cy - 80, 'ĐỊA HÀNH KIẾN CHÚA!', { fontSize: '24px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: cy - 130, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // 2. ĐỢI 1,35 GIÂY CHO KIẾN ĐÀO XUỐNG XONG
        scene.time.delayedCall(1350, () => {
            ants.forEach(ant => ant.setVisible(false)); // Tàng hình kiến để di chuyển ngầm

            // Tìm và Sắp xếp quái vật theo Khoảng cách từ người chơi
            let aliveMonsters = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
            aliveMonsters.sort((a, b) => {
                return Phaser.Math.Distance.Between(cx, cy, a.x, a.y) - Phaser.Math.Distance.Between(cx, cy, b.x, b.y);
            });

            let targets = [];
            if (aliveMonsters.length > 0) {
                // Chỉ nhắm vào tối đa 5 con quái gần nhất
                let closestMonsters = aliveMonsters.slice(0, 5);
                
                // Thuật toán CHIA ĐỀU (Modulo): Nếu có 2 quái -> quái 1 nhận 3 kiến, quái 2 nhận 2 kiến.
                for (let i = 0; i < 5; i++) {
                    targets.push(closestMonsters[i % closestMonsters.length]);
                }
            } else {
                // Nếu map sạch quái thì trồi lên lại xung quanh người chơi
                for (let i = 0; i < 5; i++) targets.push(scene.player);
            }

            // Dịch chuyển kiến đến ngay dưới chân mục tiêu và bắt đầu trồi lên
            ants.forEach((ant, index) => {
                let target = targets[index];
                
                // Lệch vị trí 1 chút để nếu nhiều kiến chui 1 chỗ thì không bị đè cứng lên nhau
                let offsetX = Phaser.Math.Between(-30, 30); 
                let offsetY = Phaser.Math.Between(-30, 30);
                
                ant.setVisible(true);
                ant.play('kien_xanh_up_anim');

                let trackTarget = () => {
                    // Nếu kiến bị hủy thì gỡ hàm bám dính để giải phóng bộ nhớ
                    if (!ant.active) {
                        scene.events.off('update', trackTarget);
                        return;
                    }
                    if (!target || !target.active || target.isDead) {
                        return; 
                    }
                    ant.setPosition(target.x + offsetX, target.y + offsetY);
                    ant.setDepth(target.y + offsetY + 1);
                };

                scene.events.on('update', trackTarget);
                ant.trackEvent = trackTarget;
            });

            // 3. ĐỢI TIẾP 1,35 GIÂY (TRỒI LÊN XONG) RỒI GÂY SÁT THƯƠNG
            scene.time.delayedCall(1350, () => {
                let baseAtk = window.playerStats ? window.playerStats.atk : 50;
                let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
                let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);
                
                // MỖI kiến gây 200% ATK (Nếu 5 kiến tụ vào 1 boss = 1000% ATK)
                let antDamage = totalAtk * 2; 
                let totalDamageInflicted = 0; // Biến gom tổng dame lại để tính Hút máu

                ants.forEach(ant => {
                    if (ant.trackEvent) scene.events.off('update', ant.trackEvent);

                    let ax = ant.x;
                    let ay = ant.y;
                    
                    // Hiệu ứng nổ bùn đất tại chỗ trồi lên
                    let explosion = scene.add.circle(ax, ay, 100, 0x8b4513, 0.4).setDepth(ay + 1);
                    scene.tweens.add({ targets: explosion, scale: 1.5, alpha: 0, duration: 400, onComplete: () => explosion.destroy() });

                    // Gây sát thương AoE 100px quanh con kiến
                    if (scene.monsters) {
                        scene.monsters.getChildren().forEach(mon => {
                            if (mon.active && !mon.isDead) {
                                if (Phaser.Math.Distance.Between(ax, ay, mon.x, mon.y) <= 100) {
                                    if (typeof mon.takeDamage === 'function') {
                                        mon.takeDamage(antDamage, false);
                                        totalDamageInflicted += antDamage;
                                    }
                                }
                            }
                        });
                    }
                    ant.destroy();
                });
                
                // Rung màn hình báo hiệu nổ đồng loạt
                scene.cameras.main.shake(300, 0.02);

                // ==========================================
                // BƠM MÁU DỰA TRÊN TỔNG DAME GÂY RA TỪ 5 CON KIẾN
                // ==========================================
                let baseLifesteal = window.playerStats ? window.playerStats.lifesteal : 0;
                let totalLifesteal = baseLifesteal + dynamicBuffs.lifesteal;

                if (totalLifesteal > 0 && totalDamageInflicted > 0 && scene.playerHealth < scene.maxHealth) {
                    let totalHeal = totalDamageInflicted * (totalLifesteal / 100);
                    scene.playerHealth = Math.min(scene.maxHealth, scene.playerHealth + totalHeal);
                    scene.updateHealthBarWidth(scene.playerHealth);
                    
                    let lsText = scene.add.text(scene.player.x, scene.player.y - 30, `+${Math.round(totalHeal)}`, { 
                        fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
                    }).setOrigin(0.5).setDepth(8000);
                    scene.tweens.add({ targets: lsText, y: scene.player.y - 80, alpha: 0, duration: 1200, onComplete: () => lsText.destroy() });
                }
            });
        });
    }

    // ==========================================
    // KỸ NĂNG CẤP 100: HUYẾT KIẾN TRUY SÁT (KIẾN ĐỎ)
    // ==========================================
    else if (petCode === 'kien_do' && skillLevel === 100) {
        let cx = scene.player.x;
        let cy = scene.player.y;

        let txt = scene.add.text(cx, cy - 80, 'HUYẾT KIẾN TRUY SÁT!', { fontSize: '24px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: cy - 130, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // 1. Phân bổ mục tiêu ban đầu
        let aliveMonsters = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
        aliveMonsters.sort((a, b) => Phaser.Math.Distance.Between(cx, cy, a.x, a.y) - Phaser.Math.Distance.Between(cx, cy, b.x, b.y));
        
        let initialTargets = [];
        if (aliveMonsters.length > 0) {
            let closest = aliveMonsters.slice(0, 5);
            for (let i = 0; i < 5; i++) initialTargets.push(closest[i % closest.length]);
        }

        // 2. Sinh ra 5 con kiến đỏ xung quanh
        let ants = [];
        for (let i = 0; i < 5; i++) {
            let angle = (i / 5) * Math.PI * 2;
            let ax = cx + Math.cos(angle) * 40;
            let ay = cy + Math.sin(angle) * 40;
            
            let ant = scene.add.sprite(ax, ay, 'kien_do_atlas').setDepth(ay);
            ant.setScale(1);
            ant.play('kien_do_run_anim');
            
            ant.target = initialTargets[i] || null;
            ant.state = 'CHASING';
            ant.lastAttackTime = 0;
            
            ants.push(ant);
        }

        let duration = 10000; // Kiến tồn tại 10 giây
        let timeElapsed = 0;
        let speed = 200;
        let attackRange = 50; // Khoảng cách để bắt đầu cắn

        // 3. Vòng lặp AI cập nhật mỗi khung hình
        let updateRedAnts = (time, delta) => {
            timeElapsed += delta;
            
            // Xóa sổ bầy kiến sau 10 giây hoặc nếu nhân vật chết
            if (timeElapsed >= duration || !scene.player) {
                scene.events.off('update', updateRedAnts);
                ants.forEach(a => {
                    if (a.active) {
                        let poof = scene.add.circle(a.x, a.y, 25, 0xff0000, 0.6).setDepth(a.y);
                        scene.tweens.add({targets: poof, scale: 1.5, alpha: 0, duration: 400, onComplete: () => poof.destroy()});
                        a.destroy();
                    }
                });
                return;
            }

            // Tính toán ATK
            let baseAtk = window.playerStats ? window.playerStats.atk : 50;
            let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
            let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);
            let antDamage = totalAtk * 1.5;

            // Xử lý hành vi cho TỪNG con kiến
            ants.forEach(ant => {
                if (!ant.active) return;

                // [BẢO VỆ CHỐNG CRASH]: Nếu mục tiêu cũ đã chết/biến mất -> Quét lại map tìm con gần nhất
                if (!ant.target || !ant.target.active || ant.target.isDead) {
                    let mons = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
                    if (mons.length > 0) {
                        mons.sort((a, b) => Phaser.Math.Distance.Between(ant.x, ant.y, a.x, a.y) - Phaser.Math.Distance.Between(ant.x, ant.y, b.x, b.y));
                        ant.target = mons[0];
                    } else {
                        ant.target = null;
                    }
                }

                if (ant.target) {
                    let dist = Phaser.Math.Distance.Between(ant.x, ant.y, ant.target.x, ant.target.y);

                    // [QUAY HƯỚNG MẶT]: Sprite gốc quay trái -> Lật (FlipX) nếu mục tiêu nằm bên phải
                    ant.setFlipX(ant.target.x > ant.x);

                    if (dist > attackRange) {
                        // TRẠNG THÁI: RƯỢT ĐUỔI
                        if (ant.state !== 'CHASING') {
                            ant.state = 'CHASING';
                            ant.play('kien_do_run_anim');
                        }
                        
                        // Di chuyển (Toán học Vector)
                        let angle = Phaser.Math.Angle.Between(ant.x, ant.y, ant.target.x, ant.target.y);
                        ant.x += Math.cos(angle) * speed * (delta / 1000);
                        ant.y += Math.sin(angle) * speed * (delta / 1000);
                        ant.setDepth(ant.y); 

                    } else {
                        // TRẠNG THÁI: CẮN XÉ
                        if (ant.state !== 'ATTACKING') {
                            ant.state = 'ATTACKING';
                            ant.play('kien_do_attack_anim');
                        }
                        ant.setDepth(ant.y);

                        // Cứ 0.5s sẽ nhảy sát thương 1 lần
                        if (time - ant.lastAttackTime > 500) {
                            ant.lastAttackTime = time;
                            if (typeof ant.target.takeDamage === 'function') {
                                ant.target.takeDamage(antDamage, false);
                                
                                // Bắn vài tia máu ra cho bạo lực
                                let blood = scene.add.circle(ant.target.x, ant.target.y, 8, 0xff0000, 0.8).setDepth(ant.target.y + 1);
                                scene.tweens.add({
                                    targets: blood, y: ant.target.y - 30, alpha: 0, scale: 2, duration: 400, onComplete: () => blood.destroy()
                                });
                            }
                        }
                    }
                } else {
                    // MAP SẠCH QUÁI -> CHẠY THEO CHỦ NHÂN CHỜ THỜI CƠ
                    let distToPlayer = Phaser.Math.Distance.Between(ant.x, ant.y, scene.player.x, scene.player.y);
                    ant.setFlipX(scene.player.x > ant.x); // Quay mặt theo chủ

                    if (distToPlayer > 80) {
                        if (ant.state !== 'CHASING') { ant.state = 'CHASING'; ant.play('kien_do_run_anim'); }
                        let angle = Phaser.Math.Angle.Between(ant.x, ant.y, scene.player.x, scene.player.y);
                        ant.x += Math.cos(angle) * speed * (delta / 1000);
                        ant.y += Math.sin(angle) * speed * (delta / 1000);
                        ant.setDepth(ant.y);
                    } else {
                        // Về gần chủ thì đứng im
                        if (ant.state !== 'IDLE') { ant.state = 'IDLE'; ant.play('kien_do_run_anim'); ant.stop(); } 
                    }
                }
            });
        };

        // Kích hoạt bộ máy AI chạy mỗi mili-giây
        scene.events.on('update', updateRedAnts);
    }

    // ==========================================
    // KỸ NĂNG CẤP 100: LONG THẦN CHÚC PHÚC (NGỌC LONG)
    // ==========================================
    else if (petCode === 'ngoc_long' && skillLevel === 100) {
        // Cộng Buff Hút máu và Giảm sát thương
        scene.player.petActiveBuffs.lifesteal += 30;
        scene.player.petActiveBuffs.damageReduction = (scene.player.petActiveBuffs.damageReduction || 0) + 30;

        // Tạo Aura màu xanh lá cây
        let aura = scene.add.circle(scene.player.x, scene.player.y, 40, 0x00ff00, 0.4).setDepth(10000);
        scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 800, repeat: 5 }); // Lặp 5s

        // Triệu hồi Ngọc Long bay quanh người
        let dragon = scene.add.sprite(scene.player.x, scene.player.y, 'ngoc_long_atlas').setDepth(10001);
        dragon.setScale(1);
        dragon.play('ngoc_long_fly_anim');

        let orbitAngle = 0; // Góc xoay

        // Sự kiện bám sát: Aura gắn vào người, Rồng bay quỹ đạo tròn
        let followEvent = scene.time.addEvent({ 
            delay: 20, loop: true, 
            callback: () => { 
                if (scene.player && aura.active) { 
                    aura.setPosition(scene.player.x, scene.player.y); 
                    aura.setDepth(scene.player.y - 1); 

                    // Rồng bay theo quỹ đạo tròn bán kính 60px
                    orbitAngle += 0.08; 
                    let dx = Math.cos(orbitAngle) * 60;
                    let dy = Math.sin(orbitAngle) * 60;
                    
                    dragon.setPosition(scene.player.x + dx, scene.player.y + dy);
                    dragon.setDepth(scene.player.y + dy + 1);
                    
                    // Lật ảnh rồng tùy theo việc đang bay qua trái hay qua phải
                    dragon.setFlipX(Math.sin(orbitAngle) > 0);
                } 
            } 
        });

        // Chữ hiệu ứng
        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'LONG THẦN CHÚC PHÚC!', { fontSize: '24px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // CƠ CHẾ BƠM MÁU: 15% Max HP mỗi 1 giây (Lặp 5 lần)
        let healTimer = scene.time.addEvent({
            delay: 1000,
            repeat: 4, 
            callback: () => {
                if (scene.playerHealth > 0 && scene.maxHealth) {
                    let healAmount = scene.maxHealth * 0.15;
                    scene.playerHealth = Math.min(scene.maxHealth, scene.playerHealth + healAmount);
                    scene.updateHealthBarWidth(scene.playerHealth);
                    
                    let hTxt = scene.add.text(scene.player.x, scene.player.y - 30, `+${Math.round(healAmount)}`, { 
                        fontSize: '22px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 
                    }).setOrigin(0.5).setDepth(8000);
                    scene.tweens.add({ targets: hTxt, y: scene.player.y - 80, alpha: 0, duration: 1000, onComplete: () => hTxt.destroy() });
                }
            }
        });

        // KẾT THÚC CHIÊU THỨC SAU 5 GIÂY
        scene.time.delayedCall(5000, () => {
            if (scene.player && scene.player.petActiveBuffs) { 
                scene.player.petActiveBuffs.lifesteal -= 30; 
                scene.player.petActiveBuffs.damageReduction -= 30; 
            }
            if (aura) aura.destroy(); 
            if (dragon) dragon.destroy();
            followEvent.remove(); 
        });
    }

    // ==========================================
    // KỸ NĂNG CẤP 100: BĂNG HẬU GIÁNG THẾ (PHƯỢNG HOÀNG BĂNG)
    // ==========================================
    else if (petCode === 'phuong_hoang_bang' && skillLevel === 100) {
        let cx = scene.player.x;
        let cy = scene.player.y;

        let txt = scene.add.text(cx, cy - 80, 'BĂNG HẬU GIÁNG THẾ!', { fontSize: '24px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: cy - 130, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        // 1. Phượng hoàng xuất hiện và bay lên
        let phoenix = scene.add.sprite(cx + 40, cy, 'phuong_hoang_bang_atlas').setDepth(cy + 1000);
        phoenix.setScale(1);
        phoenix.play('phuong_hoang_up_anim');

        scene.tweens.add({
            targets: phoenix,
            y: cy - 200, 
            duration: 500, 
            onComplete: () => {
                // 2. Tìm mục tiêu gần nhất
                let aliveMonsters = scene.monsters.getChildren().filter(m => m.active && !m.isDead);
                if (aliveMonsters.length === 0) {
                    phoenix.destroy(); 
                    return; 
                }

                aliveMonsters.sort((a, b) => Phaser.Math.Distance.Between(cx, cy, a.x, a.y) - Phaser.Math.Distance.Between(cx, cy, b.x, b.y));
                let target = aliveMonsters[0];

                phoenix.setFlipX(target.x > phoenix.x);
                phoenix.play('phuong_hoang_down_start_anim');

                scene.time.delayedCall(200, () => {
                    if (phoenix.active) phoenix.play('phuong_hoang_down_fly_anim');
                });

                // ==========================================
                // CƠ CHẾ BÁM ĐUỔI NHƯ TÊN LỬA TẦM NHIỆT
                // ==========================================
                let diveSpeed = 700; // Tăng tốc độ bay từ 250 lên 700
                let isCrashed = false;
                
                // Lưu lại vị trí cuối để đề phòng quái chết giữa chừng
                phoenix.targetLastX = target.x;
                phoenix.targetLastY = target.y;

                // Hàm thực thi Nổ Băng
                let crashLogic = (crashX, crashY) => {
                    phoenix.play('phuong_hoang_down_crash_anim');
                    scene.cameras.main.shake(400, 0.02);

                    let baseAtk = window.playerStats ? window.playerStats.atk : 50;
                    let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
                    let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);

                    // Sát thương tâm nổ
                    let burstDamage = totalAtk * 4.0;
                    let crashZone = scene.add.circle(crashX, crashY, 150, 0x00ffff, 0.6).setDepth(crashY - 1);
                    scene.tweens.add({ targets: crashZone, alpha: 0, duration: 600, onComplete: () => crashZone.destroy() });

                    scene.monsters.getChildren().forEach(mon => {
                        if (mon.active && !mon.isDead) {
                            if (Phaser.Math.Distance.Between(crashX, crashY, mon.x, mon.y) <= 150) {
                                if (typeof mon.takeDamage === 'function') mon.takeDamage(burstDamage, false);
                                
                                if (mon.active && !mon.isDead) {
                                    mon.isFrozen = true;
                                    
                                    scene.time.delayedCall(5000, () => {
                                        if (mon && mon.active && !mon.isDead) {
                                            mon.isFrozen = false;
                                            mon.clearTint();
                                        }
                                    });
                                }
                            }
                        }
                    });

                    // Vùng Băng Tuyết 300px
                    let iceField = scene.add.circle(crashX, crashY, 300, 0xadd8e6, 0.3).setDepth(crashY - 2);
                    let dotDamage = totalAtk * 0.8; 
                    
                    let dotEvent = scene.time.addEvent({
                        delay: 1000,
                        repeat: 4,
                        callback: () => {
                            if (!scene.monsters) return;
                            scene.monsters.getChildren().forEach(mon => {
                                if (mon.active && !mon.isDead) {
                                    if (Phaser.Math.Distance.Between(crashX, crashY, mon.x, mon.y) <= 300) {
                                        if (typeof mon.takeDamage === 'function') mon.takeDamage(dotDamage, false);
                                        
                                        if (mon.active && !mon.isDead && !mon.isParalyzed) {
                                            mon.isSlowed = true;
                                            
                                            if (mon.slowUpdateTimer) mon.slowUpdateTimer.remove(); 
                                            mon.slowUpdateTimer = scene.time.delayedCall(1100, () => {
                                                if (mon && mon.active && !mon.isDead) {
                                                    mon.isSlowed = false;
                                                    mon.clearTint();
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    });

                    // Tự động xóa Phượng Hoàng sau khi giữ frame đâm đất 500ms
                    scene.time.delayedCall(500, () => {
                        if (phoenix) phoenix.destroy();
                    });

                    // Xóa vùng tuyết sau 5s
                    scene.time.delayedCall(5000, () => {
                        if (iceField) iceField.destroy();
                    });
                };

                // Vòng lặp cập nhật bay đuổi theo mục tiêu
                let diveUpdate = (time, delta) => {
                    if (!phoenix.active || isCrashed) {
                        scene.events.off('update', diveUpdate);
                        return;
                    }

                    // Quét xem mục tiêu còn sống không, nếu không thì đâm vào tọa độ lưu trữ cuối cùng
                    let tx = target && target.active && !target.isDead ? target.x : phoenix.targetLastX;
                    let ty = target && target.active && !target.isDead ? target.y : phoenix.targetLastY;
                    
                    if (target && target.active && !target.isDead) {
                        phoenix.targetLastX = target.x;
                        phoenix.targetLastY = target.y;
                    }

                    phoenix.setFlipX(tx > phoenix.x);
                    let dist = Phaser.Math.Distance.Between(phoenix.x, phoenix.y, tx, ty);

                    if (dist < 20) { // Đã đâm chạm đích
                        isCrashed = true;
                        scene.events.off('update', diveUpdate);
                        phoenix.setPosition(tx, ty); // Ép sát vào chân quái
                        crashLogic(tx, ty);
                    } else {
                        // Di chuyển tịnh tiến theo vector
                        let angle = Phaser.Math.Angle.Between(phoenix.x, phoenix.y, tx, ty);
                        phoenix.x += Math.cos(angle) * diveSpeed * (delta / 1000);
                        phoenix.y += Math.sin(angle) * diveSpeed * (delta / 1000);
                    }
                };

                scene.events.on('update', diveUpdate);
            }
        });
    }

    // ==========================================
    // KỸ NĂNG CẤP 100: HỎA LONG GIÁNG THẾ (RỒNG LỬA)
    // ==========================================
    else if (petCode === 'rong_lua' && skillLevel === 100) {
        let cx = scene.player.x;
        let cy = scene.player.y;

        // 1. Rồng xuất hiện và bay vút lên trời
        let dragon = scene.add.sprite(cx + 40, cy, 'rong_lua_atlas').setDepth(cy + 1000);
        dragon.setScale(0.5);
        dragon.play('rong_lua_fly_anim');

        let txt = scene.add.text(cx, cy - 80, 'HỎA LONG GIÁNG THẾ!', { fontSize: '24px', fill: '#ff4400', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: cy - 130, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        scene.tweens.add({
            targets: dragon,
            y: cy - 300,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                dragon.destroy();

                // Chờ 2 giây cho bầu trời đỏ rực hẳn rồi mới giáng thế
                scene.time.delayedCall(2000, () => {
                    
                    // 3. Khai hỏa nhạc nền Rồng thét
                    scene.sound.play('rong_thet', { volume: 1.0 });

                    // Tính toán quỹ đạo bay từ viền trái camera qua viền phải camera
                    let cam = scene.cameras.main;
                    let startX = cam.worldView.left - 400;
                    let endX = cam.worldView.right + 400;
                    let dashY = scene.player.y; // Bay quét ngang ngay vị trí người chơi đang đứng

                    let dashDragon = scene.add.sprite(startX, dashY, 'rong_lua_atlas').setDepth(dashY + 500);
                    dashDragon.setScale(2.5); // Phóng to Rồng Lửa khổng lồ
                    dashDragon.play('rong_lua_dash_anim');

                    // Lấy chỉ số sức mạnh
                    let baseAtk = window.playerStats ? window.playerStats.atk : 50;
                    let dynamicBuffs = getPetDynamicBuffs(scene, window.equippedPet.pet.pet_code, window.equippedPet.level);
                    let totalAtk = baseAtk * (1 + (dynamicBuffs.atkPercent || 0) / 100);

                    // Sát thương: 600% đâm, 60% DoT đâm, 100% DoT vệt lửa
                    let directHitDamage = totalAtk * 6.0; 
                    let directBurnDamage = totalAtk * 0.6; 
                    let trailBurnDamage = totalAtk * 1.0; 

                    let hitMonsters = new Set();
                    let patches = []; // Mảng chứa tọa độ các vệt lửa

                    // Quá trình rồng bay lướt qua trong 6 giây
                    scene.tweens.add({
                        targets: dashDragon,
                        x: endX,
                        duration: 6000,
                        ease: 'Linear',
                        onComplete: () => {
                            dashDragon.destroy();
                        }
                    });

                    // Cập nhật va chạm và rải vệt lửa liên tục
                    let dashTimer = 0;
                    let dashUpdate = (time, delta) => {
                        if (!dashDragon.active) {
                            scene.events.off('update', dashUpdate);
                            return;
                        }
                        
                        dashTimer += delta;

                        // A. Quét va chạm đâm trực tiếp
                        scene.monsters.getChildren().forEach(mon => {
                            if (mon.active && !mon.isDead && !hitMonsters.has(mon)) {
                                if (Phaser.Math.Distance.Between(dashDragon.x, dashDragon.y, mon.x, mon.y) <= 180) {
                                    hitMonsters.add(mon); // Đánh dấu đã tông
                                    
                                    if (typeof mon.takeDamage === 'function') mon.takeDamage(directHitDamage, false);
                                    
                                    // Gắn 5 ticks thiêu đốt do đâm trực tiếp (Không dẫm vệt lửa vẫn bị)
                                    if (mon.active && !mon.isDead) {
                                        mon.directBurnTicks = 5; 
                                        mon.isBurning = true;
                                        mon.setTint(0xff5500);
                                        
                                        // Nổ 1 đốm lửa to ngay lúc đâm
                                        let blood = scene.add.circle(mon.x, mon.y, 30, 0xffaa00, 0.8).setDepth(mon.y + 1);
                                        scene.tweens.add({targets: blood, scale: 2.5, alpha: 0, duration: 400, onComplete: () => blood.destroy()});
                                    }
                                }
                            }
                        });

                        // ==========================================
                        // B. RẢI VỆT LỬA CHÁY ĐEN KHỔNG LỒ 
                        // ==========================================
                        if (dashTimer >= 50) {
                            dashTimer = 0;
                            
                            let patchX = dashDragon.x - 150; 
                            let patchY = dashDragon.y;

                            let scorch = scene.add.graphics();
                            scorch.fillStyle(0x111111, 0.6); 
                            scorch.fillEllipse(patchX, patchY + 50, 600, 300);
                            scorch.setDepth(10);
                            
                            let fires = [];
                            for (let i = 0; i < 6; i++) {
                                let fireKey = Phaser.Math.RND.pick(['fire1', 'fire2', 'fire3']);
                                
                                let fireX = patchX + Phaser.Math.Between(-280, 280);
                                let fireY = patchY + Phaser.Math.Between(-50, 200);
                                
                                let fire = scene.add.image(fireX, fireY, fireKey);
                                fire.setScale(Phaser.Math.FloatBetween(0.1, 0.05)); // Giữ đốm lửa nhỏ
                                fire.setDepth(patchY + 20);

                                scene.tweens.add({targets: fire, alpha: 0.6, scale: fire.scale * 1.3, duration: Phaser.Math.Between(200, 400), yoyo: true, repeat: -1});
                                fires.push(fire);
                            }

                            // Lưu mảng để tính Dame
                            patches.push({ x: patchX, y: patchY, expireTime: time + 5000 });

                            // Tự động xóa dải đen và lửa nhỏ sau 5 giây
                            scene.time.delayedCall(5000, () => {
                                scene.tweens.add({targets: [scorch, ...fires], alpha: 0, duration: 500, onComplete: () => { scorch.destroy(); fires.forEach(f => f.destroy()); }});
                            });
                        }
                    };

                    scene.events.on('update', dashUpdate);

                    // ==========================================
                    // ĐỒNG HỒ TÍNH CỘNG DỒN SÁT THƯƠNG THIÊU ĐỐT
                    // ==========================================
                    let burnTimerEvent = scene.time.addEvent({
                        delay: 1000,
                        repeat: 16, 
                        callback: () => {
                            let currentTime = scene.time.now;
                            // Loại bỏ những vệt lửa đã hết hạn
                            patches = patches.filter(p => currentTime < p.expireTime);

                            if (!scene.monsters) return;

                            scene.monsters.getChildren().forEach(mon => {
                                if (mon.active && !mon.isDead) {
                                    
                                    // Bán kính vùng dẫm bãi lửa
                                    let onFire = patches.some(p => Phaser.Math.Distance.Between(p.x, p.y + 30, mon.x, mon.y) <= 300);
                                    if (onFire) {
                                        mon.trailBurnTicks = 5; // Cấp lại 5 ticks nếu vẫn đang đứng trong lửa
                                        mon.isBurning = true;
                                        mon.setTint(0xff5500);
                                    }

                                    // NỔ DAME 1: Thiêu đốt từ vệt lửa (100% ATK)
                                    if (mon.trailBurnTicks > 0) {
                                        if (typeof mon.takeDamage === 'function') mon.takeDamage(trailBurnDamage, false);
                                        mon.trailBurnTicks--;
                                    }

                                    // NỔ DAME 2: Thiêu đốt do đâm trực tiếp (60% ATK) CỘNG DỒN
                                    if (mon.directBurnTicks > 0 && mon.active && !mon.isDead) {
                                        if (typeof mon.takeDamage === 'function') mon.takeDamage(directBurnDamage, false);
                                        mon.directBurnTicks--;
                                    }

                                    // ==========================================
                                    // TẮT MÀU LỬA KHI AN TOÀN TUYỆT ĐỐI
                                    // Đảm bảo phải hết đâm (direct), hết bãi lửa (trail) VÀ hết nội tại (passive)
                                    // ==========================================
                                    if (mon.active && !mon.isDead && !mon.directBurnTicks && !mon.trailBurnTicks && !mon.passiveBurnActive) {
                                        mon.isBurning = false;
                                        mon.clearTint();
                                    }
                                }
                            });
                        }
                    });

                }); // Hết phần delay chờ bầu trời đỏ
            }
        });
    }

    else if (skillLevel === 100) {
        // Để trống cho Skill P sau này
        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'KỸ NĂNG P CHƯA HOÀN THIỆN!', { fontSize: '18px', fill: '#ffcc00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    }
}

// 4. HÀM KÍCH HOẠT BỊ ĐỘNG KHI ĐÁNH CHÍ MẠNG
export function triggerPetPassiveOnCrit(scene, petCode, petLevel) {
    if (petLevel < 1 || !scene.player) return;
    
    if (petCode === 'kien_do') {
        if (!scene.player.petActiveBuffs) scene.player.petActiveBuffs = { lifesteal: 0, hpRegen: 0, atkPercent: 0, critRate: 0, dodge: 0 };
        
        // Nếu đang có buff né rồi thì hủy bộ đếm giờ cũ để đếm lại từ đầu (làm mới 3s)
        if (scene.player.kienDoDodgeTimer) {
            scene.player.kienDoDodgeTimer.remove();
        } else {
            // Chỉ cộng 20% khi trước đó chưa có buff (tránh cộng dồn vô hạn)
            scene.player.petActiveBuffs.dodge += 20; 
            
            let txt = scene.add.text(scene.player.x, scene.player.y - 70, 'SÁT KHÍ (NÉ +20%)!', { fontSize: '16px', fill: '#ffaa00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(8000);
            scene.tweens.add({ targets: txt, y: scene.player.y - 110, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
        }

        // Hẹn giờ 3 giây sau sẽ trừ đi
        scene.player.kienDoDodgeTimer = scene.time.delayedCall(3000, () => {
            if (scene.player && scene.player.petActiveBuffs) {
                scene.player.petActiveBuffs.dodge -= 20;
            }
            scene.player.kienDoDodgeTimer = null;
        });
    }
}

// 5. HÀM KÍCH HOẠT BỊ ĐỘNG KHI ĐÁNH LÀM CHẬM
export function triggerPetPassiveOnHit(scene, petCode, petLevel, monster) {
    if (petLevel < 1 || !scene.player || !monster || monster.isDead) return;

    if (petCode === 'phuong_hoang_bang') {
        // Tỉ lệ: Map Tuyết = 80%, các map khác = 50%
        let chance = scene.weatherType === 'snow' ? 80 : 50;
        
        if (Math.random() * 100 < chance) {
            // Đánh dấu quái bị làm chậm
            monster.isSlowed = true;
            
            // Nếu quái đang bị chậm rồi thì reset lại thời gian
            if (monster.slowTimer) monster.slowTimer.remove();
            
            // Hẹn giờ giải trừ làm chậm sau 2 giây
            monster.slowTimer = scene.time.delayedCall(2000, () => {
                if (monster && !monster.isDead) {
                    monster.isSlowed = false;
                }
            });
        }
    }

    else if (petCode === 'rong_lua') {

        monster.passiveBurnActive = true;
        monster.isBurning = true;
        monster.setTint(0xff5500);

        if (monster.burnTimer) monster.burnTimer.remove();
        
        let burnTicks = 0;

        monster.burnTimer = scene.time.addEvent({
            delay: 500,
            repeat: 3,
            callback: () => {
                if (monster && !monster.isDead && scene.player) {
                    let baseAtk = window.playerStats ? window.playerStats.atk : 50;
                    
                    // Lửa đốt gây 10% ATK mỗi tick 
                    if (typeof monster.takeDamage === 'function') monster.takeDamage(baseAtk * 0.1, false);
                    
                    burnTicks++;
                    if (burnTicks >= 4) {
                        monster.passiveBurnActive = false;

                        // Nếu quái KHÔNG CÒN dính bãi lửa và KHÔNG CÒN dính đâm trực tiếp thì mới xóa màu
                        if (monster.active && !monster.isDead && !monster.directBurnTicks && !monster.trailBurnTicks) {
                            monster.isBurning = false;
                            monster.clearTint();
                        }
                    }
                }
            }
        });
    }
}