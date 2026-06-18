export const PET_SKILL_HOTKEYS = { pet_skill_1: 'O', pet_skill_2: 'P' };

export const PET_SKILL_DATA = {
    'kien_xanh': {
        1: { name: 'Bản Năng Sinh Tồn', type: 'passive', desc: 'Khi HP dưới 50%,\ntăng 20% Hút máu và +50 Hồi máu/s.' },
        50: { name: 'Cường Hóa Sinh Mệnh', type: 'active', cd: 50000, desc: 'Tăng thêm 50% Hút máu và +200 Hồi máu/s trong 5 giây.' },
        100: { name: 'Kỹ Năng Cấp 100', type: 'active', cd: 100000, desc: '(Chưa mở khóa hiệu ứng).' }
    },
    'kien_do': {
        1: { name: 'Sát Khí', type: 'passive', desc: 'Khi đánh chí mạng,\ntăng 20% Né tránh trong 3 giây.' },
        50: { name: 'Cuồng Nộ', type: 'active', cd: 50000, desc: 'Tăng 50% Tấn công và 30% Tỉ lệ CM trong 5 giây.' },
        100: { name: 'Kỹ Năng Cấp 100', type: 'active', cd: 100000, desc: '(Chưa mở khóa hiệu ứng).' }
    },
    'ngoc_long': {
        1: { name: 'Long Khí', type: 'passive', desc: 'Hồi phục định kỳ lượng HP\ntương đương 10% Máu tối đa mỗi 10s.' },
        50: { name: 'Long Khí Hộ Thể', type: 'active', cd: 50000, desc: 'Tăng 400 Hồi máu/s và 40% Né tránh trong 5 giây.' },
        100: { name: 'Kỹ Năng Cấp 100', type: 'active', cd: 100000, desc: '(Chưa mở khóa hiệu ứng).' }
    },
    'phuong_hoang_bang': {
        1: { name: 'Hơi Thở Băng Giá', type: 'passive', desc: 'Đòn đánh có 50% làm chậm địch.\n(Tăng thành 80% ở map Tuyết).' },
        50: { name: 'Hàn Băng Lĩnh Vực', type: 'active', cd: 50000, desc: 'Tạo vùng băng gây sát thương 30% ATK và làm chậm 60%.' },
        100: { name: 'Kỹ Năng Cấp 100', type: 'active', cd: 100000, desc: '(Chưa mở khóa hiệu ứng).' }
    },
    'rong_lua': {
        1: { name: 'Long Hỏa', type: 'passive', desc: 'Đòn đánh gây thiêu đốt 10% ATK \nliên tục trong 2 giây.' },
        50: { name: 'Chân Long Nộ Khí', type: 'active', cd: 50000, desc: 'Triệu hồi Rồng gây 300% ATK toàn bản đồ\n(Gây 500% nếu chỉ có 1 quái).' },
        100: { name: 'Kỹ Năng Cấp 100', type: 'active', cd: 100000, desc: '(Chưa mở khóa hiệu ứng).' }
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
        if (hpPercent < 0.5) {
            buffs.lifesteal += 20; 
            buffs.hpRegen += 50;   
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
    
    if (!scene.player.petActiveBuffs) scene.player.petActiveBuffs = { lifesteal: 0, hpRegen: 0, atkPercent: 0, critRate: 0, dodge: 0 };

    //Kĩ năng Kiến xanh cấp 50
    if (petCode === 'kien_xanh' && skillLevel === 50) {
        scene.player.petActiveBuffs.lifesteal += 50;
        scene.player.petActiveBuffs.hpRegen += 200;

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
            scene.player.petActiveBuffs.hpRegen -= 200;
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
        scene.player.petActiveBuffs.hpRegen += 400; // Tăng lượng lớn Hồi máu
        scene.player.petActiveBuffs.dodge += 40;    // Tăng 40% Né tránh

        let aura = scene.add.circle(scene.player.x, scene.player.y, 40, 0x00ff00, 0.4).setDepth(10000);
        let followEvent = scene.time.addEvent({ delay: 20, loop: true, callback: () => { if (scene.player && aura.active) { aura.setPosition(scene.player.x, scene.player.y); aura.setDepth(scene.player.y - 1); } } });
        scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 800, repeat: 5 });

        let txt = scene.add.text(scene.player.x, scene.player.y - 50, 'LONG KHÍ HỘ THỂ!', { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
        scene.tweens.add({ targets: txt, y: scene.player.y - 100, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });

        scene.time.delayedCall(5000, () => {
            if (scene.player && scene.player.petActiveBuffs) { 
                scene.player.petActiveBuffs.hpRegen -= 400; 
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
                        mon.isSlowed = true;
                        mon.setTint(0xaaffff);
                        
                        if (mon.slowTimer) mon.slowTimer.remove(); // Reset thời gian chậm
                        mon.slowTimer = scene.time.delayedCall(2000, () => {
                            if (mon && !mon.isDead) { mon.isSlowed = false; mon.clearTint(); }
                        });
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
        let dragon = scene.add.sprite(cx, cy, 'rong_lua_atlas').setDepth(cy + 1);
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
                    mon.takeDamage(finalDamage, false); // Gây sát thương
                    
                    // Nổ 1 cục lửa to ngay dưới chân mỗi con quái
                    let explosion = scene.add.circle(mon.x, mon.y, 40, 0xff4400, 0.7).setDepth(mon.y + 1);
                    scene.tweens.add({ targets: explosion, scale: 2, alpha: 0, duration: 400, onComplete: () => explosion.destroy() });
                }
            });
            
            // Giật màn hình cực mạnh tạo cảm giác "Clear map"
            scene.cameras.main.shake(500, 0.03);
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
            monster.setTint(0xddffff);
            
            // Nếu quái đang bị chậm rồi thì reset lại thời gian
            if (monster.slowTimer) monster.slowTimer.remove();
            
            // Hẹn giờ giải trừ làm chậm sau 2 giây
            monster.slowTimer = scene.time.delayedCall(2000, () => {
                if (monster && !monster.isDead) {
                    monster.isSlowed = false;
                    monster.clearTint();
                }
            });
        }
    }

    else if (petCode === 'rong_lua') {
        monster.isBurning = true;
        
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
                        monster.isBurning = false;
                        monster.clearTint();
                    }
                }
            }
        });
    }
}