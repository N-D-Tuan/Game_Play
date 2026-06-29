import { CampaignScene } from './campaign.js';
import { SKILL_CAMPAIGN_CONFIG } from './skills.js';
import { playEggHatchAnimation } from './pet.js';
import { PET_SKILL_DATA, PET_SKILL_HOTKEYS, getPetDynamicBuffs } from './pet_skills.js';

window.playerPets = []; 
window.equippedPet = null;
let currentSelectedPet = null;

window.PET_SKILL_HOTKEYS = PET_SKILL_HOTKEYS;
window.PET_SKILL_DATA = PET_SKILL_DATA;

document.addEventListener("DOMContentLoaded", () => {
    localStorage.setItem('playerId', '1');

    // ==========================================
    // QUẢN LÝ TIỀN TỆ (VÀNG)
    // ==========================================
    window.currentGold = 0;
    const goldText = document.getElementById('player-gold');

    window.animateGoldValue = function(start, end, duration = 800) {
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeProgress = progress * (2 - progress); 
            const currentVal = Math.floor(start + (end - start) * easeProgress);
            
            goldText.innerText = currentVal.toLocaleString('en-US');
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                goldText.innerText = end.toLocaleString('en-US');
            }
        };
        window.requestAnimationFrame(step);
    };

    // Hàm gọi API lấy thông tin người chơi
    window.fetchPlayerData = async function() {
        let playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/players/${playerId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                let newGold = data.player.gold;
                window.animateGoldValue(window.currentGold, newGold);
                window.currentGold = newGold;

                window.playerData = data.player; 
                if (typeof window.updateAstroCoreUI === 'function') window.updateAstroCoreUI();
            }
        } catch (error) {
            console.error("Lỗi khi tải thông tin người chơi:", error);
        }
    };

    window.fetchPlayerData();
    fetchTalentData();
    // ==========================================

    const homeScreen = document.getElementById('home-screen');
    const gameContainer = document.getElementById('game-container');

    const buildingPractice = document.getElementById('building-practice');
    const buildingCampaign = document.getElementById('building-campaign');
    const buildingTalent = document.getElementById('building-talent');
    const buildingInventory = document.getElementById('building-inventory');
    const buildingForge = document.getElementById('building-forge');
    const buildingPet = document.getElementById('building-pet');
    const buildingAstrolabe = document.getElementById('building-astrolabe');
    const buildingArena = document.getElementById('building-arena');
    const buildingShop= document.getElementById('building-shop');
    
    // Nút Tập luyện (Restart Game)
    buildingPractice.addEventListener('click', () => {
        window.playHomeClickSound();
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            gameContainer.style.display = 'block';

            if (typeof window.game !== 'undefined') {
                window.game.scene.stop('CampaignScene'); // Dừng Vượt ải (nếu có)
                window.game.scene.start('default');      // Khởi động lại Tập luyện
            }
            window.dispatchEvent(new Event('resize')); 
        }, 1000);
    });

    buildingCampaign.addEventListener('click', () => {
        window.playHomeClickSound();
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            
            if (typeof window.game !== 'undefined') {
                window.game.scene.stop('default'); // Bắt buộc dừng Scene Tập luyện
                
                // Nếu bộ máy Game chưa biết CampaignScene là gì thì thêm nó vào
                if (!window.game.scene.keys['CampaignScene']) {
                    window.game.scene.add('CampaignScene', CampaignScene, false);
                }
                
                // Khởi động Vượt ải
                window.game.scene.start('CampaignScene', { stage: 1, level: 0, loot: [] });
            }
            window.dispatchEvent(new Event('resize')); 
        }, 1000);
    });

    const talentScreen = document.getElementById('talent-screen');
    const btnCloseTalent = document.getElementById('btn-close-talent');

    async function fetchTalentData() {
        let playerId = localStorage.getItem('playerId') || '1';
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/talents/${playerId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                talentPoints = data.talent_points;
                // Parse JSON từ DB, nếu rỗng thì mảng rỗng
                unlockedNodes = typeof data.unlocked_nodes === 'string' ? JSON.parse(data.unlocked_nodes || '[]') : (data.unlocked_nodes || []);
                
                let parsedSkills = typeof data.equipped_skills === 'string' ? JSON.parse(data.equipped_skills || '[null, null, null]') : (data.equipped_skills || [null, null, null]);
                if (!Array.isArray(parsedSkills)) parsedSkills = [null, null, null];
                
                equippedSkills = [
                    parsedSkills[0] || null,
                    parsedSkills[1] || null,
                    parsedSkills[2] || null
                ];
                
                renderTalentTree();

                // Đọc trạng thái Ổ khóa từ Database
                if (data.awakening_locks) {
                    let parsedLocks = typeof data.awakening_locks === 'string' ? JSON.parse(data.awakening_locks) : data.awakening_locks;
                    if (Array.isArray(parsedLocks) && parsedLocks.length === 8) {
                        lockedStats = parsedLocks;
                    }
                }

                // Đọc chỉ số Tế đàn               
                if (data.awakening_stats) {
                    let parsedStats = typeof data.awakening_stats === 'string' ? JSON.parse(data.awakening_stats) : data.awakening_stats;
                    if (Array.isArray(parsedStats) && parsedStats.length === 8) {
                        window.currentAwakeningStats = parsedStats;
                        drawRadarChart();
                        renderStatsList();
                        window.updateStatsUI();
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu Thiên Phú:", error);
        }
    }

    // Mở màn hình Thiên Phú
    buildingTalent.addEventListener('click', () => {
        window.playHomeClickSound();
        fetchTalentData();
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            talentScreen.style.display = 'flex';
            setTimeout(() => { talentScreen.style.opacity = '1'; }, 50);
        }, 500);
    });

    // Đóng màn hình Thiên Phú, quay lại Home
    btnCloseTalent.addEventListener('click', () => {
        talentScreen.style.opacity = '0';
        setTimeout(() => {
            talentScreen.style.display = 'none';
            homeScreen.style.display = 'flex';
            setTimeout(() => { homeScreen.style.opacity = '1'; }, 50);
        }, 500);
    });

    // ==========================================
    // HỆ THỐNG THIÊN PHÚ (TALENT SYSTEM)
    // ==========================================
    let talentPoints = 0;
    let unlockedNodes = [];
    window.equippedSkills = [null, null, null];

    // Cây điều kiện: Key là kỹ năng muốn mở, Value là kỹ năng yêu cầu phải mở trước
    const TALENT_DEPENDENCIES = {
        'earth': null,    'meteor': 'earth',   'lightning': 'meteor',
        'arrows': null,   'doll': 'arrows',    'swords': 'doll',
        'heal': null,     'shield': 'heal',    'anchor': 'shield'
    };

    const TALENT_INFO = {
        'earth': { name: 'Thổ Độn', cost: 1 },
        'meteor': { name: 'Thiên Thạch', cost: 2 },
        'lightning': { name: 'Sấm Sét', cost: 5 },
        'arrows': { name: 'Vạn Tiễn', cost: 1 },
        'doll': { name: 'Hình Nhân', cost: 2 },
        'swords': { name: 'Phi Kiếm', cost: 5 },
        'heal': { name: 'Hồi Máu', cost: 1 },
        'shield': { name: 'Lá Chắn', cost: 2 },
        'anchor': { name: 'Tàu Chiến', cost: 5 }
    };

    // Ánh xạ hình ảnh để render vào ô xuất chiến
    const NODE_IMAGES = {
        'earth': '../assets/earth2.png', 'meteor': '../assets/fireball.png', 'lightning': '../assets/lightning1.png',
        'arrows': '../assets/arrows.png', 'doll': '../assets/doll.png', 'swords': '../assets/sword.png',
        'heal': '../assets/heal.png', 'shield': '../assets/shield.png', 'anchor': '../assets/anchor.png'
    };

    const talentPointsText = document.getElementById('talent-points-text');
    const talentNodes = document.querySelectorAll('.t-node');
    const equipSlots = [
        document.getElementById('equip-slot-1'),
        document.getElementById('equip-slot-2'),
        document.getElementById('equip-slot-3')
    ];

    // Hàm vẽ lại toàn bộ Giao diện Thiên Phú
    function renderTalentTree() {
        talentPointsText.innerText = talentPoints;

        // 1. Cập nhật các Node trên cây
        talentNodes.forEach(node => {
            let skillName = node.getAttribute('data-node');
            let info = TALENT_INFO[skillName];
            let reqSkill = TALENT_DEPENDENCIES[skillName];
            let reqName = reqSkill ? TALENT_INFO[reqSkill].name : 'Không';
            
            // TẠO TOOLTIP THÔNG TIN
            let tooltipText = `[Kỹ năng] ${info.name.toUpperCase()}\nĐiểm yêu cầu: ${info.cost}`;
            if (reqSkill) {
                tooltipText += `\nĐiều kiện: Cần mở [${reqName}] trước`;
            }
            node.setAttribute('data-tooltip', tooltipText);

            if (unlockedNodes.includes(skillName)) {
                // Đã mở khóa: Xóa filter xám, đổi viền vàng, Xóa hình ổ khóa
                node.style.filter = 'grayscale(0%)';
                node.style.borderColor = '#ffcc00';
                node.style.boxShadow = '0 0 10px rgba(255, 204, 0, 0.5)';
                node.innerHTML = ''; 
            } else {
                // Chưa mở khóa: Filter xám, chèn thẻ <img> ổ khóa vào giữa
                node.style.filter = 'grayscale(100%)';
                node.style.borderColor = '#555';
                node.style.boxShadow = 'none';
                node.style.position = 'relative'; // Bắt buộc để căn giữa ổ khóa
                
                // Chỉ chèn thêm ổ khóa nếu bên trong nó chưa có
                if (!node.querySelector('.lock-icon')) {
                    node.innerHTML = `<img class="lock-icon" src="../assets/lock.png" style="width: 20px; height: 20px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2; opacity: 0.9;">`;
                }
            }
        });

        // 2. Cập nhật 3 Ô Kỹ năng Xuất chiến
        equipSlots.forEach((slot, index) => {
            let skill = equippedSkills[index];
            if (skill) {
                slot.style.backgroundImage = `url('${NODE_IMAGES[skill]}')`;
                slot.innerHTML = '';
                slot.style.borderColor = '#00ffcc';
            } else {
                slot.style.backgroundImage = 'none';
                slot.innerHTML = 'Trống';
                slot.style.borderColor = '#888';
            }

            let keyLabel = document.getElementById('key-slot-' + (index + 1));
            if (keyLabel) keyLabel.innerText = window.SKILL_SLOT_HOTKEYS['slot' + (index + 1)];
        });
    }

    talentNodes.forEach(node => {
        node.addEventListener('click', async () => {
            let skillName = node.getAttribute('data-node');

            // TRƯỜNG HỢP 1: NẾU ĐÃ MỞ KHÓA -> TIẾN HÀNH TRANG BỊ
            if (unlockedNodes.includes(skillName)) {
                // Kiểm tra xem đã trang bị chưa
                if (equippedSkills.includes(skillName)) {
                    showDarkFantasyAlert("Kỹ năng này đã được xuất chiến!");
                    return;
                }

                // Tìm ô trống đầu tiên để nhét vào
                let emptyIndex = equippedSkills.findIndex(s => !s);
                if (emptyIndex !== -1) {
                    equippedSkills[emptyIndex] = skillName;
                } else {
                    // Nếu đầy, đẩy kỹ năng ở ô đầu tiên ra và thay thế
                    equippedSkills[0] = skillName; 
                }

                renderTalentTree();
                saveEquippedSkillsAPI(); // Gọi API lưu mảng equippedSkills
                return;
            }

            // TRƯỜNG HỢP 2: CHƯA MỞ KHÓA -> KIỂM TRA ĐIỀU KIỆN ĐỂ MỞ
            let requiredSkill = TALENT_DEPENDENCIES[skillName];
            if (requiredSkill !== null && !unlockedNodes.includes(requiredSkill)) {
                showDarkFantasyAlert("Cần mở khóa Kỹ năng nhánh trước!");
                return;
            }

            let cost = TALENT_INFO[skillName].cost;
            if (talentPoints < cost) {
                showDarkFantasyAlert(`Không đủ điểm! Cần ${cost} điểm Thiên Phú.`);
                return;
            }

            // Tiến hành mở khóa qua API
            await unlockTalentAPI(skillName);
        });
    });

    // Xử lý Click vào Ô Xuất Chiến để THÁO kỹ năng ra
    equipSlots.forEach((slot, index) => {
        slot.addEventListener('click', () => {
            if (equippedSkills[index] !== null) {
                equippedSkills[index] = null; // Tháo kỹ năng
                renderTalentTree();
                saveEquippedSkillsAPI(); // Lưu lại ngay
            }
        });
    });

    // ==========================================
    // CÁC HÀM GỌI API CHO THIÊN PHÚ
    // ==========================================
    async function unlockTalentAPI(skillName) {
        let playerId = localStorage.getItem('playerId') || '1';
        try {
            const response = await fetch('http://127.0.0.1:8000/api/talents/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, node: skillName })
            });
            const data = await response.json();

            if (data.status === 'success') {
                talentPoints = data.talent_points; // Cập nhật lại điểm từ Server trả về
                unlockedNodes.push(skillName);
                showDarkFantasyAlert("Mở khóa kỹ năng thành công!");
                renderTalentTree();
            } else {
                showDarkFantasyAlert(data.message);
            }
        } catch (error) {
            console.error("Lỗi khi mở khóa:", error);
            showDarkFantasyAlert("Lỗi hệ thống khi mở khóa!");
        }
    }

    async function saveEquippedSkillsAPI() {
        let playerId = localStorage.getItem('playerId') || '1';
        try {
            await fetch('http://127.0.0.1:8000/api/talents/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, equipped_skills: equippedSkills })
            });
        } catch (error) {
            console.error("Lỗi khi lưu kỹ năng xuất chiến:", error);
        }
    }

    const astrolabeScreen = document.getElementById('astrolabe-screen');
    const btnCloseAstrolabe = document.getElementById('btn-close-astrolabe');
    const astroCore = document.getElementById('astro-core');

    buildingAstrolabe.addEventListener('click', async () => {
        window.playHomeClickSound();

        await loadInventoryFromServer();

        if (typeof window.renderRuneInventory === 'function') {
            window.renderRuneInventory();
        }

        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            astrolabeScreen.style.display = 'flex';
            setTimeout(() => { astrolabeScreen.style.opacity = '1'; }, 50);
            setTimeout(() => {
                if (window.setupAstroCoreTooltip) {
                    window.setupAstroCoreTooltip();
                }
            }, 100);
        }, 500);
    });

    btnCloseAstrolabe.addEventListener('click', () => {
        astrolabeScreen.style.opacity = '0';
        
        setTimeout(() => {
            astrolabeScreen.style.display = 'none';
            homeScreen.style.display = 'flex';
            
            setTimeout(() => { 
                homeScreen.style.opacity = '1'; 
            }, 50);
        }, 500);
    });

    // SỰ KIỆN CLICK ĐỂ ĐỘT PHÁ LÕI SAO
    if (astroCore) {
        astroCore.addEventListener('click', async () => {
            let currentLevel = window.playerData ? (window.playerData.level_star || 1) : 1; 
            
            if (currentLevel >= 10) {
                return showDarkFantasyAlert("Lõi Sao đã đạt đến cảnh giới tối thượng, không thể hấp thụ thêm năng lượng!");
            }

            let slots = ['astro_red', 'astro_blue', 'astro_green', 'astro_purple'];
            let equippedRunes = slots.map(s => equippedItems[s]).filter(r => r != null);

            if (equippedRunes.length < 4) {
                return showDarkFantasyAlert("Cần khảm đủ 4 rãnh Tinh Thạch để Đột phá!");
            }

            let hasWrongLevel = equippedRunes.some(r => r.upgrade_level !== currentLevel);
            if (hasWrongLevel) {
                return showDarkFantasyAlert(`Lõi Sao level ${currentLevel} yêu cầu 4 viên Tinh Thạch level ${currentLevel} để hấp thụ!`);
            }

            let costConfig = {
                1: { id: 220, amount: 10, name: "Bụi Tinh Tú" },
                2: { id: 220, amount: 20, name: "Bụi Tinh Tú" },
                3: { id: 220, amount: 30, name: "Bụi Tinh Tú" },
                4: { id: 220, amount: 50, name: "Bụi Tinh Tú" },
                5: { id: 220, amount: 80, name: "Bụi Tinh Tú" },
                6: { id: 220, amount: 120, name: "Bụi Tinh Tú" },
                7: { id: 221, amount: 10, name: "Tinh Chất Ngân Hà" },
                8: { id: 221, amount: 25, name: "Tinh Chất Ngân Hà" },
                9: { id: 221, amount: 50, name: "Tinh Chất Ngân Hà" }
            };
            
            let reqCost = costConfig[currentLevel];
            // Đếm số lượng tài nguyên hiện có trong túi (myInventory)
            let currentMaterialCount = myInventory.filter(i => i.item_id === reqCost.id).reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            if (currentMaterialCount < reqCost.amount) {
                return showDarkFantasyAlert(`Bạn cần có ít nhất ${reqCost.amount} ${reqCost.name} để Đột phá! Hãy đi phân giải trang bị để kiếm thêm.`);
            }

            try {
                let playerId = localStorage.getItem('playerId') || 1;
                showDarkFantasyAlert("Đang tiến hành dung hợp năng lượng...");
                
                const response = await fetch('http://127.0.0.1:8000/api/astrolabe/upgrade-core', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_id: playerId })
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    showDarkFantasyAlert("ĐỘT PHÁ THÀNH CÔNG! Năng lượng đã được hấp thụ.");

                    if (typeof window.fetchPlayerData === 'function') window.fetchPlayerData();
                    
                    await loadInventoryFromServer(); 
                    
                    if (typeof window.renderRuneInventory === 'function') {
                        window.renderRuneInventory();
                    }

                    if (typeof window.updateStatsUI === 'function') {
                        window.updateStatsUI();
                    }
                } else {
                    showDarkFantasyAlert(data.message || "Đột phá thất bại!");
                }
            } catch (err) {
                console.error(err);
                showDarkFantasyAlert("Lỗi kết nối đến Tháp Tinh Tú!");
            }
        });
    }

    // ==========================================
    // HỆ THỐNG KHO ĐỒ (INVENTORY SYSTEM)
    // ==========================================
    const inventoryModal = document.getElementById('inventory-modal');
    const closeInventory = document.getElementById('close-inventory');

    const invGrid = document.getElementById('inventory-grid');
    const invSearch = document.getElementById('inv-search');
    const invSort = document.getElementById('inv-sort');
    const invFilter = document.getElementById('inv-filter');
    
    // Nút phân trang
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('page-info');
    let currentPage = 1;
    const itemsPerPage = 49;

    function openInventoryModal(tabIdToClick) {
        inventoryModal.style.display = 'flex'; 
        loadInventoryFromServer(); 
        
        setTimeout(() => {
            let tabBtn = document.getElementById(tabIdToClick);
            if (tabBtn) tabBtn.click();
        }, 50);
    }

    buildingInventory.addEventListener('click', () => {
        window.playHomeClickSound();
        openInventoryModal('tab-equip-btn');
    });

    buildingForge.addEventListener('click', () => {
        window.playHomeClickSound();
        openInventoryModal('tab-forge-btn');
    });

    buildingPet.addEventListener('click', () => {
        window.playHomeClickSound();
        openInventoryModal('tab-pet-btn');
    });

    // ==========================================
    // LOGIC CHUYỂN TAB TRANG BỊ & GHÉP ĐỒ
    // ==========================================
    const tabEquipBtn = document.getElementById('tab-equip-btn');
    const tabForgeBtn = document.getElementById('tab-forge-btn');
    const tabPetBtn = document.getElementById('tab-pet-btn');

    const viewEquip = document.getElementById('view-equip');
    const viewForge = document.getElementById('view-forge');
    const viewPet = document.getElementById('view-pet');

    let currentTab = 'equip';
    let forgeItems = [];

    let currentForgeMode = 'merge'; // 'merge' hoặc 'upgrade'
    let upgradeItem = null;

    // Dữ liệu cường hóa
    const UPGRADE_RATES = [100, 95, 90, 80, 60, 40, 30, 20, 10, 5];
    const UPGRADE_COSTS = [
        { gold: 1000, blood: 1 }, { gold: 2500, blood: 2 }, { gold: 5000, blood: 3 },
        { gold: 10000, blood: 5 }, { gold: 20000, blood: 8 }, { gold: 35000, blood: 12 },
        { gold: 55000, blood: 15 }, { gold: 100000, blood: 20 }, { gold: 250000, blood: 30 }, { gold: 500000, blood: 50 }
    ];

    function getUpgradeColor(level) {
        if (level >= 8) return '#ffd700'; // Vàng
        if (level >= 5) return '#c0c0c0'; // Bạc
        if (level >= 1) return '#cd7f32'; // Đồng
        return '#000000';
    }

    function returnAllForgeItemsToBalo() {
        let hasChanged = false;
        
        // 1. Trả đồ từ bảng Ghép đồ
        if (typeof forgeItems !== 'undefined' && forgeItems.length > 0) {
            // Rút từng món trong lò ra và ném vào Balo (Dùng lại logic gộp đồ)
            while(forgeItems.length > 0) {
                let item = forgeItems.pop();
                let isStackable = (item.slot === 'material' || item.slot === 'food' || item.slot === 'rune' || item.type === 'rune');
                
                if (isStackable) {
                    let existingStack = myInventory.find(invItem => 
                        invItem.item_id === item.item_id && 
                        invItem.upgrade_level === item.upgrade_level && 
                        invItem.quantity < 50
                    );

                    if (existingStack) {
                        existingStack.quantity += 1;
                        if (!existingStack.stacked_ids) existingStack.stacked_ids = [];
                        existingStack.stacked_ids.push(item.id);
                    } else {
                        item.quantity = 1;
                        item.stacked_ids = [item.id];
                        myInventory.push(item);
                    }
                } else {
                    myInventory.push(item);
                }
            }
            renderForge();
            hasChanged = true;
        }
        
        // 2. Trả đồ từ bảng Cường hóa
        if (typeof upgradeItem !== 'undefined' && upgradeItem !== null) {
            myInventory.push(upgradeItem);
            upgradeItem = null;
            renderUpgradeUI();
            hasChanged = true;
        }
        
        // 3. Render lại balo nếu có đồ trả về
        if (hasChanged) {
            renderInventory();
        }
    }

    if (tabPetBtn) {
        tabPetBtn.addEventListener('click', () => {
            returnAllForgeItemsToBalo();
            
            if (invFilter) {
                invFilter.value = 'food';
                renderInventory();
            }

            currentTab = 'pet';
            tabEquipBtn.classList.remove('active');
            tabForgeBtn.classList.remove('active');
            tabPetBtn.classList.add('active');

            viewEquip.style.display = 'none';
            viewForge.style.display = 'none';
            viewPet.style.display = 'block';

            renderPetUI();
        });
    }

    tabEquipBtn.addEventListener('click', () => {
        if (invFilter) {
            invFilter.value = 'equip';
            renderInventory();
        }

        currentTab = 'equip';
        tabEquipBtn.classList.add('active');
        tabForgeBtn.classList.remove('active');
        tabPetBtn.classList.remove('active');

        viewEquip.style.display = 'flex'; 
        viewForge.style.display = 'none';
        viewPet.style.display = 'none';

        returnAllForgeItemsToBalo();
    });

    tabForgeBtn.addEventListener('click', () => {
        if (invFilter) {
            invFilter.value = 'equip';
            renderInventory();
        }

        currentTab = 'forge';
        tabForgeBtn.classList.add('active');
        tabEquipBtn.classList.remove('active');
        tabPetBtn.classList.remove('active');

        viewForge.style.display = 'flex'; 
        viewEquip.style.display = 'none';
        viewPet.style.display = 'none';
    });

    const RARITY_CONFIG = {
        'F': { color: '#ffffff', weight: 1, name: 'Thường' },
        'E': { color: '#00ff00', weight: 2, name: 'Ưu Tú' },
        'D': { color: '#00aaff', weight: 3, name: 'Hiếm' },
        'C': { color: '#a335ee', weight: 4, name: 'Cực Hiếm' },
        'B': { color: '#ffd700', weight: 5, name: 'Sử Thi' },
        'A': { color: '#ff0000', weight: 6, name: 'Huyền Thoại' },
        'S': { color: '#000000', weight: 7, name: 'Thần Thoại' }
    };

    // 8 chỉ số ban đầu của người chơi
    const STAT_NAMES = { 
        hp: '+ Máu tối đa', atk: '+ Tấn công', hpRegen: '+ Hồi máu/s', dodge: '+ Tỉ lệ né (%)',
        critRate: '+ Tỉ lệ Chí mạng (%)', critDamage: '+ ST Chí mạng (%)', lifesteal: '+ Hút máu (%)', speed: '+ Tốc độ chạy'
    };
    const BASE_STATS = { 
        hp: 1000, hpRegen: 5, atk: 50, dodge: 5, 
        critRate: 5, critDamage: 150, lifesteal: 0, speed: 200 
    };

    let equippedItems = { head: null, chest: null, legs: null, weapon: null, accessory: null, shoes: null };
    let myInventory = [];

    // HÀM TẢI KHO ĐỒ TỪ BACKEND
    async function loadInventoryFromServer() {
        try {
            let playerId = localStorage.getItem('playerId');

            if (playerId.includes(':')) {
                playerId = playerId.split(':')[0];
                localStorage.setItem('playerId', playerId);
            }

            const response = await fetch(`http://127.0.0.1:8000/api/inventory/${playerId}`);
            const data = await response.json();

            if (data.status === 'success') {
                myInventory = [];
                equippedItems = { head: null, chest: null, legs: null, weapon: null, accessory: null, shoes: null };
                
                // Trả các ô trên người về trạng thái "Trống" trước khi mặc đồ mới
                document.querySelectorAll('.equip-slot').forEach(slot => {
                    let slotName = slot.getAttribute('data-slot');
                    if (!slotName || slotName === 'pet') return;
                    if (slotName === 'pet') return;
                    const slotLabels = { head: 'Mũ', chest: 'Áo', legs: 'Quần', weapon: 'Vũ khí', accessory: 'Bổ trợ', shoes: 'Giày' };
                    slot.innerHTML = `<span class="slot-label" style="opacity: 0.5">${slotLabels[slotName]}</span>`;
                    slot.style.borderColor = '#555';
                    slot.style.boxShadow = 'none';
                    slot.style.animation = 'none';
                    slot.removeAttribute('data-tooltip');
                });

                // Trả các ô khảm Tinh Thạch (astro-slot) về trạng thái "Trống" trước khi vẽ lại
                document.querySelectorAll('.astro-slot').forEach(slot => {
                    slot.innerHTML = `<span class="slot-label-rune">Trống</span>`;
                    slot.classList.remove('filled');
                    slot.removeAttribute('data-player-item-id');
                    slot.removeAttribute('data-tooltip');
                });

                let materialsMap = {};
                let otherItems = [];

                // Phân loại đồ Backend trả về
                data.items.forEach(item => {
                    // Chuyển đổi định dạng cho khớp với chuẩn Frontend
                    let frontendItem = {
                        id: item.id, // ID của player_items (độc nhất)
                        item_id: item.item_id, // ID gốc
                        name: item.name,
                        slot: item.slot || item.type,
                        type: item.type,
                        rarity: item.rarity,
                        stats: item.stats,
                        icon: item.icon,
                        upgrade_level: item.upgrade_level || 0
                    };

                    // 1. ÁP DỤNG HỆ SỐ NHÂN CHO TRANG BỊ (LOẠI TRỪ ĐÁ RUNE)
                    if (frontendItem.upgrade_level > 0 && frontendItem.slot !== 'rune') {
                        const STAT_MULTIPLIERS = {
                            1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.6, 
                            6: 1.7, 7: 1.9, 8: 2.2, 9: 2.5, 10: 3
                        };

                        let statMultiplier = STAT_MULTIPLIERS[frontendItem.upgrade_level] || 1;
                        
                        for (let statKey in frontendItem.stats) {
                            let baseValue = frontendItem.stats[statKey];
                            frontendItem.stats[statKey] = Math.round(baseValue * statMultiplier);
                        }
                    } 
                    // 2. CÔNG THỨC NHÂN CHỈ SỐ DÀNH RIÊNG CHO ĐÁ RUNE
                    else if (frontendItem.upgrade_level > 1 && frontendItem.slot === 'rune') {
                        const RUNE_MULTIPLIERS = {
                            1: 1.0, 2: 1.5, 3: 2.0, 4: 2.6, 5: 3.3, 
                            6: 4.1, 7: 5.0, 8: 6.0, 9: 7.2, 10: 8.5
                        };

                        let runeMultiplier = RUNE_MULTIPLIERS[frontendItem.upgrade_level] || 1;

                        for (let statKey in frontendItem.stats) {
                            let baseValue = frontendItem.stats[statKey];
                            frontendItem.stats[statKey] = Math.round(baseValue * runeMultiplier);
                        }
                    }

                    if (item.is_equipped == 1 && frontendItem.slot === 'rune') {
                        // RUNE ĐANG KHẢM: không có cột equipped_slot trong DB,
                        // nên ta suy ra màu/rãnh trực tiếp từ item_id (mỗi item_id rune = 1 màu cố định).
                        const RUNE_COLORS_BY_ID = { 222: 'red', 223: 'purple', 224: 'green', 225: 'blue' };
                        let runeColor = RUNE_COLORS_BY_ID[frontendItem.item_id];

                        if (runeColor) {
                            equippedItems['astro_' + runeColor] = frontendItem;

                            // Vẽ lên đúng ô khảm tương ứng trên Tháp Tinh Tú
                            let astroSlotDiv = document.querySelector(`.astro-slot[data-color="${runeColor}"][data-index="1"]`);
                            if (astroSlotDiv) {
                                astroSlotDiv.innerHTML = `<img src="../assets/items/${frontendItem.icon}" style="width: 50px; height: 50px; object-fit: contain;">`;
                                astroSlotDiv.classList.add('filled');
                                astroSlotDiv.setAttribute('data-player-item-id', frontendItem.id);
                                astroSlotDiv.setAttribute('data-tooltip', buildTooltip(frontendItem));
                            }
                        }
                    } else if (item.is_equipped == 1) {
                        equippedItems[frontendItem.slot] = frontendItem;
                        
                        // Đổi sang dùng thẻ img
                        let imagePath = `../assets/items/${frontendItem.icon}`;

                        // Vẽ trực tiếp lên nhân vật
                        let slotDiv = document.getElementById(`slot-${frontendItem.slot}`);
                        let itemColor = RARITY_CONFIG[item.rarity].color;
                        let rankTextColor = itemColor;
                        let textShadow = '';
                        let plusText = '';

                        // Chỉ đổi màu con số +X, giữ nguyên màu viền trắng cho bậc S
                        if (item.rarity === 'S') {
                            let lvl = item.upgrade_level || 0;
                            let textColor = getUpgradeColor(lvl); // Gọi màu cho riêng chữ
                            
                            if (lvl > 0) {
                                plusText = `<span style="position: absolute; bottom: 15px; right: 4px; font-size: 13px; color:${textColor}; font-weight:bold; text-shadow: 1px 1px 2px #000;">+${lvl}</span>`;
                            }
                            
                            textShadow = 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;';
                            itemColor = '#ffffff';
                            rankTextColor = '#000000';
                        }                                              

                        slotDiv.innerHTML = `<img src="${imagePath}" alt="${frontendItem.name}" style="width: 40px; height: 40px; object-fit: contain;">
                                            <span class="item-rank" style="color: ${rankTextColor}; ${textShadow}">${frontendItem.rarity}</span>
                                            ${plusText}`;
                        slotDiv.style.borderColor = itemColor;
                        slotDiv.setAttribute('data-tooltip', buildTooltip(frontendItem));
                        if(frontendItem.rarity === 'S') slotDiv.style.animation = 's-tier-breathing 2s ease-in-out infinite';
                    } else {
                        // ==========================================
                        // TÁCH NGUYÊN LIỆU VÀ TRANG BỊ
                        // ==========================================
                        if (frontendItem.slot === 'material' || frontendItem.slot === 'food' || frontendItem.slot === 'rune' || frontendItem.type === 'rune') {
                            // Tạo khóa gộp: ID gốc + Cấp độ (VD: Tinh Thạch Đỏ cấp 2 sẽ là "302_2")
                            let level = frontendItem.upgrade_level || 0;
                            let stackKey = `${frontendItem.item_id}_${level}`;

                            if (!materialsMap[stackKey]) materialsMap[stackKey] = [];
                            materialsMap[stackKey].push(frontendItem);
                        } else {
                            otherItems.push(frontendItem); 
                        }
                    }
                });

                let groupedStackables = [];

                for (let stackKey in materialsMap) {
                    let itemsOfThisTypeAndLevel = materialsMap[stackKey];
                    while (itemsOfThisTypeAndLevel.length > 0) {
                        let chunk = itemsOfThisTypeAndLevel.splice(0, 50); // Cắt 50 phần tử
                        let stackItem = { ...chunk[0] };     // Lấy 1 món làm đại diện hiển thị
                        stackItem.quantity = chunk.length;   // Gắn số lượng (1 đến 50)
                        
                        // Lưu mảng ID gốc để sau này API trừ vật phẩm có thể trừ chính xác
                        stackItem.stacked_ids = chunk.map(i => i.id); 
                        
                        groupedStackables.push(stackItem);
                    }
                }

                myInventory = [...groupedStackables, ...otherItems];

                // Cập nhật lại UI
                updateStatsUI();
                updateCharacterAura();
                renderInventory();
            }
        } catch (error) {
            console.error("Lỗi kết nối Server:", error);
            showDarkFantasyAlert("Mất kết nối đến máy chủ!");
        }
    }

    closeInventory.addEventListener('click', () => { 
        inventoryModal.style.display = 'none'; 

        returnAllForgeItemsToBalo();
        
        // Bật lại tương tác cho TẤT CẢ các scene đang chạy (Tránh lỗi liệt phím)
        if (typeof window.game !== 'undefined') {
            window.game.scene.scenes.forEach(scene => {
                if (scene.sys.isActive() && scene.input) {
                    scene.input.enabled = true; 
                    if (scene.moveState) {
                        scene.moveState.up = false;
                        scene.moveState.down = false;
                        scene.moveState.left = false;
                        scene.moveState.right = false;
                    }
                }
            });
        }
    });

    async function toggleEquipment(playerItemId, action) {
        try {
            let playerId = localStorage.getItem('playerId') || '1';
            
            const response = await fetch(`http://127.0.0.1:8000/api/equipment/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player_id: playerId,
                    player_item_id: playerItemId,
                    action: action // 'equip' hoặc 'unequip'
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                await loadInventoryFromServer();
            } else {
                showDarkFantasyAlert("Không thể thao tác trang bị!");
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
        }
    }

    function updateStatsUI() {
        // GIỎ 1: CHỈ SỐ CỘNG THẲNG (FLAT)
        let flatStats = { ...BASE_STATS };
        // GIỎ 2: CHỈ SỐ PHẦN TRĂM (%) - Mặc định là 0%
        let pctStats = { hp: 0, atk: 0, hpRegen: 0, speed: 0, dodge: 0, critRate: 0, critDamage: 0, lifesteal: 0 };

        // 1. CỘNG TRANG BỊ (Chỉ cộng Flat)
        const standardEquipSlots = ['head', 'chest', 'legs', 'weapon', 'accessory', 'shoes'];
        standardEquipSlots.forEach(slot => {
            let item = equippedItems[slot];
            if (item && item.stats) {
                for (let statKey in item.stats) {
                    if(flatStats[statKey] !== undefined) flatStats[statKey] += item.stats[statKey];
                }
            }
        });

        // 2. CỘNG THÚ CƯNG (Chỉ cộng CHỈ SỐ GỐC Flat)
        if (window.equippedPet) {
            let pInfo = window.equippedPet.pet;
            let lvl = window.equippedPet.level;
            flatStats.hp += Math.round(pInfo.base_hp + (lvl - 1) * pInfo.growth_hp);
            flatStats.hpRegen += Math.round(pInfo.base_hp_regen + (lvl - 1) * pInfo.growth_hp_regen);
            flatStats.atk += Math.round(pInfo.base_atk + (lvl - 1) * pInfo.growth_atk);
            flatStats.dodge += Math.round(pInfo.base_dodge + (lvl - 1) * pInfo.growth_dodge);
            flatStats.critRate += Math.round(pInfo.base_crit_rate + (lvl - 1) * pInfo.growth_crit_rate);
            flatStats.critDamage += Math.round(pInfo.base_crit_damage + (lvl - 1) * pInfo.growth_crit_damage);
            flatStats.lifesteal += Math.round(pInfo.base_lifesteal + (lvl - 1) * pInfo.growth_lifesteal);
            flatStats.speed += Math.round(pInfo.base_speed + (lvl - 1) * pInfo.growth_speed);
        }

        // 3. CỘNG TẾ ĐÀN THỨC TỈNH
        if (window.currentAwakeningStats && window.currentAwakeningStats.length === 8) {
            window.currentAwakeningStats.forEach(stat => {
                if (!stat || !stat.id) return;
                let id = stat.id;
                let val = parseFloat(stat.value) || 0;
                
                if (stat.is_flat) {
                    if (flatStats[id] !== undefined) flatStats[id] += val;
                } else {
                    if (pctStats[id] !== undefined) pctStats[id] += val;
                }
            });
        }

        // 4. CỘNG THÁP TINH TÚ (HẤP THỤ + ĐANG KHẢM)
        if (window.playerData && window.playerData.astrolabe_stats) {
            let coreStats = typeof window.playerData.astrolabe_stats === 'string' ? JSON.parse(window.playerData.astrolabe_stats) : window.playerData.astrolabe_stats;
            for (let statKey in coreStats) {
                if (flatStats[statKey] !== undefined) flatStats[statKey] += coreStats[statKey];
                else if (pctStats[statKey] !== undefined) pctStats[statKey] += coreStats[statKey];
            }
        }

        let astroSlots = ['astro_red', 'astro_blue', 'astro_green', 'astro_purple'];
        astroSlots.forEach(slotKey => {
            let rune = equippedItems[slotKey];
            if (rune && rune.stats) {
                for (let statKey in rune.stats) {
                    if (flatStats[statKey] !== undefined) flatStats[statKey] += rune.stats[statKey];
                    else if (pctStats[statKey] !== undefined) pctStats[statKey] += rune.stats[statKey];
                }
            }
        });

        // ==========================================
        // 5. TÍNH CHỈ SỐ TĨNH (TRƯỚC KHI VÀO ẢI) ĐỂ TÍNH LỰC CHIẾN
        // ==========================================
        // Ép % của Tế Đàn, Tinh Thạch vào chỉ số Flat để ra chỉ số tổng hợp cố định
        let staticStats = { ...BASE_STATS };
        
        staticStats.hp = Math.round(flatStats.hp + (flatStats.hp * (pctStats.hp / 100)));
        staticStats.atk = Math.round(flatStats.atk + (flatStats.atk * (pctStats.atk / 100)));
        staticStats.speed = Math.round(flatStats.speed + (flatStats.speed * (pctStats.speed / 100)));
        staticStats.hpRegen = Math.round(flatStats.hpRegen + (flatStats.hpRegen * (pctStats.hpRegen / 100))); 
        
        staticStats.dodge = flatStats.dodge + pctStats.dodge;
        staticStats.critRate = flatStats.critRate + pctStats.critRate;
        staticStats.critDamage = flatStats.critDamage + pctStats.critDamage;
        staticStats.lifesteal = flatStats.lifesteal + pctStats.lifesteal;

        // ==========================================
        // 5.1. TÍNH TOÁN LỰC CHIẾN TỪ BỘ CHỈ SỐ TĨNH NÀY
        // ==========================================
        let combatPower = 0;
        combatPower += staticStats.hp * 5;          // 1 Máu = 5 LC
        combatPower += staticStats.hpRegen * 5;    // 1 Hồi máu = 5 LC
        combatPower += staticStats.atk * 150;         // 1 Tấn công = 150 LC
        combatPower += staticStats.speed * 5;       // 1 Tốc độ = 5 LC
        combatPower += staticStats.dodge * 50;      // 1% Né = 50 LC
        combatPower += staticStats.critRate * 100;   // 1% Tỉ lệ CM = 100 LC
        combatPower += staticStats.critDamage * 100;  // 1% ST CM = 100 LC
        combatPower += staticStats.lifesteal * 80;  // 1% Hút máu = 80 LC

        let cpElement = document.getElementById('player-combat-power');
        if (cpElement) cpElement.textContent = Math.round(combatPower).toLocaleString('en-US');

        // ==========================================
        // 6. ĐỌC BUFF ĐỘNG TỪ TRẬN CHIẾN
        // (Đoạn này nằm sau Lực Chiến nên Lực chiến sẽ không bị ảnh hưởng)
        // ==========================================
        if (window.equippedPet) {
            let pInfo = window.equippedPet.pet;
            let lvl = window.equippedPet.level;
            let activeScene = window.game && window.game.scene.isActive('CampaignScene') ? window.game.scene.getScene('CampaignScene') : null;
            
            if (activeScene && activeScene.player) {                
                let dynamicBuffs = getPetDynamicBuffs(activeScene, pInfo.pet_code, lvl);

                pctStats.lifesteal += (dynamicBuffs.lifesteal || 0);
                pctStats.hpRegen += (dynamicBuffs.hpRegen || 0); 
                pctStats.atk += (dynamicBuffs.atkPercent || 0); 
                pctStats.critRate += (dynamicBuffs.critRate || 0);
                pctStats.dodge += (dynamicBuffs.dodge || 0);

                if (activeScene.player && activeScene.player.speedMultiplier) {
                    pctStats.speed += ((activeScene.player.speedMultiplier - 1) * 100); 
                }
            }
        }

        // ==========================================
        // 7. TÍNH TOÁN LẠI LẦN CUỐI ĐỂ HIỂN THỊ RA GIAO DIỆN (Đã gồm buff Pet)
        // ==========================================
        let finalStats = { ...BASE_STATS };
        finalStats.hp = Math.round(flatStats.hp + (flatStats.hp * (pctStats.hp / 100)));
        finalStats.atk = Math.round(flatStats.atk + (flatStats.atk * (pctStats.atk / 100)));
        finalStats.speed = Math.round(flatStats.speed + (flatStats.speed * (pctStats.speed / 100)));
        finalStats.hpRegen = Math.round(flatStats.hpRegen + (flatStats.hpRegen * (pctStats.hpRegen / 100))); 
        
        finalStats.dodge = (flatStats.dodge + pctStats.dodge).toFixed(1);
        finalStats.critRate = (flatStats.critRate + pctStats.critRate).toFixed(1);
        finalStats.critDamage = (flatStats.critDamage + pctStats.critDamage).toFixed(1);
        finalStats.lifesteal = (flatStats.lifesteal + pctStats.lifesteal).toFixed(1);

        window.playerStats = { ...finalStats };

        // HIỂN THỊ CHỈ SỐ RA GIAO DIỆN
        document.getElementById('stat-hp').textContent = finalStats.hp;
        document.getElementById('stat-hpRegen').textContent = finalStats.hpRegen;
        document.getElementById('stat-atk').textContent = finalStats.atk;
        document.getElementById('stat-dodge').textContent = finalStats.dodge + '%';
        if(document.getElementById('stat-critRate')) document.getElementById('stat-critRate').textContent = finalStats.critRate + '%';
        if(document.getElementById('stat-critDamage')) document.getElementById('stat-critDamage').textContent = finalStats.critDamage + '%';
        if(document.getElementById('stat-lifesteal')) document.getElementById('stat-lifesteal').textContent = finalStats.lifesteal + '%';
        if(document.getElementById('stat-speed')) document.getElementById('stat-speed').textContent = finalStats.speed;
    }
    window.updateStatsUI = updateStatsUI;
    updateStatsUI();

    // ==========================================
    // HIỆU ỨNG VÒNG HÀO QUANG SAU LƯNG
    // ==========================================
    function updateCharacterAura() {
        // 1. Lọc ra các cấp độ cường hóa của đồ Bậc S đang mặc
        let upgradedLevels = [];
        for (let slot in equippedItems) {
            let item = equippedItems[slot];
            if (item && item.rarity === 'S' && item.upgrade_level > 0) {
                upgradedLevels.push(item.upgrade_level);
            }
        }

        // 2. Sắp xếp giảm dần và lấy tối đa 3 cấp cao nhất
        upgradedLevels.sort((a, b) => b - a);
        let top3Levels = upgradedLevels.slice(0, 3);

        top3Levels.sort((a, b) => a - b);

        // 3. Tìm hoặc tạo container chứa Hào quang (Nằm dưới nhân vật)
        const previewContainer = document.querySelector('.char-preview-container');
        let auraContainer = document.getElementById('char-aura-container');
        
        if (!auraContainer) {
            auraContainer = document.createElement('div');
            auraContainer.id = 'char-aura-container';
            auraContainer.style.position = 'absolute';
            auraContainer.style.top = '40%'; 
            auraContainer.style.left = '50%';
            auraContainer.style.transform = 'translate(-50%, -50%)';
            auraContainer.style.zIndex = '0'; 
            
            const charSprite = document.getElementById('char-preview-sprite');
            charSprite.style.position = 'relative';
            charSprite.style.zIndex = '1';
            
            previewContainer.insertBefore(auraContainer, charSprite);
        }

        auraContainer.innerHTML = '';

        // 4. Cấu hình độ to, tốc độ, chiều quay cho tối đa 3 vòng
        const sizes = [140, 170, 200]; // Đường kính tăng dần từ trong ra ngoài
        const speeds = [10, 15, 20];   
        const directions = ['normal', 'reverse', 'normal']; 

        // 5. Vẽ vòng tròn
        top3Levels.forEach((lvl, index) => {
            let color = getUpgradeColor(lvl); 
            let circle = document.createElement('div');
            
            circle.style.position = 'absolute';
            circle.style.top = '50%';
            circle.style.left = '50%';
            circle.style.width = `${sizes[index]}px`;
            circle.style.height = `${sizes[index]}px`;
            circle.style.marginTop = `-${sizes[index] / 2}px`;
            circle.style.marginLeft = `-${sizes[index] / 2}px`;
            
            circle.style.borderRadius = '50%';
            circle.style.border = `3px dashed ${color}`;
            circle.style.boxShadow = `0 0 15px ${color}, inset 0 0 15px ${color}`;
            circle.style.opacity = '0.8';
            
            circle.style.animation = `spin ${speeds[index]}s linear infinite ${directions[index]}`;

            auraContainer.appendChild(circle);
        });
    }

    // TẠO TOOLTIP THỐNG NHẤT
    function buildTooltip(item) {
        let upgradeText = (item.upgrade_level && item.upgrade_level > 0) ? ` +${item.upgrade_level}` : '';
        let tooltip = `[${RARITY_CONFIG[item.rarity].name}] ${item.name.toUpperCase()}${upgradeText}\n`;
        tooltip += `Phẩm chất: Bậc ${item.rarity}\n-------------------\n`;

        // 1. Nếu là THỨC ĂN (food)
        if (item.slot === 'food' || item.type === 'food') {
            let expRates = { 'B': 500, 'A': 2000, 'S': 15000 };
            let exp = expRates[item.rarity] || 0;
            tooltip += `Thức ăn cho Thú Cưng.\n`;
            tooltip += `Kinh nghiệm: +${exp.toLocaleString()}\n`;
            return tooltip.trim();
        }

        // 2. Nếu là NGUYÊN LIỆU ĐẶC BIỆT
        if (item.item_id === 215) { // Hộ Thể Phù
            tooltip += `Bảo vệ trang bị khi Cường hóa thất bại.\n`;
            tooltip += `Dùng cho trang bị từ Cấp +1 đến +6.\n`;
            tooltip += `Ngăn ngừa việc bị tụt cấp.\n`;
            return tooltip.trim();
        }
        if (item.item_id === 216) { // Thánh Hộ Phù
            tooltip += `Bảo vệ Tuyệt đối.\n`;
            tooltip += `Dùng cho trang bị từ Cấp +7 đến +9.\n`;
            tooltip += `Ngăn ngừa việc vỡ đồ (tụt về +0) khi thất bại.\n`;
            return tooltip.trim();
        }
        if (item.item_id === 214) { // Huyết Thạch
            tooltip += `Đá máu dùng để tế lễ trong Lò rèn.\n`;
            tooltip += `Nguyên liệu bắt buộc để Cường hóa trang bị.\n`;
            return tooltip.trim();
        }
        if (item.item_id === 213) { // Trứng thú cưng
            tooltip += `Vật phẩm bí ẩn chứa sinh linh cổ đại.\n`;
            tooltip += `Bấm vào để tiến hành Ấp Trứng.\n`;
            return tooltip.trim();
        }
        if (item.item_id === 212) { // Mảnh Trứng
            tooltip += `Thu thập từ việc đi ải hoặc mua từ thương nhân.\n`;
            tooltip += `Thu thập đủ 10 mảnh để Dung hợp thành 1 quả Trứng hoàn chỉnh.\n`;
            return tooltip.trim();
        }
        if (item.item_id === 220) { 
            tooltip += `Kết tinh từ việc phân giải trang bị rác.\n`;
            tooltip += `Dùng để khơi thông rãnh năng lượng trên Bản Đồ Sao.\n`;
            return tooltip.trim();
        }        
        if (item.item_id === 221) { 
            tooltip += `Vật chất quý giá rớt ra khi đi Ải.\n`;
            tooltip += `Dùng để mở khóa các Điểm Nút Tối Thượng.\n`;
            return tooltip.trim();
        }

        // 3. Nếu là TRANG BỊ BÌNH THƯỜNG (Có chỉ số Máu, ATK...)
        for(let stat in item.stats) {
            if(STAT_NAMES[stat] && item.stats[stat] > 0) {
                let suffix = (['dodge', 'critRate', 'critDamage', 'lifesteal'].includes(stat)) ? '%' : '';
                tooltip += `${STAT_NAMES[stat]}: ${item.stats[stat]}${suffix}\n`;
            }
        }

        return tooltip.trim();
    }

    // CLICK ĐỂ MẶC TRANG BỊ
    async function equipItem(item) {
        if (item.slot === 'material' || item.slot === 'food' || item.slot === 'rune' || item.type === 'rune') {
            showDarkFantasyAlert("Vật phẩm này không thể mặc trực tiếp lên người!");
            return;
        }
        
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể mặc trang bị khi đang Vượt Ải!");
            return;
        }

        await toggleEquipment(item.id, 'equip');
    }

    // DOUBLE CLICK ĐỂ THÁO TRANG BỊ
    document.querySelectorAll('.equip-slot').forEach(slotDiv => {
        slotDiv.addEventListener('click', async () => {
            let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
            if (isCampaignActive) {
                showDarkFantasyAlert("Không thể tháo trang bị khi đang Vượt Ải!");
                return;
            }

            let slotName = slotDiv.getAttribute('data-slot');
            let item = equippedItems[slotName];
            if (item) {
                await toggleEquipment(item.id, 'unequip');
            }
        });
    });

    // VẼ BALO & PHÂN TRANG
    function renderInventory() {
        invGrid.innerHTML = ''; 
        let keyword = invSearch.value.toLowerCase();
        let sortMode = invSort.value;
        let filterMode = invFilter ? invFilter.value : 'all';

        let filteredItems = myInventory.filter(item => {
            let matchSearch = item.name.toLowerCase().includes(keyword);
            let matchFilter = true;
            
            if (filterMode === 'equip') {
                matchFilter = item.slot !== 'material' && item.slot !== 'food' && item.slot !== 'rune' && item.type !== 'rune';
            } else if (filterMode === 'material') {
                matchFilter = item.slot === 'material';
            } else if (filterMode === 'food') {
                matchFilter = item.slot === 'food';
            } else if (filterMode === 'rune') {
                matchFilter = item.slot === 'rune' || item.type === 'rune';
            }

            return matchSearch && matchFilter;
        });

        filteredItems.sort((a, b) => {
            let isRuneA = (a.slot === 'rune' || a.type === 'rune');
            let isRuneB = (b.slot === 'rune' || b.type === 'rune');
            
            if (isRuneA && isRuneB) {
                if (a.item_id !== b.item_id) {
                    return a.item_id - b.item_id; 
                }

                return (b.upgrade_level || 0) - (a.upgrade_level || 0); 
            }

            if (sortMode === 'name') return a.name.localeCompare(b.name);
            if (sortMode === 'rarity') return RARITY_CONFIG[b.rarity].weight - RARITY_CONFIG[a.rarity].weight;
        });

        // Xử lý Phân Trang
        let totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let pageItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

        // Cập nhật text hiển thị trang
        pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
        btnPrevPage.disabled = currentPage === 1;
        btnNextPage.disabled = currentPage === totalPages;

        pageItems.forEach(item => {
            let rankInfo = RARITY_CONFIG[item.rarity];
            let div = document.createElement('div');
            div.className = 'inv-item';

            // Tạo hiệu ứng viền trắng phát sáng độc quyền cho bậc S
            let itemColor = RARITY_CONFIG[item.rarity].color;
            let rankTextColor = itemColor;
            let textShadow = '';
            let plusText = '';

            // Chỉ đổi màu con số +X, giữ nguyên màu viền trắng cho bậc S
            if (item.rarity === 'S') {
                let lvl = item.upgrade_level || 0;
                let textColor = getUpgradeColor(lvl); // Gọi màu cho riêng chữ
                
                if (lvl > 0) {
                    plusText = `<span style="position: absolute; bottom: 15px; right: 4px; font-size: 13px; color:${textColor}; font-weight:bold; text-shadow: 1px 1px 2px #000;">+${lvl}</span>`;
                }
                
                textShadow = 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;';
                itemColor = '#ffffff';
                rankTextColor = '#000000';
            }
            
            // Đổi sang dùng thẻ img
            let imagePath = `../assets/items/${item.icon}`;

            // ==========================================
            // THÊM LOGIC HIỂN THỊ NHÃN SỐ LƯỢNG
            // ==========================================
            let qtyHtml = '';
            if (item.quantity && item.quantity > 1) {
                qtyHtml = `<div style="position: absolute; top: -5px; left: -5px; font-size: 12px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.85); padding: 2px 5px; border-radius: 6px; border: 1px solid #ffcc00; z-index: 5;">x${item.quantity}</div>`;
            }

            div.innerHTML = `${qtyHtml}
                            <img src="${imagePath}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: contain;">
                            <span class="item-rank" style="color: ${rankTextColor}; ${textShadow}">${item.rarity}</span>
                            ${plusText}`;
            
            div.setAttribute('data-tooltip', buildTooltip(item));
            div.style.borderColor = itemColor;
            if(item.rarity === 'S') { div.style.animation = 's-tier-breathing 2s ease-in-out infinite'; }

            // SỰ KIỆN CLICK ĐỘNG (Dựa theo Tab hiện tại)
            div.addEventListener('click', () => {
                let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');

                if (item.item_id === 213) {
                    
                    if (isCampaignActive) {
                        showDarkFantasyAlert("Không thể ấp trứng khi đang Vượt Ải!");
                        return;
                    }

                    document.getElementById('hatch-modal').style.display = 'flex';
                    return;
                }

                if (item.item_id === 212) {
                    if (isCampaignActive) return showDarkFantasyAlert("Không thể ghép trứng khi đang Vượt Ải!");
                    
                    // Tính tổng tất cả mảnh trứng đang có trong Balo
                    let totalPieces = myInventory.filter(i => i.item_id === 212).reduce((sum, i) => sum + (i.quantity || 1), 0);
                    
                    if (totalPieces >= 10) {
                        let eggsToMake = Math.floor(totalPieces / 10);
                        document.getElementById('merge-total-pieces').innerText = totalPieces;
                        document.getElementById('merge-total-eggs').innerText = eggsToMake;
                        document.getElementById('merge-modal').style.display = 'flex';
                    } else {
                        showDarkFantasyAlert(`Bạn mới có ${totalPieces}/10 Mảnh Trứng. Đánh Boss để kiếm thêm!`);
                    }
                    return;
                }

                if (currentTab === 'equip') {
                    equipItem(item);
                } else if (currentTab === 'forge') {
                    if (currentForgeMode === 'merge' || currentForgeMode === 'dismantle') {
                        addToForge(item);
                    } else if (currentForgeMode === 'upgrade') {
                        // Logic bỏ vào đe cường hóa
                        if (item.slot === 'rune' || item.type === 'rune') {
                            showDarkFantasyAlert("Không thể cường hóa Tinh Thạch!");
                            return;
                        }
                        if (item.rarity !== 'S' || item.slot === 'material' || item.slot === 'food') {
                            return showDarkFantasyAlert("Chỉ trang bị Bậc S mới có thể Cường Hóa!");
                        }
                        if (window.game && window.game.scene.isActive('CampaignScene')) {
                            return showDarkFantasyAlert("Không thể cường hóa khi đang vượt ải!");
                        }
                        if ((item.upgrade_level || 0) >= 10) {
                            return showDarkFantasyAlert("Trang bị đã đạt cấp tối thượng (+10)!");
                        }
                        
                        // Đẩy đồ cũ (nếu có) về túi, đưa đồ mới lên
                        if (upgradeItem) myInventory.push(upgradeItem);
                        upgradeItem = item;
                        myInventory = myInventory.filter(i => i.id !== item.id);
                        
                        renderUpgradeUI();
                        renderInventory();
                    }
                }
            });

            // SỰ KIỆN NHẤP ĐÚP (Dùng để CHO PET ĂN)
            div.addEventListener('dblclick', () => {
                if (currentTab === 'pet') {
                    let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
                    if (isCampaignActive) {
                        showDarkFantasyAlert("Không thể cho ăn khi đang Vượt Ải!");
                        return;
                    }

                    if (item.slot !== 'food'){
                        showDarkFantasyAlert("Vật phẩm này không phải là Thức ăn Thú cưng!");
                        return;
                    }

                    if (!currentSelectedPet) {
                        showDarkFantasyAlert("Vui lòng chọn Thú cưng trước!");
                        return;
                    }                   
                    
                    // Bật Popup xác nhận cho ăn
                    document.getElementById('feed-modal').style.display = 'flex';
                    document.getElementById('feed-pet-name').innerText = currentSelectedPet.pet.name;
                    
                    let feedNameEl = document.getElementById('feed-item-name');
                    feedNameEl.innerText = `[Bậc ${item.rarity}] ${item.name}`;
                    feedNameEl.style.color = rankInfo.color;
                    
                    if (item.rarity === 'S') {
                        feedNameEl.style.textShadow = '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 10px #ffffff';
                    } else {
                        feedNameEl.style.textShadow = 'none'; 
                    }
                    
                    // Tính EXP cho 1 cái duy nhất
                    let expRates = { 'B': 500, 'A': 2000, 'S': 15000 };
                    let expPerItem = expRates[item.rarity] || 0;
                    
                    document.getElementById('feed-exp-amount').innerText = expPerItem.toLocaleString();
                    
                    // Lấy index 0 (ID đầu tiên) trong mảng stacked_ids để API chỉ trừ 1 cái
                    window.pendingFeedItemIds = item.stacked_ids ? [item.stacked_ids[0]] : [item.id];
                }
            });
            invGrid.appendChild(div);
        });

        // Điền đầy chữ Trống
        for(let i = pageItems.length; i < itemsPerPage; i++) {
            let emptyDiv = document.createElement('div');
            emptyDiv.className = 'inv-item';
            emptyDiv.innerHTML = `<span class="slot-label" style="opacity: 0.2">Trống</span>`;
            invGrid.appendChild(emptyDiv);
        }
    }

    invSearch.addEventListener('input', () => { currentPage = 1; renderInventory(); });
    invSort.addEventListener('change', () => { currentPage = 1; renderInventory(); });
    if(invFilter) invFilter.addEventListener('change', () => { currentPage = 1; renderInventory(); });

    // Nút điều khiển Lật trang
    btnPrevPage.addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderInventory(); } });
    btnNextPage.addEventListener('click', () => { currentPage++; renderInventory(); });

    // ==========================================
    // LOGIC LÒ RÈN (BỎ VÀO LÒ & RÚT RA)
    // ==========================================
    function addToForge(item) {
        if (item.slot === 'material'|| item.slot === 'food') {
            showDarkFantasyAlert("Không thể đưa nguyên liệu này vào Lò rèn!");
            return;
        }

        // Chặn nếu đang ở trong ải
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể ghép đồ khi đang Vượt Ải!");
            return; 
        }

        // Chặn nếu lò đã đầy
        if (forgeItems.length >= 10) {
            showDarkFantasyAlert("Lò rèn đã chứa đủ 10 vật phẩm!");
            return;
        }

        let isRune = (item.slot === 'rune' || item.type === 'rune');

        // LOGIC 1: ĐANG Ở CHẾ ĐỘ PHÂN GIẢI
        if (currentForgeMode === 'dismantle') {
            if (isRune) {
                showDarkFantasyAlert("Không thể phân giải Tinh Thạch!");
                return;
            }
        } 
        // LOGIC 2: ĐANG Ở CHẾ ĐỘ GHÉP ĐỒ / GHÉP ĐÁ
        else if (currentForgeMode === 'merge') {
            if (forgeItems.length > 0) {
                let firstItem = forgeItems[0];
                let firstIsRune = (firstItem.slot === 'rune' || firstItem.type === 'rune');

                // Chặn trộn lẫn Trang bị và Đá Rune với nhau
                if (isRune !== firstIsRune) {
                    showDarkFantasyAlert("Không thể trộn lẫn Trang Bị và Tinh Thạch!");
                    return;
                }

                // Nếu là Ghép Đá Rune
                if (isRune) {
                    if (forgeItems.length >= 3) {
                        showDarkFantasyAlert("Dung hợp Tinh Thạch chỉ cần đúng 3 viên!");
                        return;
                    }
                    if (item.item_id !== firstItem.item_id || item.upgrade_level !== firstItem.upgrade_level) {
                        showDarkFantasyAlert("Tinh Thạch ghép phải CÙNG MÀU và CÙNG CẤP ĐỘ!");
                        return;
                    }
                } 
                // Nếu là Ghép Trang Bị
                else {
                    if (item.rarity !== firstItem.rarity) {
                        showDarkFantasyAlert("Trang bị ghép phải CÙNG BẬC PHẨM CHẤT!");
                        return;
                    }
                }
            }
        }

        // Đưa vào lò và xóa khỏi Balo
        let singleItem = { ...item }; // Copy thuộc tính

        if (item.quantity && item.quantity > 1) {
            singleItem.quantity = 1; // Trong lò chỉ hiển thị là 1 viên
            singleItem.id = item.stacked_ids.pop(); // Rút 1 ID thật từ cuối mảng ra để gọi API
            item.quantity -= 1; // Giảm số lượng trong balo đi 1
            forgeItems.push(singleItem);
        } else {
            forgeItems.push(singleItem);
            // Nếu chỉ còn 1 viên thì xóa luôn cái ô đó khỏi Balo
            myInventory = myInventory.filter(invItem => invItem.id !== item.id);
        }
        
        renderForge();
        renderInventory();
    }

    function removeFromForge(index) {
        let item = forgeItems[index];
        if (item) {
            forgeItems.splice(index, 1);
            
            // TRẢ VỀ BALO: Xử lý tự động gộp lại vào cục có sẵn (Rune, Vật liệu)
            let isStackable = (item.slot === 'material' || item.slot === 'food' || item.slot === 'rune' || item.type === 'rune');
            
            if (isStackable) {
                // Tìm xem trong balo có cục nào cùng loại, cùng cấp và chưa đầy 50 viên không
                let existingStack = myInventory.find(invItem => 
                    invItem.item_id === item.item_id && 
                    invItem.upgrade_level === item.upgrade_level && 
                    invItem.quantity < 50
                );

                if (existingStack) {
                    existingStack.quantity += 1; // Tăng số lượng lên 1
                    if (!existingStack.stacked_ids) existingStack.stacked_ids = [];
                    existingStack.stacked_ids.push(item.id); // Trả lại ID thật vào mảng
                } else {
                    // Nếu không có cục nào, tạo thành 1 cục mới đứng riêng
                    item.quantity = 1;
                    item.stacked_ids = [item.id];
                    myInventory.push(item);
                }
            } else {
                // Trang bị thường thì vứt thẳng lại vào Balo
                myInventory.push(item);
            }
            
            renderForge();
            renderInventory();
        }
    }

    // Hàm vẽ giao diện Lò rèn
    function renderForge() {
        const forgeSlots = document.querySelectorAll('.forge-slot');
        
        forgeSlots.forEach((slot, index) => {
            let item = forgeItems[index];
            
            if (item) {
                // Có đồ trong ô này
                let rankInfo = RARITY_CONFIG[item.rarity];
                let itemColor = RARITY_CONFIG[item.rarity].color;
                let rankTextColor = itemColor;
                let textShadow = '';
                let plusText = '';

                // Chỉ đổi màu con số +X, giữ nguyên màu viền trắng cho bậc S
                if (item.rarity === 'S') {
                    let lvl = item.upgrade_level || 0;
                    let textColor = getUpgradeColor(lvl); // Gọi màu cho riêng chữ
                    
                    if (lvl > 0) {
                        plusText = `<span style="position: absolute; bottom: 15px; right: 4px; font-size: 13px; color:${textColor}; font-weight:bold; text-shadow: 1px 1px 2px #000;">+${lvl}</span>`;
                    }
                    
                    textShadow = 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;';
                    itemColor = '#ffffff';
                    rankTextColor = '#000000';
                }
                
                // Đổi sang dùng thẻ img
                let imagePath = `../assets/items/${item.icon}`;
                slot.innerHTML = `<img src="${imagePath}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: contain;">
                                <span class="item-rank" style="color: ${rankTextColor}; ${textShadow}">${item.rarity}</span>
                                ${plusText}`;
                slot.style.borderColor = itemColor;
                slot.setAttribute('data-tooltip', buildTooltip(item));
                if(item.rarity === 'S') {
                    slot.style.animation = 's-tier-breathing 2s ease-in-out infinite';
                } else {
                    slot.style.boxShadow = 'none';
                    slot.style.animation = 'none';
                }

                // Click vào ô trong lò để rút đồ ra
                slot.onclick = () => removeFromForge(index);
            } else {
                // Ô trống
                slot.innerHTML = '';
                slot.style.borderColor = '#555';
                slot.style.boxShadow = 'none';
                slot.style.animation = 'none';
                slot.removeAttribute('data-tooltip');
                slot.onclick = null;
            }
        });

        const resultSlot = document.getElementById('forge-result');
        if (resultSlot) {
            resultSlot.innerHTML = '?';
            resultSlot.style.borderColor = '#ffcc00';
            resultSlot.style.boxShadow = 'none';
            resultSlot.removeAttribute('data-tooltip');
        }
    }

    function renderUpgradeUI() {
        const slot = document.getElementById('upgrade-slot');
        
        let bloodstones = myInventory.filter(i => i.item_id === 214).reduce((sum, item) => sum + (item.quantity || 1), 0);
        let normalCharms = myInventory.filter(i => i.item_id === 215).reduce((sum, item) => sum + (item.quantity || 1), 0);
        let holyCharms = myInventory.filter(i => i.item_id === 216).reduce((sum, item) => sum + (item.quantity || 1), 0);

        document.getElementById('count-normal-charm').innerText = normalCharms;
        document.getElementById('count-holy-charm').innerText = holyCharms;

        const normalCharmContainer = document.getElementById('charm-normal-container');
        const holyCharmContainer = document.getElementById('charm-holy-container');

        if (upgradeItem) {
            let lvl = upgradeItem.upgrade_level || 0;
            let color = getUpgradeColor(lvl);
            
            // Chỉ hiển thị cái Tag cấp độ khi nó > 0
            let levelBadge = '';
            if (lvl > 0) {
                levelBadge = `<span style="position: absolute; bottom: -10px; right: -5px; background:#000; padding:2px 5px; border-radius:4px; font-size:12px; color:${color}; font-weight:bold; border:1px solid ${color}; box-shadow: 0 0 5px ${color};">+${lvl}</span>`;
            }

            slot.innerHTML = `
                <img src="../assets/items/${upgradeItem.icon}" style="width: 60px; height: 60px; object-fit: contain;">
                ${levelBadge}
            `;
            // Viền của đồ để trên Đe cũng phải là màu trắng phát sáng
            slot.style.borderColor = '#ffffff';
            slot.style.animation = 's-tier-breathing 2s ease-in-out infinite';

            let warnTxt = document.getElementById('upgrade-warning');

            if (lvl >= 10) {
                document.getElementById('upgrade-rate-text').innerText = 'MAX';
                document.getElementById('upgrade-rate-text').style.color = '#ffd700';
                document.getElementById('upgrade-cost-gold').innerText = '0';
                document.getElementById('upgrade-cost-blood').innerText = `${bloodstones} / 0`;
                document.getElementById('upgrade-cost-blood').style.color = '#00ff00';
                
                warnTxt.innerText = "Trang bị đã đạt Cấp Tối Thượng!";
                warnTxt.style.color = "#ffcc00";

                // Ẩn tất cả các loại Bùa
                normalCharmContainer.style.display = 'none';
                holyCharmContainer.style.display = 'none';
                document.getElementById('use-normal-charm').checked = false;
                document.getElementById('use-holy-charm').checked = false;
            } 
            else {
                let req = UPGRADE_COSTS[lvl];
                document.getElementById('upgrade-rate-text').innerText = UPGRADE_RATES[lvl] + '%';
                document.getElementById('upgrade-rate-text').style.color = UPGRADE_RATES[lvl] >= 80 ? '#00ff00' : (UPGRADE_RATES[lvl] >= 40 ? '#ffaa00' : '#ff0000');
                
                document.getElementById('upgrade-cost-gold').innerText = req.gold.toLocaleString();
                document.getElementById('upgrade-cost-blood').innerText = `${bloodstones} / ${req.blood}`;
                document.getElementById('upgrade-cost-blood').style.color = bloodstones >= req.blood ? '#00ff00' : '#ff3333';

                warnTxt.style.color = "#ff5555";
                if (lvl >= 7) warnTxt.innerText = "CẢNH BÁO: Thất bại sẽ bị tụt về +0!";
                else if (lvl >= 5) warnTxt.innerText = "CẢNH BÁO: Thất bại sẽ bị tụt 1 cấp!";
                else warnTxt.innerText = "An toàn: Thất bại không bị tụt cấp.";

                if (lvl < 7) {
                    normalCharmContainer.style.display = 'flex';
                    holyCharmContainer.style.display = 'none';
                    document.getElementById('use-holy-charm').checked = false;
                } else {
                    normalCharmContainer.style.display = 'none';
                    holyCharmContainer.style.display = 'flex';
                    document.getElementById('use-normal-charm').checked = false;
                }
            }

            slot.onclick = () => {
                myInventory.push(upgradeItem);
                upgradeItem = null;
                renderUpgradeUI();
                renderInventory();
            };
        } else {
            slot.innerHTML = '<span class="slot-label" style="opacity: 0.5; margin-top: 6px;">Trống</span>';
            slot.style.borderColor = '#555';
            slot.style.boxShadow = 'none';
            slot.style.animation = 'none';
            slot.onclick = null;

            document.getElementById('upgrade-rate-text').innerText = '0%';
            document.getElementById('upgrade-cost-gold').innerText = '0';
            document.getElementById('upgrade-cost-blood').innerText = `${bloodstones} / 0`;
            document.getElementById('upgrade-warning').innerText = "";
            
            // Ẩn toàn bộ Bùa khi không có đồ trên Đe
            normalCharmContainer.style.display = 'none';
            holyCharmContainer.style.display = 'none';
            document.getElementById('use-normal-charm').checked = false;
            document.getElementById('use-holy-charm').checked = false;
        }
    }

    // --- LOGIC BẢNG CÀI ĐẶT ---
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    
    // Đóng mở Cài đặt
    btnSettings.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
    
    closeSettings.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        settingsModal.style.display = 'none'; 
        
        // Nếu đang chờ phím mà đóng bảng -> Hủy ngay lập tức để game không bị kẹt
        if (cancelCurrentKeybind) {
            cancelCurrentKeybind();
            cancelCurrentKeybind = null;
        }

        isWaitingForKey = false;

        // [FIX LỖI ĐƠ PAUSE]: Bật lại tương tác cho TẤT CẢ các scene đang chạy
        if (typeof window.game !== 'undefined') {
            window.game.scene.scenes.forEach(scene => {
                if (scene.sys.isActive() && scene.input) {
                    scene.input.enabled = true; 

                    if (scene.moveState) {
                        scene.moveState.up = false;
                        scene.moveState.down = false;
                        scene.moveState.left = false;
                        scene.moveState.right = false;
                    }
                }
            });
        }
    });

    // Chuyển Tab Cài đặt
    const tabAudio = document.getElementById('tab-audio');
    const tabControls = document.getElementById('tab-controls');
    const audioSettings = document.getElementById('audio-settings');
    const controlsSettings = document.getElementById('controls-settings');

    tabAudio.addEventListener('click', () => {
        tabAudio.classList.add('active'); tabControls.classList.remove('active');
        audioSettings.style.display = 'block'; controlsSettings.style.display = 'none';
    });
    tabControls.addEventListener('click', () => {
        tabControls.classList.add('active'); tabAudio.classList.remove('active');
        controlsSettings.style.display = 'block'; audioSettings.style.display = 'none';
    });

    // --- CÀI ĐẶT ĐỔI PHÍM BẤM (KEYBINDING) ---
    const keyBtns = document.querySelectorAll('.key-btn');
    let isWaitingForKey = false;
    let currentWaitingBtn = null; // Theo dõi nút nào đang chờ
    let cancelCurrentKeybind = null;

    keyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Nếu bấm lại chính nút đang chờ thì Hủy lệnh chờ (Hủy chữ ẤN...)
            if (isWaitingForKey && currentWaitingBtn === btn) {
                if (cancelCurrentKeybind) cancelCurrentKeybind();
                return;
            }
            
            // Nếu đang chờ nút khác mà lại bấm sang nút này thì Hủy nút cũ trước
            if (isWaitingForKey && cancelCurrentKeybind) {
                cancelCurrentKeybind();
            }
            
            isWaitingForKey = true;
            currentWaitingBtn = btn;
            
            const originalText = btn.textContent;
            btn.textContent = 'ẤN...';
            btn.classList.add('waiting');
            btn.blur(); // Chống kẹt phím Space/Enter của trình duyệt

            const keydownHandler = (keyEvent) => {
                keyEvent.preventDefault(); 
                let newKey = keyEvent.key === ' ' ? 'SPACE' : keyEvent.key.toUpperCase();
                
                // Cập nhật giao diện HTML
                btn.textContent = newKey;
                btn.classList.remove('waiting');
                
                // Sau khi nhập xong thì khóa lại, tháo hoàn toàn sự kiện lắng nghe bàn phím
                isWaitingForKey = false;
                currentWaitingBtn = null;
                document.removeEventListener('keydown', keydownHandler);
                cancelCurrentKeybind = null; 

                const type = btn.getAttribute('data-type');
                const keyName = btn.getAttribute('data-key');

                if (type === 'move') {
                    window.MOVE_CONFIG[keyName] = newKey;
                } else if (type === 'skill') {
                    window.SKILL_SLOT_HOTKEYS[keyName] = newKey;

                    let slotNumber = keyName.replace('slot', '');
                    let keyLabel = document.getElementById('key-slot-' + slotNumber);
                    if (keyLabel) keyLabel.innerText = newKey;

                    try { 
                        if (typeof window.refreshSkillHotkeysUI === 'function') window.refreshSkillHotkeysUI(); 
                    } catch (error) {}
                    try { 
                        if (typeof window.refreshCampaignSkillHotkeysUI === 'function') window.refreshCampaignSkillHotkeysUI(); 
                    } catch (error) {}
                } else if (type === 'pet_skill') {
                    window.PET_SKILL_HOTKEYS[keyName] = newKey;
                    let activeScene = window.game && window.game.scene.isActive('CampaignScene') ? window.game.scene.getScene('CampaignScene') : null;
                    if (activeScene && activeScene.petCampaignSkills) {
                        let sk = activeScene.petCampaignSkills[keyName];
                        if (sk && sk.ui.hkTxt) sk.ui.hkTxt.setText(newKey);
                    }
                }
            };

            // Lắng nghe phím gõ xuống
            document.addEventListener('keydown', keydownHandler);

            // Hàm giải cứu (Khôi phục trạng thái nếu Hủy)
            cancelCurrentKeybind = () => {
                document.removeEventListener('keydown', keydownHandler);
                btn.textContent = originalText;
                btn.classList.remove('waiting');
                isWaitingForKey = false;
                currentWaitingBtn = null;
            };
        });
    });

    // --- LOGIC ÂM LƯỢNG ---
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');
    let lastVolume = 0.5;

    // Khi người chơi mở Cài đặt, đồng bộ Slider với nhạc của chế độ hiện tại
    document.getElementById('btn-settings').addEventListener('click', () => { 
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive && window.activeCampaignBgm) {
            volumeSlider.value = window.activeCampaignBgm.volume;
        } else if (window.bgMusic) {
            volumeSlider.value = window.bgMusic.volume;
        }
        
        if (volumeSlider.value > 0) { muteBtn.textContent = '🔮'; lastVolume = volumeSlider.value; } 
        else { muteBtn.textContent = '💀'; }
    });

    // Hàm cập nhật đúng luồng nhạc (Phân biệt Luyện tập và Vượt ải)
    const updateGameVolume = (vol) => {
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            if (window.activeCampaignBgm) window.activeCampaignBgm.setVolume(vol); // Nhạc map sinh tồn
        } else {
            if (window.bgMusic) window.bgMusic.setVolume(vol); // Nhạc bg_music.mp3
        }
    };

    volumeSlider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        if (vol > 0) { muteBtn.textContent = '🔮'; lastVolume = vol; } 
        else { muteBtn.textContent = '💀'; }
        updateGameVolume(vol);
    });

    muteBtn.addEventListener('click', () => {
        if (volumeSlider.value > 0) { 
            muteBtn.textContent = '💀'; volumeSlider.value = 0; updateGameVolume(0);
        } else { 
            muteBtn.textContent = '🔮'; volumeSlider.value = lastVolume === 0 ? 0.5 : lastVolume; updateGameVolume(volumeSlider.value);
        }
    });

    let toastTimeout;
    let toastHideTimeout;

    function showDarkFantasyAlert(message) {
        const toast = document.getElementById('dark-fantasy-toast');
        document.getElementById('toast-text').textContent = message;
        
        // Hủy các bộ đếm giờ cũ nếu người chơi spam click
        if (toastTimeout) clearTimeout(toastTimeout);
        if (toastHideTimeout) clearTimeout(toastHideTimeout);

        toast.style.display = 'block';
        // Ép trình duyệt vẽ lại khung hình để hiệu ứng transition chạy mượt
        void toast.offsetWidth; 
        toast.classList.add('show');

        // Đặt lại bộ đếm giờ mới hoàn toàn
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toastHideTimeout = setTimeout(() => { toast.style.display = 'none'; }, 400);
        }, 3000);
    }

    // ==========================================
    // LOGIC HIẾN TẾ LÒ RÈN
    // ==========================================
    const btnForgeSubmit = document.getElementById('btn-forge-submit');

    if (btnForgeSubmit) {
        btnForgeSubmit.onclick = async () => {
            let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
            if (isCampaignActive) return showDarkFantasyAlert("Không thể thao tác khi đang Vượt Ải!");

            if (forgeItems.length === 0) return showDarkFantasyAlert("Lò rèn đang trống!");

            let apiEndpoint = '';
            
            // XÁC ĐỊNH LOGIC GỌI API THEO CHẾ ĐỘ & LOẠI ĐỒ
            if (currentForgeMode === 'dismantle') {
                apiEndpoint = 'http://127.0.0.1:8000/api/forge/dismantle';
            } else if (currentForgeMode === 'merge') {
                let isRune = (forgeItems[0].slot === 'rune' || forgeItems[0].type === 'rune');
                
                if (isRune) {
                    if (forgeItems.length !== 3) return showDarkFantasyAlert("Cần đúng 3 viên Tinh Thạch để dung hợp!");
                    apiEndpoint = 'http://127.0.0.1:8000/api/forge/merge-runes';
                } else {
                    if (forgeItems.length !== 10) return showDarkFantasyAlert("Cần đúng 10 Trang Bị để tiến hành ghép!");
                    apiEndpoint = 'http://127.0.0.1:8000/api/forge/merge';
                }
            }

            const materialIds = forgeItems.map(item => item.id);
            let playerId = localStorage.getItem('playerId') || '1';

            try {
                let originalText = btnForgeSubmit.textContent;
                btnForgeSubmit.textContent = "ĐANG XỬ LÝ...";
                btnForgeSubmit.disabled = true;

                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_id: playerId, materials: materialIds })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    forgeItems = [];
                    renderForge();
                    showDarkFantasyAlert(data.message);

                    // HIỂN THỊ KẾT QUẢ VÀO Ô TRUNG TÂM
                    if (currentForgeMode === 'dismantle') {
                        // Nếu là Phân giải, hiện hình ảnh Bụi Tinh Tú thu được
                        let resultSlot = document.getElementById('forge-result');
                        if (resultSlot) {
                            let icon = data.galaxy > 0 ? 'galaxy_stardust.png' : 'stardust.png';
                            let qtyText = data.galaxy > 0 ? `+${data.galaxy} Tinh Chất Ngân Hà` : `+${data.stardust} Bụi Tinh Tú`;
                            resultSlot.innerHTML = `<img src="../assets/items/${icon}" style="width: 50px; height: 50px; object-fit: contain;">`;
                            resultSlot.style.borderColor = '#00ff00';
                            resultSlot.style.boxShadow = `0 0 20px rgba(0, 255, 0, 0.5)`;
                            resultSlot.setAttribute('data-tooltip', `THÀNH CÔNG\n${qtyText}`);
                        }
                    } else {
                        // Nếu là Ghép đồ/Ghép đá
                        if (data.result === 'success') {
                            displayForgeResult(data.item, 'success');
                        } else if (data.result === 'fail') {
                            displayForgeResult(data.survived_item, 'fail'); 
                        } 
                    }
                    
                    await loadInventoryFromServer();
                } else {
                    showDarkFantasyAlert(data.message || "Có lỗi xảy ra trong lò rèn!");
                }

            } catch (error) {
                console.error("Lỗi Lò rèn:", error);
                showDarkFantasyAlert("Mất kết nối đến Lò rèn!");
            } finally {
                btnForgeSubmit.textContent = currentForgeMode === 'dismantle' ? "TIẾN HÀNH PHÂN GIẢI" : "TIẾN HÀNH GHÉP";
                btnForgeSubmit.disabled = false;
            }
        };
    }

    // Hàm vẽ món đồ kết quả ra ô trung tâm Lò rèn
    function displayForgeResult(itemData, status) {
        const resultSlot = document.getElementById('forge-result');
        if (!resultSlot) return;

        if ((itemData.slot === 'rune' || itemData.type === 'rune') && itemData.upgrade_level > 1) {
            const RUNE_MULTIPLIERS = {
                1: 1.0, 2: 1.5, 3: 2.0, 4: 2.6, 5: 3.3, 
                6: 4.1, 7: 5.0, 8: 6.0, 9: 7.2, 10: 8.5
            };
            let runeMultiplier = RUNE_MULTIPLIERS[itemData.upgrade_level] || 1;
            
            if (itemData.stats) {
                for (let statKey in itemData.stats) {
                    let baseValue = itemData.stats[statKey];
                    itemData.stats[statKey] = Math.round(baseValue * runeMultiplier);
                }
            }
        }

        let rankInfo = RARITY_CONFIG[itemData.rarity];
        let imagePath = `../assets/items/${itemData.icon}`;
        let textShadow = itemData.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';

        resultSlot.setAttribute('data-tooltip', buildTooltip(itemData));

        // NẾU THẤT BẠI: Đồ xỉn màu (grayscale) và viền đỏ máu
        if (status === 'fail') {
            resultSlot.innerHTML = `
                <img src="${imagePath}" alt="${itemData.name}" style="width: 45px; height: 45px; object-fit: contain; filter: grayscale(80%) brightness(0.6);">
                <span class="item-rank" style="color: #ff0000; text-shadow: 0 0 5px #ff0000;">${itemData.rarity}</span>
            `;
            resultSlot.style.borderColor = '#ff0000';
            resultSlot.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.5)';
        } 
        // NẾU THÀNH CÔNG: Đồ sáng bóng lấp lánh theo màu của Bậc
        else {
            resultSlot.innerHTML = `
                <img src="${imagePath}" alt="${itemData.name}" style="width: 50px; height: 50px; object-fit: contain;">
                <span class="item-rank" style="color: ${rankInfo.color}; ${textShadow}">${itemData.rarity}</span>
            `;
            resultSlot.style.borderColor = rankInfo.color;
            resultSlot.style.boxShadow = `0 0 20px ${rankInfo.color}80`;
        }
    }

    // ==========================================
    // SỰ KIỆN CLICK ĐỂ DỌN SẠCH Ô KẾT QUẢ Ở GIỮA
    // ==========================================
    const forgeResultSlot = document.getElementById('forge-result');
    if (forgeResultSlot) {
        forgeResultSlot.addEventListener('click', () => {
            // Chỉ dọn dẹp khi ô này đang có đồ (khác với dấu "?")
            if (forgeResultSlot.innerHTML !== '?') {
                forgeResultSlot.innerHTML = '?';
                forgeResultSlot.style.borderColor = '#ffcc00';
                forgeResultSlot.style.boxShadow = 'none';
                forgeResultSlot.removeAttribute('data-tooltip');
            }
        });
    }

    // ==========================================
    // HỆ THỐNG THÚ CƯNG (PET SYSTEM API & UI)
    // ==========================================

    // Gọi hàm này mỗi khi mở túi hoặc có thay đổi về Pet
    async function loadPetsFromServer() {
        let playerId = localStorage.getItem('playerId') || 1;
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/pets/${playerId}`);
            const data = await response.json();
            if (data.status === 'success') {
                window.playerPets = data.pets;
                window.equippedPet = window.playerPets.find(p => p.is_equipped == 1);
                
                // Vẽ ảnh Pet vào Ô dưới chân nhân vật ở Tab Trang bị
                let slotPet = document.getElementById('slot-pet');
                if (window.equippedPet) {
                    let pInfo = window.equippedPet.pet;
                    let lvl = window.equippedPet.level;
                    let stageStr = lvl >= 100 ? "Trưởng Thành" : (lvl >= 50 ? "Thiếu Niên" : "Cấp Non");
                    let stageIcon = lvl >= 100 ? pInfo.icon_truong_thanh : (lvl >= 50 ? pInfo.icon_thieu_nien : pInfo.icon_non);
                    
                    slotPet.innerHTML = `<img src="../assets/pets/${pInfo.pet_code}/${stageIcon}" style="width: 40px; height: 40px; object-fit: contain;">`;
                    slotPet.style.borderColor = '#00ffcc';
                    slotPet.style.boxShadow = `0 0 10px #00ffcc`;

                    // --- TÍNH TOÁN VÀ GẮN TOOLTIP ---
                    const formatVal = (val) => Number.isInteger(val) ? val : val.toFixed(1);
                    let hp = Math.round(pInfo.base_hp + (lvl - 1) * pInfo.growth_hp);
                    let hpRegen = Math.round(pInfo.base_hp_regen + (lvl - 1) * pInfo.growth_hp_regen);
                    let atk = Math.round(pInfo.base_atk + (lvl - 1) * pInfo.growth_atk);
                    let dodge = formatVal(pInfo.base_dodge + (lvl - 1) * pInfo.growth_dodge);
                    let critRate = formatVal(pInfo.base_crit_rate + (lvl - 1) * pInfo.growth_crit_rate);
                    let critDmg = Math.round(pInfo.base_crit_damage + (lvl - 1) * pInfo.growth_crit_damage);
                    let lifesteal = formatVal(pInfo.base_lifesteal + (lvl - 1) * pInfo.growth_lifesteal);
                    let speed = Math.round(pInfo.base_speed + (lvl - 1) * pInfo.growth_speed);

                    let tooltip = `[${stageStr}] ${pInfo.name.toUpperCase()}\n`;
                    tooltip += `Cấp độ: ${lvl}\n`;
                    tooltip += `-------------------\n`;
                    if (hp > 0) tooltip += `+ Máu tối đa: ${hp}\n`;
                    if (hpRegen > 0) tooltip += `+ Hồi máu/s: ${hpRegen}\n`;
                    if (atk > 0) tooltip += `+ Tấn công: ${atk}\n`;
                    if (dodge > 0) tooltip += `+ Tỉ lệ né: ${dodge}%\n`;
                    if (critRate > 0) tooltip += `+ Tỉ lệ Chí mạng: ${critRate}%\n`;
                    if (critDmg > 0) tooltip += `+ ST Chí mạng: ${critDmg}%\n`;
                    if (lifesteal > 0) tooltip += `+ Hút máu: ${lifesteal}%\n`;
                    if (speed > 0) tooltip += `+ Tốc độ chạy: ${speed}`;

                    slotPet.setAttribute('data-tooltip', tooltip.trim());
                } else {
                    slotPet.innerHTML = `<span class="slot-label" style="opacity: 0.8; color: #00ffcc;">Thú Cưng</span>`;
                    slotPet.style.boxShadow = 'none';
                    slotPet.removeAttribute('data-tooltip');
                }

                updateStatsUI(); // Cập nhật lại thanh máu, dame sau khi có buff Pet
                if (document.getElementById('view-pet').style.display === 'block') renderPetUI();
            }
        } catch (error) { console.error("Lỗi load Pets:", error); }
    }

    // Vẽ giao diện Tab Thú Cưng
    function renderPetUI() {
        let listDiv = document.getElementById('pet-list');
        listDiv.innerHTML = '';

        if (window.playerPets.length === 0) {
            document.getElementById('pet-name').innerText = "Chưa có Thú Cưng";
            return;
        }

        // Tự động chọn Pet đang xuất chiến nếu mới mở lên, nếu không thì chọn con đầu tiên
        if (!currentSelectedPet) {
            currentSelectedPet = window.playerPets.find(p => p.is_equipped == 1) || window.playerPets[0];
        }

        // VẼ DANH SÁCH PET TRÊN CÙNG
        window.playerPets.forEach(p => {
            let pInfo = p.pet;
            let stageIcon = p.level >= 100 ? pInfo.icon_truong_thanh : (p.level >= 50 ? pInfo.icon_thieu_nien : pInfo.icon_non);
            
            let itemDiv = document.createElement('div');
            // THAY ĐỔI: flex-shrink: 0 giúp ảnh không bị nén hẹp lại khi có nhiều Pet
            itemDiv.style.cssText = `position: relative; flex-shrink: 0; width: 50px; height: 50px; border-radius: 5px; cursor: pointer; border: 2px solid ${p.id === currentSelectedPet.id ? '#00ffcc' : '#333'}`;
            itemDiv.onclick = () => { currentSelectedPet = p; renderPetUI(); };

            let imgBtn = document.createElement('img');
            imgBtn.src = `../assets/pets/${pInfo.pet_code}/${stageIcon}`;
            // THAY ĐỔI: object-fit: contain giúp ảnh giữ đúng tỷ lệ, không bị dẹt
            imgBtn.style.cssText = `width: 100%; height: 100%; object-fit: contain;`; 
            itemDiv.appendChild(imgBtn);

            // THAY ĐỔI: ĐÁNH DẤU PET ĐANG ĐƯỢC XUẤT CHIẾN BẰNG ICON ⚔️
            if (p.is_equipped == 1) {
                let badge = document.createElement('div');
                badge.innerHTML = '⚔️'; 
                badge.style.cssText = 'position: absolute; top: -8px; right: -8px; background: #ff0000; font-size: 10px; width: 18px; height: 18px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 1px solid #fff; z-index: 10;';
                itemDiv.appendChild(badge);
            }

            listDiv.appendChild(itemDiv);
        });

        // Vẽ chi tiết con Pet đang chọn
        let pInfo = currentSelectedPet.pet;
        let lvl = currentSelectedPet.level;
        let stageStr = lvl >= 100 ? "[Trưởng Thành]" : (lvl >= 50 ? "[Thiếu Niên]" : "[Cấp Non]");
        // 1. Xác định thời kỳ: 1 (Non), 2 (Thiếu niên), 3 (Trưởng thành)
        let stageNum = lvl >= 100 ? 3 : (lvl >= 50 ? 2 : 1);
        
        // 2. Tự động nối chuỗi thành tên file gif. VD: spritesheet_kien_do_1_idle.gif
        let gifFileName = `spritesheet_${pInfo.pet_code}_${stageNum}_idle.gif`;
        
        // 3. Đưa vào thẻ img (Đổi width/height lên 100% để hiển thị animation to rõ hơn)
        document.getElementById('pet-preview').innerHTML = `<img src="../assets/pets/${pInfo.pet_code}/${gifFileName}" style="width: 100%; height: 100%; object-fit: contain;">`;
        document.getElementById('pet-name').innerText = pInfo.name;
        document.getElementById('pet-stage').innerText = `Cấp ${lvl} ${stageStr}`;
        
        let expNeeded = lvl * 100;
        let expPct = lvl >= 100 ? 100 : (currentSelectedPet.current_exp / expNeeded) * 100;
        document.getElementById('pet-exp-fill').style.width = `${expPct}%`;
        document.getElementById('pet-exp-text').innerText = lvl >= 100 ? "MAX LEVEL" : `${currentSelectedPet.current_exp} / ${expNeeded}`;

        // Hàm phụ trợ để làm tròn số nếu là số nguyên, hoặc giữ 1 chữ số thập phân nếu lẻ
        const formatVal = (val) => Number.isInteger(val) ? val : val.toFixed(1);

        // Tính toán trọn bộ 8 Chỉ số Buff: Base + (Level - 1) * Growth
        let hp = Math.round(pInfo.base_hp + (lvl - 1) * pInfo.growth_hp);
        let hpRegen = Math.round(pInfo.base_hp_regen + (lvl - 1) * pInfo.growth_hp_regen);
        let atk = Math.round(pInfo.base_atk + (lvl - 1) * pInfo.growth_atk);
        let dodge = formatVal(pInfo.base_dodge + (lvl - 1) * pInfo.growth_dodge);
        let critRate = formatVal(pInfo.base_crit_rate + (lvl - 1) * pInfo.growth_crit_rate);
        let critDmg = Math.round(pInfo.base_crit_damage + (lvl - 1) * pInfo.growth_crit_damage);
        let lifesteal = formatVal(pInfo.base_lifesteal + (lvl - 1) * pInfo.growth_lifesteal);
        let speed = Math.round(pInfo.base_speed + (lvl - 1) * pInfo.growth_speed);

        // ==========================================
        // VẼ 3 Ô KỸ NĂNG (BỊ ĐỘNG & CHỦ ĐỘNG) CỦA PET
        // ==========================================
        let skillHtml = '';
        let petCode = pInfo.pet_code;
        let pSkills = window.PET_SKILL_DATA[petCode] || window.PET_SKILL_DATA['default'];
        
        [1, 50, 100].forEach((reqLvl, idx) => {
            let sk = pSkills[reqLvl];
            let isUnlocked = lvl >= reqLvl;

            let specificIcon = pInfo.icon_non;
            if (reqLvl === 50) specificIcon = pInfo.icon_thieu_nien;
            if (reqLvl === 100) specificIcon = pInfo.icon_truong_thanh;
            
            // Nếu DB bị thiếu ảnh, lấy tạm ảnh Non bù vào để không bị móp UI
            let validIcon = specificIcon || pInfo.icon_non;
            let iconImg = `../assets/pets/${pInfo.pet_code}/${validIcon}`;
            
            let filterStyle = !isUnlocked ? 'filter: grayscale(100%) brightness(40%);' : '';
            let lockHtml = !isUnlocked ? `<img src="../assets/lock.png" style="position:absolute; width:22px; height:22px; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2;">` : '';
            let borderStyle = isUnlocked ? 'border: 2px solid #ffcc00; box-shadow: 0 0 10px #ffcc00;' : 'border: 2px solid #444;';
            
            let tooltipText = isUnlocked 
                ? `[${reqLvl == 1 ? 'Bị động' : 'Chủ động'}] ${sk ? sk.name.toUpperCase() : 'CHƯA RÕ'}\n-------------------\n${sk ? sk.desc : ''}` 
                : `[CHƯA MỞ KHÓA]\nYêu cầu Thú cưng đạt Cấp ${reqLvl}.`;
            
            // Kiểm tra xem HOTKEYS đã load xong chưa rồi mới lấy phím
            let hotkeyStr = '';
            if (window.PET_SKILL_HOTKEYS) {
                if (idx === 1) hotkeyStr = window.PET_SKILL_HOTKEYS.pet_skill_1 || '';
                if (idx === 2) hotkeyStr = window.PET_SKILL_HOTKEYS.pet_skill_2 || '';
            }

            let hotkeyHtml = (isUnlocked && reqLvl > 1 && hotkeyStr !== '') 
                ? `<span style="position:absolute; bottom:-8px; right:-5px; font-size:11px; background:#111; padding:1px 5px; border-radius:4px; color:#00ffcc; border:1px solid #00ffcc; z-index:3; font-weight:bold;">${hotkeyStr}</span>` 
                : '';

            skillHtml += `
            <div class="equip-slot" style="width: 50px; height: 50px; border-radius: 50%; position: relative; flex-shrink: 0; ${borderStyle}" data-tooltip="${tooltipText}">
                <img src="${iconImg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; ${filterStyle}">
                ${lockHtml}
                ${hotkeyHtml}
            </div>`;
        });
        document.getElementById('pet-skills-container').innerHTML = skillHtml;
        
        // Đổ toàn bộ dữ liệu vào khung chứa dưới dạng Lưới (Grid) 2 cột
        document.getElementById('pet-stats-container').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; row-gap: 6px; font-size: 12px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 6px; border: 1px solid #444; color: #ddd;">
                <div>🩸 Máu: <span style="color: #00ff00">+${hp}</span></div>
                <div>❤️ Hồi/s: <span style="color: #00ff00">+${hpRegen}</span></div>
                <div>⚔️ ATK: <span style="color: #00ff00">+${atk}</span></div>
                <div>💨 Né: <span style="color: #00ff00">+${dodge}%</span></div>
                <div>💥 TL CM: <span style="color: #00ff00">+${critRate}%</span></div>
                <div>🔥 ST CM: <span style="color: #00ff00">+${critDmg}%</span></div>
                <div>🦇 Hút máu: <span style="color: #00ff00">+${lifesteal}%</span></div>
                <div>⚡ Tốc độ: <span style="color: #00ff00">+${speed}</span></div>
            </div>
        `;

        // THAY ĐỔI TRẠNG THÁI VÀ MÀU SẮC NÚT XUẤT CHIẾN / THU HỒI
        let equipBtn = document.getElementById('btn-equip-pet');
        if (currentSelectedPet.is_equipped == 1) {
            equipBtn.innerText = "THU HỒI";
            equipBtn.style.background = "linear-gradient(180deg, #aa0000, #440000)";
            equipBtn.style.borderColor = "#ff3333";
            equipBtn.style.boxShadow = "0 0 5px #ff0000";
        } else {
            equipBtn.innerText = "XUẤT CHIẾN";
            equipBtn.style.background = "linear-gradient(180deg, #0055aa, #002255)";
            equipBtn.style.borderColor = "#00aaff";
            equipBtn.style.boxShadow = "0 0 5px #00aaff";
        }
    }

    // API ẤP TRỨNG KẾT HỢP VỚI GAME PHASER
    async function hatchEggApi() {
        let playerId = localStorage.getItem('playerId') || 1;
        try {
            const response = await fetch('http://127.0.0.1:8000/api/pets/hatch', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: playerId })
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                let newPet = data.pet;
                
                // 1. Dọn dẹp giao diện HTML để xem phim
                document.getElementById('inventory-modal').style.display = 'none';
                let wasHomeVisible = document.getElementById('home-screen').style.display !== 'none';
                if (wasHomeVisible) {
                    document.getElementById('home-screen').style.display = 'none';
                    document.getElementById('game-container').style.display = 'block';
                }

                // 2. Lấy Scene Game đang chạy ngầm và Load ảnh Pet
                let activeScene = window.game.scene.getScenes(true)[0]; 
                let imgKey = `pet_hatch_${newPet.pet.pet_code}`;
                let imgPath = `../assets/pets/${newPet.pet.pet_code}/${newPet.pet.icon_non}`;

                // Hàm chạy hiệu ứng
                let startAnimation = () => {
                    if (activeScene.physics) activeScene.physics.pause();

                    playEggHatchAnimation(activeScene, newPet.pet.name, imgKey, () => {
                        showDarkFantasyAlert(`Chúc mừng! Bạn đã nhận được ${newPet.pet.name}`);
                        
                        // Khôi phục lại giao diện cũ
                        if (wasHomeVisible) {
                            document.getElementById('home-screen').style.display = 'flex';
                            document.getElementById('game-container').style.display = 'none';
                        }
                        document.getElementById('inventory-modal').style.display = 'flex';

                        if (activeScene.physics) activeScene.physics.resume();
                        
                        loadInventoryFromServer(); // Load lại túi đồ (vì mất trứng)
                        loadPetsFromServer();     // Cập nhật danh sách Pet
                    });
                };

                // ==========================================
                // DYNAMIC LOAD ẢNH TRONG PHASER 3
                // ==========================================
                let needsLoading = false;

                if (!activeScene.textures.exists(imgKey)) {
                    activeScene.load.image(imgKey, imgPath);
                    needsLoading = true;
                }
                if (!activeScene.textures.exists('egg')) {
                    activeScene.load.image('egg', '../assets/items/egg.png');
                    needsLoading = true;
                }
                if (!activeScene.textures.exists('crack')) {
                    activeScene.load.image('crack', '../assets/items/crack.png');
                    needsLoading = true;
                }

                // Nếu có bất kỳ ảnh nào cần tải, đợi tải xong toàn bộ (lệnh once complete) rồi mới chạy
                if (needsLoading) {
                    activeScene.load.once('complete', startAnimation);
                    activeScene.load.start();
                } else {
                    // Nếu ảnh đã có sẵn hết trong bộ nhớ, chạy video luôn
                    startAnimation();
                }
            } else {
                showDarkFantasyAlert(data.message);
            }
        } catch (error) { console.error(error); }
    }

    // Các sự kiện Nút Bấm trong Tab Thú Cưng
    document.getElementById('btn-confirm-feed').addEventListener('click', async () => {
        if (window.pendingFeedItemIds && currentSelectedPet) {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/pets/feed', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_id: localStorage.getItem('playerId') || 1, pet_id: currentSelectedPet.id, material_ids: window.pendingFeedItemIds })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    showDarkFantasyAlert(`Pet nhận được +${data.exp_gained} EXP!`);
                    await loadInventoryFromServer();
                    await loadPetsFromServer();
                    currentSelectedPet = window.playerPets.find(p => p.id === currentSelectedPet.id);
                    renderPetUI();
                } else { showDarkFantasyAlert(data.message); }
            } catch (err) { console.error(err); }
            document.getElementById('feed-modal').style.display = 'none';
        }
    });

    document.getElementById('btn-cancel-feed').addEventListener('click', () => { document.getElementById('feed-modal').style.display = 'none'; window.pendingFeedItemIds = []; });

    // ----------------------------------------------------
    // SỰ KIỆN: BẤM PHÍM ENTER ĐỂ ĐỒNG Ý CHO ĂN
    // ----------------------------------------------------
    document.addEventListener('keydown', (event) => {
        const feedModal = document.getElementById('feed-modal');
        // Chỉ kích hoạt nút Đồng Ý khi phím bấm là Enter VÀ cửa sổ Cho ăn đang được bật
        if (event.key === 'Enter' && feedModal.style.display === 'flex') {
            // Ngăn chặn hành vi mặc định của phím Enter (nếu có)
            event.preventDefault(); 
            // Giả lập một cú click chuột vào nút Đồng Ý
            document.getElementById('btn-confirm-feed').click();
        }
    });
    
    // SỰ KIỆN: LƯỚT DANH SÁCH PET QUA LẠI BẰNG MŨI TÊN
    document.getElementById('btn-pet-prev').addEventListener('click', () => {
        // Cuộn sang trái 80px (kích thước 1 ô + khoảng cách)
        document.getElementById('pet-list-wrapper').scrollBy({ left: -80, behavior: 'smooth' });
    });

    document.getElementById('btn-pet-next').addEventListener('click', () => {
        // Cuộn sang phải 80px
        document.getElementById('pet-list-wrapper').scrollBy({ left: 80, behavior: 'smooth' });
    });

    // SỰ KIỆN: BẤM NÚT XUẤT CHIẾN / THU HỒI
    document.getElementById('btn-equip-pet').addEventListener('click', async () => {
        // Chặn nếu đang ở trong ải
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể thay đổi Thú cưng khi đang Vượt Ải!");
            return; 
        }

        if (currentSelectedPet) {
            // Đã kiểm tra chuẩn logic == 1
            let action = (currentSelectedPet.is_equipped == 1) ? 'unequip' : 'equip';
            
            await fetch('http://127.0.0.1:8000/api/pets/toggle-equip', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: localStorage.getItem('playerId') || 1, pet_id: currentSelectedPet.id, action: action })
            });
            
            // Reload lại danh sách pet để lấy cờ is_equipped mới nhất và vẽ lại UI
            await loadPetsFromServer();
            
            // Cập nhật lại currentSelectedPet với dữ liệu mới vừa tải về
            currentSelectedPet = window.playerPets.find(p => p.id === currentSelectedPet.id);
            renderPetUI();
        }
    });

    // ----------------------------------------------------
    // SỰ KIỆN: BẤM NÚT "THẢ ĐI" -> MỞ MODAL
    // ----------------------------------------------------
    document.getElementById('btn-release-pet').addEventListener('click', () => {
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể phóng sinh Pet khi đang Vượt Ải!");
            return; 
        }

        if (!currentSelectedPet) return showDarkFantasyAlert("Vui lòng chọn Thú cưng cần thả!");
        if (currentSelectedPet.is_equipped == 1) return showDarkFantasyAlert("Vui lòng Thu hồi Pet trước khi thả đi!");

        document.getElementById('release-pet-name').innerText = currentSelectedPet.pet.name;
        document.getElementById('release-modal').style.display = 'flex';
    });

    document.getElementById('btn-cancel-release').addEventListener('click', () => {
        document.getElementById('release-modal').style.display = 'none';
    });

    document.getElementById('btn-confirm-release').addEventListener('click', async () => {
        document.getElementById('release-modal').style.display = 'none'; // Ẩn modal ngay lập tức
        try {
            await fetch('http://127.0.0.1:8000/api/pets/release', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: localStorage.getItem('playerId') || 1, pet_id: currentSelectedPet.id })
            });
            currentSelectedPet = null;
            showDarkFantasyAlert("Đã phóng sinh thú cưng thành công!");
            await loadPetsFromServer(); // Load lại danh sách
        } catch (err) { console.error(err); }
    });

    // ----------------------------------------------------
    // SỰ KIỆN: CHO ĂN NHANH TỰ ĐỘNG BẰNG MODAL
    // ----------------------------------------------------
    document.getElementById('btn-fast-feed').addEventListener('click', () => {
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể cho ăn khi đang Vượt Ải!");
            return; 
        }

        if (!currentSelectedPet) return showDarkFantasyAlert("Vui lòng chọn Thú cưng!");
        if (currentSelectedPet.level >= 100) return showDarkFantasyAlert("Thú cưng đã đạt cấp độ tối đa (MAX LEVEL)!");

        // 1. Quét Balo và gom TẤT CẢ các Thức ăn (food)
        let foodItems = myInventory.filter(item => item.slot === 'food');

        if (foodItems.length === 0) {
            return showDarkFantasyAlert("Không tìm thấy Thức ăn nào trong Balo!");
        }

        // 2. Tính toán tổng EXP và gom mảng ID
        let expRates = { 'B': 500, 'A': 2000, 'S': 15000 };
        let totalExp = 0;
        let totalFoodQuantity = 0;
        window.pendingFeedItemIds = [];

        foodItems.forEach(item => {
            let qty = item.quantity || 1;
            totalFoodQuantity += qty;
            totalExp += (expRates[item.rarity] || 0) * qty;
            
            // Lấy ID của từng món đã bị gộp (stack)
            if (item.stacked_ids) {
                window.pendingFeedItemIds.push(...item.stacked_ids);
            } else {
                window.pendingFeedItemIds.push(item.id);
            }
        });

        // 3. Hiển thị thông số lên Modal và mở Modal
        document.getElementById('fast-feed-count').innerText = totalFoodQuantity;
        document.getElementById('fast-feed-total-exp').innerText = totalExp.toLocaleString();
        document.getElementById('fast-feed-modal').style.display = 'flex';
    });

    document.getElementById('btn-cancel-fast-feed').addEventListener('click', () => {
        document.getElementById('fast-feed-modal').style.display = 'none';
        window.pendingFeedItemIds = [];
    });

    document.getElementById('btn-confirm-fast-feed').addEventListener('click', async () => {
        document.getElementById('fast-feed-modal').style.display = 'none';
        if (window.pendingFeedItemIds && currentSelectedPet) {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/pets/feed', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_id: localStorage.getItem('playerId') || 1, pet_id: currentSelectedPet.id, material_ids: window.pendingFeedItemIds })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    showDarkFantasyAlert(`Tuyệt vời! Pet nhận được +${data.exp_gained} EXP!`);
                    await loadInventoryFromServer();
                    await loadPetsFromServer();
                    currentSelectedPet = window.playerPets.find(p => p.id === currentSelectedPet.id);
                    renderPetUI();
                } else { showDarkFantasyAlert(data.message); }
            } catch (err) { console.error(err); }
        }
    });

    // ----------------------------------------------------
    // SỰ KIỆN: BẤM NÚT ẤP TRỨNG TRONG MODAL
    // ----------------------------------------------------
    document.getElementById('btn-cancel-hatch').addEventListener('click', () => {
        document.getElementById('hatch-modal').style.display = 'none'; // Ẩn modal đi nếu bấm Hủy
    });

    document.getElementById('btn-confirm-hatch').addEventListener('click', () => {
        document.getElementById('hatch-modal').style.display = 'none'; // Ẩn modal
        hatchEggApi(); // Gọi hàm chạy video nổ trứng và trừ đồ ở Backend
    });

    // ----------------------------------------------------
    // SỰ KIỆN: BẤM NÚT GHÉP MẢNH TRỨNG TRONG MODAL
    // ----------------------------------------------------
    document.getElementById('btn-cancel-merge').addEventListener('click', () => {
        document.getElementById('merge-modal').style.display = 'none';
    });

    document.getElementById('btn-confirm-merge').addEventListener('click', async (e) => {
        e.preventDefault();

        document.getElementById('merge-modal').style.display = 'none'; // Ẩn modal
        let playerId = localStorage.getItem('playerId') || 1;
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/pets/merge-pieces', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: playerId })
            });
            const data = await response.json();
            
            showDarkFantasyAlert(data.message);
            if (data.status === 'success') {
                loadInventoryFromServer(); // Load lại Balo để thấy trứng mới và mảnh đã trừ
            }
        } catch (error) { 
            console.error(error); 
            showDarkFantasyAlert("Lỗi dung hợp mảnh trứng!");
        }
    });

    const subtabMerge = document.getElementById('subtab-merge');
    const subtabUpgrade = document.getElementById('subtab-upgrade');
    const subtabDismantle = document.getElementById('subtab-dismantle');

    const contentMerge = document.getElementById('forge-merge-content');
    const contentUpgrade = document.getElementById('forge-upgrade-content');
    const magicCircle = document.querySelector('.magic-circle');

    function resetSubtabStyles() {
        [subtabMerge, subtabUpgrade, subtabDismantle].forEach(btn => {
            if(!btn) return;
            btn.style.background = 'transparent';
            btn.style.borderColor = '#555';
            btn.style.color = '#888';
            btn.style.boxShadow = 'none';
        });
    }

    subtabMerge.addEventListener('click', () => {
        returnAllForgeItemsToBalo();
        currentForgeMode = 'merge';
        resetSubtabStyles();
        subtabMerge.style.background = 'linear-gradient(90deg, transparent, #8b0000, transparent)';
        subtabMerge.style.borderColor = '#ff0000'; subtabMerge.style.color = '#fff'; subtabMerge.style.boxShadow = '0 0 10px #ff0000';
        contentMerge.style.display = 'flex'; contentUpgrade.style.display = 'none';
        btnForgeSubmit.textContent = "TIẾN HÀNH HIẾN TẾ";

        btnForgeSubmit.classList.remove('btn-dismantle-theme');
        if (magicCircle) magicCircle.classList.remove('circle-dismantle-theme');
    });

    subtabUpgrade.addEventListener('click', () => {
        returnAllForgeItemsToBalo();
        currentForgeMode = 'upgrade';
        resetSubtabStyles();
        subtabUpgrade.style.background = 'linear-gradient(90deg, transparent, #0055aa, transparent)';
        subtabUpgrade.style.borderColor = '#00aaff'; subtabUpgrade.style.color = '#fff'; subtabUpgrade.style.boxShadow = '0 0 10px #00aaff';
        contentMerge.style.display = 'none'; contentUpgrade.style.display = 'flex';
        renderUpgradeUI();
    });

    subtabDismantle.addEventListener('click', () => {
        returnAllForgeItemsToBalo();
        currentForgeMode = 'dismantle';
        resetSubtabStyles();
        subtabDismantle.style.background = 'linear-gradient(90deg, transparent, #008800, transparent)';
        subtabDismantle.style.borderColor = '#00ff00'; subtabDismantle.style.color = '#fff'; subtabDismantle.style.boxShadow = '0 0 10px #00ff00';
        contentMerge.style.display = 'flex'; contentUpgrade.style.display = 'none';
        btnForgeSubmit.textContent = "TIẾN HÀNH PHÂN GIẢI";

        btnForgeSubmit.classList.add('btn-dismantle-theme');
        if (magicCircle) magicCircle.classList.add('circle-dismantle-theme');
    });

    // ==========================================
    // HÀM TẠO HIỆU ỨNG KHI CƯỜNG HÓA THÀNH CÔNG
    // ==========================================
    function playUpgradeEffect(newLevel) {
        const slot = document.getElementById('upgrade-slot');
        if (!slot) return;

        // Tạo 1 lớp Flash sáng lóa chớp lên màn hình
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0'; flash.style.left = '0';
        flash.style.width = '100vw'; flash.style.height = '100vh';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '9999999';
        document.body.appendChild(flash);

        // Tạo CSS rung lắc (nếu chưa có)
        if (!document.getElementById('upgrade-keyframes')) {
            const style = document.createElement('style');
            style.id = 'upgrade-keyframes';
            style.innerHTML = `
                @keyframes shake-light { 0% { transform: translate(1px, 1px) } 50% { transform: translate(-1px, -1px) } 100% { transform: translate(1px, -1px) } }
                @keyframes shake-heavy { 0% { transform: translate(3px, 2px) } 25% { transform: translate(-3px, -2px) } 50% { transform: translate(0px, 4px) } 75% { transform: translate(-4px, 1px) } 100% { transform: translate(3px, -3px) } }
                @keyframes shake-extreme { 0% { transform: translate(6px, 4px) } 20% { transform: translate(-6px, -4px) } 40% { transform: translate(-2px, 8px) } 60% { transform: translate(-8px, 2px) } 80% { transform: translate(6px, -6px) } 100% { transform: translate(-4px, 4px) } }
            `;
            document.head.appendChild(style);
        }

        const invContainer = document.querySelector('.inventory-container');

        // PHÂN LOẠI HIỆU ỨNG THEO CẤP
        if (newLevel >= 5 && newLevel <= 7) {
            // 1. MỐC BẠC (+5, +6, +7): Chớp sáng ánh Bạc, rung nhẹ ô trang bị
            flash.style.background = 'radial-gradient(circle, rgba(200,200,200,0.8) 0%, transparent 50%)';
            flash.style.transition = 'opacity 0.5s ease-out';
            slot.style.animation = 'shake-light 0.1s infinite';
            
            setTimeout(() => { flash.style.opacity = '0'; }, 50);
            setTimeout(() => { flash.remove(); slot.style.animation = ''; }, 500);
        } 
        else if (newLevel >= 8 && newLevel <= 9) {
            // 2. MỐC VÀNG (+8, +9): Chớp sáng Vàng rực, rung mạnh toàn bộ Bảng Kho Đồ
            flash.style.background = 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, transparent 60%)';
            flash.style.transition = 'opacity 0.8s ease-out';
            if (invContainer) invContainer.style.animation = 'shake-heavy 0.1s infinite';
            
            setTimeout(() => { flash.style.opacity = '0'; }, 50);
            setTimeout(() => { flash.remove(); if(invContainer) invContainer.style.animation = ''; }, 800);
        } 
        else if (newLevel === 10) {
            // 3. MỐC TỐI THƯỢNG (+10): Sáng lóa trắng xóa, rồi chuyển sang Đỏ rực, rung giật toàn Màn Hình
            flash.style.background = 'rgba(255, 255, 255, 1)'; // Chớp trắng
            flash.style.transition = 'background 0.3s ease, opacity 1.5s ease-out';
            document.body.style.animation = 'shake-extreme 0.05s infinite'; // Rung cả trình duyệt
            
            setTimeout(() => { 
                // Chuyển sang hào quang Huyết - Vàng
                flash.style.background = 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,215,0,0.6) 40%, transparent 100%)'; 
                flash.style.opacity = '0'; 
            }, 200);
            setTimeout(() => { flash.remove(); document.body.style.animation = ''; }, 1500);
        }
    }

    // ----------------------------------------------------
    // SỰ KIỆN: BẤM NÚT CƯỜNG HÓA TRANG BỊ
    // ----------------------------------------------------
    const btnUpgradeSubmit = document.getElementById('btn-upgrade-submit');
    if (btnUpgradeSubmit) {
        btnUpgradeSubmit.addEventListener('click', async () => {
            if (!upgradeItem) {
                return showDarkFantasyAlert("Vui lòng kéo trang bị Bậc S vào Lò rèn!");
            }

            let playerId = localStorage.getItem('playerId') || 1;
            let useNormal = document.getElementById('use-normal-charm').checked;
            let useHoly = document.getElementById('use-holy-charm').checked;

            btnUpgradeSubmit.disabled = true;
            btnUpgradeSubmit.innerText = "ĐANG ĐẬP...";

            try {
                const response = await fetch('http://127.0.0.1:8000/api/forge/upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player_id: playerId,
                        player_item_id: upgradeItem.id, // Chú ý: Gửi id (duy nhất) chứ ko phải item_id
                        use_normal_charm: useNormal,
                        use_holy_charm: useHoly
                    })
                });
                
                const data = await response.json();
                
                // Hiển thị kết quả Lên/Xuống cấp
                showDarkFantasyAlert(data.message);
                
                if (data.status !== 'error') {
                    let oldLevel = upgradeItem.upgrade_level || 0;
                    let isSuccess = data.status === 'success';
                    let newLevel = oldLevel + 1;

                    if (isSuccess && newLevel >= 5) {
                        playUpgradeEffect(newLevel);
                        
                        upgradeItem.upgrade_level = newLevel;
                        renderUpgradeUI();

                        setTimeout(() => {
                            upgradeItem = null;
                            renderUpgradeUI();
                            if (typeof window.fetchPlayerData === 'function') window.fetchPlayerData();
                            loadInventoryFromServer();
                        }, 1200);
                    } 
                    else {
                        upgradeItem = null;
                        renderUpgradeUI();
                        if (typeof window.fetchPlayerData === 'function') window.fetchPlayerData();
                        loadInventoryFromServer();
                    }
                }
            } catch (error) {
                console.error("Lỗi:", error);
                showDarkFantasyAlert("Lỗi hệ thống khi Cường hóa!");
            } finally {
                // Mở khóa nút trở lại
                btnUpgradeSubmit.disabled = false;
                btnUpgradeSubmit.innerText = "CƯỜNG HÓA";
            }
        });
    }
    
    if (typeof loadInventoryFromServer === 'function') {
        loadInventoryFromServer();
    }

    // ==========================================
    // KHU VỰC TẾ ĐÀN THỨC TỈNH (AWAKENING ALTAR)
    // ==========================================
    const AWAKENING_LABELS = ['HP', 'ATK', 'Hồi Máu', 'Tốc Độ', 'Tỉ lệ CM', 'ST CM', 'Né', 'Hút Máu'];
    
    // Mảng chứa dữ liệu chuẩn của 8 ô
    window.currentAwakeningStats = arrayFillNull(8); 
    // Mảng lưu trạng thái khóa
    let lockedStats = [false, false, false, false, false, false, false, false];

    function arrayFillNull(size) {
        let arr = [];
        for(let i=0; i<size; i++) arr.push({ value_str: '+0', color: '#555555', ratio: 0, value: 0, is_flat: false });
        return arr;
    }

    function drawRadarChart() {
        const canvas = document.getElementById('radar-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = 170, cy = 170, radius = 120; 

        ctx.clearRect(0, 0, 340, 340);

        // 1. Vẽ Lưới Mạng Nhện
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let step = 1; step <= 5; step++) {
            ctx.beginPath();
            let r = radius * (step / 5);
            for (let i = 0; i < 8; i++) {
                let angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
                let x = cx + Math.cos(angle) * r;
                let y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // 2. Vẽ 8 trục nối từ tâm ra rìa và Chữ (Labels)
        for (let i = 0; i < 8; i++) {
            let angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.stroke();

            ctx.fillStyle = lockedStats[i] ? '#555' : '#aaa';
            ctx.font = lockedStats[i] ? 'italic 13px Arial' : 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let labelX = cx + Math.cos(angle) * (radius + 30);
            let labelY = cy + Math.sin(angle) * (radius + 20);
            ctx.fillText(AWAKENING_LABELS[i], labelX, labelY);
        }

        // 3. Vẽ Vùng Sức Mạnh của Nhân Vật (Dựa trên thông số Ratio API trả về)
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            let angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
            let val = window.currentAwakeningStats[i] ? window.currentAwakeningStats[i].ratio : 0; 
            let x = cx + Math.cos(angle) * (radius * val);
            let y = cy + Math.sin(angle) * (radius * val);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function renderStatsList() {
        const listContainer = document.getElementById('awakening-stats-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        for (let i = 0; i < 8; i++) {
            let isLocked = lockedStats[i];
            let statData = window.currentAwakeningStats[i] || { value_str: '+0', color: '#555' };
            
            // Xử lý Text-Shadow cho màu Đỏ
            let textShadow = statData.color === '#ff0000' ? 'text-shadow: 0 0 10px #ff0000;' : '';

            let itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.justifyContent = 'space-between';
            itemDiv.style.padding = '8px 15px';
            itemDiv.style.backgroundColor = isLocked ? '#222' : '#111';
            itemDiv.style.border = isLocked ? '1px solid #555' : `1px solid ${statData.color}`;
            itemDiv.style.borderRadius = '5px';

            itemDiv.innerHTML = `
                <span style="color: ${isLocked ? '#777' : '#fff'}; width: 80px; font-weight:bold;">${AWAKENING_LABELS[i]}</span>
                <span style="color: ${isLocked ? '#777' : statData.color}; font-weight: bold; width: 80px; text-align: right; ${textShadow}">${statData.value_str}</span>
                <button onclick="toggleLock(${i})" style="margin-left: 15px; background: none; border: none; font-size: 18px; cursor: pointer; filter: grayscale(${isLocked ? '0' : '100%'});">
                    ${isLocked ? '🔒' : '🔓'}
                </button>
            `;
            listContainer.appendChild(itemDiv);
        }
    }

    window.toggleLock = function(index) {
        lockedStats[index] = !lockedStats[index];

        let playerId = localStorage.getItem('playerId') || '1';
        fetch('http://127.0.0.1:8000/api/talents/save-awakening-locks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: playerId, locks: lockedStats })
        }).catch(err => console.error("Lỗi lưu ổ khóa:", err));

        drawRadarChart(); 
        renderStatsList(); 
        
        let lockedCount = lockedStats.filter(x => x).length;
        let cost = 1;
        if (lockedCount === 1) cost = 2;
        else if (lockedCount === 2) cost = 5;
        else if (lockedCount === 3) cost = 10;
        else if (lockedCount >= 4 && lockedCount <= 6) cost = 50; 
        else if (lockedCount === 7) cost = 100; 
        
        document.getElementById('roll-cost').innerText = `(Tốn ${cost} Điểm)`;
    };

    // SỰ KIỆN NÚT TẾ HỒN CALL API
    const btnTeHon = document.getElementById('btn-te-hon');
    if (btnTeHon) {
        btnTeHon.addEventListener('mouseover', () => btnTeHon.style.boxShadow = '0 0 25px rgba(255,0,0,0.8)');
        btnTeHon.addEventListener('mouseout', () => btnTeHon.style.boxShadow = 'none');

        btnTeHon.addEventListener('click', async () => {
            // BẮT BUỘC MỞ ĐỦ 9 SKILL
            if (unlockedNodes.length < 9) {
                showDarkFantasyAlert("Phải mở khóa toàn bộ Kỹ năng trước khi Tế Hồn!");
                return;
            }

            let lockedCount = lockedStats.filter(x => x).length;
            if (lockedCount === 8) {
                showDarkFantasyAlert("Bạn đang khóa cả 8 ô! Hãy mở khóa ít nhất 1 ô để Tế Hồn.");
                return;
            }

            let playerId = localStorage.getItem('playerId') || '1';
            
            try {
                btnTeHon.disabled = true;
                btnTeHon.innerHTML = `ĐANG TẾ LỄ...`;

                const response = await fetch('http://127.0.0.1:8000/api/talents/roll-awakening', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        player_id: playerId, 
                        locked_indexes: lockedStats 
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // Cập nhật điểm thiên phú
                    talentPoints = data.talent_points;
                    document.getElementById('talent-points-text').innerText = talentPoints;
                    
                    // Cập nhật mảng kết quả và vẽ lại UI Tế Đàn
                    window.currentAwakeningStats = data.stats;
                    drawRadarChart();
                    renderStatsList();

                    // Rung màn hình nhẹ khi Roll thành công
                    const altar = document.getElementById('awakening-altar');
                    altar.style.transform = 'translate(-3px, 3px)';
                    setTimeout(() => altar.style.transform = 'translate(3px, -3px)', 50);
                    setTimeout(() => altar.style.transform = 'translate(0, 0)', 100);

                    // TÍNH LẠI CHỈ SỐ GẦN NHẤT ĐỂ ÁP DỤNG NGAY LẬP TỨC
                    window.updateStatsUI();

                } else {
                    showDarkFantasyAlert(data.message);
                }
            } catch (error) {
                console.error("Lỗi Tế Đàn:", error);
                showDarkFantasyAlert("Mất kết nối với Tế Đàn!");
            } finally {
                // Mở lại nút và tính lại giá tiền hiện tại
                let cost = 1;
                if (lockedCount === 1) cost = 2;
                else if (lockedCount === 2) cost = 5;
                else if (lockedCount === 3) cost = 10;
                else if (lockedCount >= 4 && lockedCount <= 6) cost = 50; 
                else if (lockedCount === 7) cost = 100;

                btnTeHon.disabled = false;
                btnTeHon.innerHTML = `TẾ HỒN <span id="roll-cost" style="color: #ffcc00; font-size: 20px;">(Tốn ${cost} Điểm)</span>`;
            }
        });
    }

    // ==========================================
    // SỰ KIỆN MỞ BẢNG QUY TẮC TẾ HỒN
    // ==========================================
    const btnAwakeningInfo = document.getElementById('btn-awakening-info');
    const awakeningRulesModal = document.getElementById('awakening-rules-modal');
    const closeAwakeningRules = document.getElementById('close-awakening-rules');

    if (btnAwakeningInfo && awakeningRulesModal && closeAwakeningRules) {
        btnAwakeningInfo.addEventListener('click', () => {
            awakeningRulesModal.style.display = 'flex';
        });

        closeAwakeningRules.addEventListener('click', () => {
            awakeningRulesModal.style.display = 'none';
        });
        
        // Bấm ra ngoài khoảng đen để đóng modal
        awakeningRulesModal.addEventListener('click', (e) => {
            if (e.target === awakeningRulesModal) {
                awakeningRulesModal.style.display = 'none';
            }
        });
    }

    window.playHomeClickSound = function() {
        if (typeof window.game !== 'undefined') {
            let activeScene = window.game.scene.getScenes(true)[0];
            if (activeScene) {
                activeScene.sound.play('homeClick', { volume: 0.5 });
            }
        }
    };

    // ==========================================
    // LOGIC RENDER TÚI TINH THẠCH & PHÂN TRANG
    // ==========================================
    let currentRunePage = 1;
    const runesPerPage = 25;

    window.renderRuneInventory = function() {
        const runeGrid = document.getElementById('rune-inventory-grid');
        if (!runeGrid) return;
        runeGrid.innerHTML = '';

        // 1. Cập nhật Số lượng Bụi & Tinh chất
        let stardustCount = myInventory.filter(i => i.item_id === 220).reduce((sum, item) => sum + (item.quantity || 1), 0);
        let galaxyCount = myInventory.filter(i => i.item_id === 221).reduce((sum, item) => sum + (item.quantity || 1), 0);
        document.getElementById('txt-stardust').innerText = stardustCount;
        document.getElementById('txt-galaxy').innerText = galaxyCount;

        // 2. Lọc Đá Rune và Phân trang
        let runes = myInventory.filter(item => item.slot === 'rune' || item.type === 'rune');
        
        runes.forEach(rune => {
            const RUNE_COLORS = {
                222: 'red',
                223: 'purple',
                224: 'green',
                225: 'blue'
            };
            rune.color = RUNE_COLORS[rune.item_id] || 'red'; 
        });

        runes.sort((a, b) => {
            if (a.item_id !== b.item_id) {
                return a.item_id - b.item_id;u
            }
            return (b.upgrade_level || 0) - (a.upgrade_level || 0);
        });

        let totalPages = Math.ceil(runes.length / runesPerPage) || 1;
        if (currentRunePage > totalPages) currentRunePage = totalPages;
        
        let startIndex = (currentRunePage - 1) * runesPerPage;
        let pageRunes = runes.slice(startIndex, startIndex + runesPerPage);

        // Cập nhật UI Nút phân trang
        const btnPrev = document.getElementById('btn-rune-prev');
        const btnNext = document.getElementById('btn-rune-next');
        const pageInfo = document.getElementById('rune-page-info');
        
        if (pageInfo) pageInfo.textContent = `Trang ${currentRunePage} / ${totalPages}`;
        if (btnPrev) btnPrev.disabled = currentRunePage === 1;
        if (btnNext) btnNext.disabled = currentRunePage === totalPages;

        // 3. Render từng viên Rune vào lưới
        pageRunes.forEach(rune => {
            let div = document.createElement('div');
            div.className = 'inv-item';
            
            let itemColor = RARITY_CONFIG[rune.rarity].color;
            let rankTextColor = itemColor;
            let textShadow = '';

            if (rune.rarity === 'S') {
                textShadow = 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;';
                itemColor = '#ffffff';
                rankTextColor = '#000000';
                div.style.animation = 's-tier-breathing 2s ease-in-out infinite';
            }
            
            let qtyHtml = (rune.quantity && rune.quantity > 1) 
                ? `<div style="position: absolute; top: -5px; left: -5px; font-size: 12px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.85); padding: 2px 5px; border-radius: 6px; border: 1px solid #ffcc00; z-index: 5;">x${rune.quantity}</div>` 
                : '';
            
            let plusText = '';
            let lvl = rune.upgrade_level || 0;
            if (lvl > 0) { 
                let textColor = getUpgradeColor(lvl);
                plusText = `<span style="position: absolute; bottom: 15px; right: 4px; font-size: 13px; color:${textColor}; font-weight:bold; text-shadow: 1px 1px 2px #000;">+${lvl}</span>`;
            }

            div.innerHTML = `${qtyHtml}
                             <img src="../assets/items/${rune.icon}" style="width: 40px; height: 40px; object-fit: contain;">
                             <span class="item-rank" style="color: ${rankTextColor}; ${textShadow}">${rune.rarity}</span>
                             ${plusText}`;
            
            div.style.borderColor = itemColor;
            div.setAttribute('data-tooltip', buildTooltip(rune));
            
            div.addEventListener('click', () => {
                const targetSlot = document.querySelector(`.astro-slot[data-color="${rune.color}"][data-index="1"]`);

                if (!targetSlot) {
                    showDarkFantasyAlert("Không tìm thấy rãnh khảm tương ứng!");
                    return;
                }

                if (targetSlot.classList.contains('filled')) {
                    showDarkFantasyAlert("Rãnh này đã có Tinh Thạch! Hãy bấm vào rãnh để tháo ra trước.");
                    return;
                }

                khamRuneVaoSlot(rune, targetSlot);
            });

            runeGrid.appendChild(div);
        });

        // 4. Điền các ô trống cho đẹp mắt
        for(let i = pageRunes.length; i < runesPerPage; i++) {
            let emptyDiv = document.createElement('div');
            emptyDiv.className = 'inv-item';
            emptyDiv.innerHTML = `<span class="slot-label" style="opacity: 0.2">Trống</span>`;
            runeGrid.appendChild(emptyDiv);
        }

        // 5. Gắn sự kiện click TÁO RUNE cho 4 ô khảm (chỉ gắn 1 lần)
        document.querySelectorAll('.astro-slot').forEach(slotEl => {
            if (slotEl.dataset.unequipBound) return; // tránh gắn trùng nhiều lần
            slotEl.dataset.unequipBound = '1';

            slotEl.addEventListener('click', () => {
                if (!slotEl.classList.contains('filled')) return; // ô trống thì không làm gì khi click trực tiếp vào ô
                thaoRuneKhoiSlot(slotEl);
            });
        });
    };

    async function khamRuneVaoSlot(rune, slotElement) {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/astrolabe/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    player_id: localStorage.getItem('playerId'),
                    item_id: rune.id,
                    slot: slotElement.getAttribute('data-color') 
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                showDarkFantasyAlert("Khảm Tinh Thạch thành công!");
                await loadInventoryFromServer();
                renderRuneInventory();
                window.updateStatsUI();
            } else {
                showDarkFantasyAlert(data.message);
            }
        } catch (err) {
            console.error(err);
            showDarkFantasyAlert("Lỗi khi khảm Tinh Thạch!");
        }
    }

    async function thaoRuneKhoiSlot(slotElement) {
        try {
            const playerItemId = slotElement.getAttribute('data-player-item-id');
            if (!playerItemId) {
                showDarkFantasyAlert("Không xác định được Tinh Thạch trong rãnh này!");
                return;
            }

            const response = await fetch('http://127.0.0.1:8000/api/astrolabe/unequip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: localStorage.getItem('playerId'),
                    item_id: playerItemId
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                showDarkFantasyAlert("Đã tháo Tinh Thạch!");
                await loadInventoryFromServer();
                renderRuneInventory();
                window.updateStatsUI();
            } else {
                showDarkFantasyAlert(data.message);
            }
        } catch (err) {
            console.error(err);
            showDarkFantasyAlert("Lỗi khi tháo Tinh Thạch!");
        }
    }

    const btnRunePrev = document.getElementById('btn-rune-prev');
    const btnRuneNext = document.getElementById('btn-rune-next');
    
    if (btnRunePrev) {
        btnRunePrev.addEventListener('click', () => { 
            if (currentRunePage > 1) { currentRunePage--; renderRuneInventory(); } 
        });
    }
    if (btnRuneNext) {
        btnRuneNext.addEventListener('click', () => { 
            currentRunePage++; renderRuneInventory(); 
        });
    }

    // ==========================================
    // CẬP NHẬT GIAO DIỆN LÕI SAO (UI & TOOLTIP)
    // ==========================================
    window.updateAstroCoreUI = function() {
        let core = document.getElementById('astro-core');
        if (!core || !window.playerData) return;

        let level = window.playerData.level_star || 1;
        
        // Parse chuỗi JSON từ Database
        let stats = {};
        if (window.playerData.astrolabe_stats) {
            try {
                stats = typeof window.playerData.astrolabe_stats === 'string' ? JSON.parse(window.playerData.astrolabe_stats) : window.playerData.astrolabe_stats;
            } catch(e) { console.error("Lỗi đọc chỉ số Lõi sao", e); }
        }
        
        // 1. Cập nhật diện mạo (Icon + Chữ)
        core.innerHTML = `
            <span style="font-size: 26px; filter: drop-shadow(0 0 8px #ffcc00);">⚜️</span>
            <span style="color: #ffcc00; font-size: 14px; text-shadow: 0 0 8px rgba(255,204,0,0.8); margin-top: 3px;">LÕI SAO ${level}</span>
        `;

        // 2. Xây dựng Tooltip thông số
        let tooltip = `Lõi Tinh Tú - Cấp độ: ${level}\n-------------------\nSức mạnh đã hấp thụ:\n`;
        let hasStats = false;
        
        for (let stat in stats) {
            if (STAT_NAMES[stat] && stats[stat] > 0) {
                let suffix = (['dodge', 'critRate', 'critDamage', 'lifesteal'].includes(stat)) ? '%' : '';
                tooltip += `${STAT_NAMES[stat]}: ${stats[stat]}${suffix}\n`;
                hasStats = true;
            }
        }

        if (!hasStats) {
            tooltip += `(Chưa hấp thụ Tinh Thạch nào)\n`;
        }

        const UPGRADE_COSTS = {
            1: { id: 220, amount: 10, name: "Bụi Tinh Tú" },
            2: { id: 220, amount: 20, name: "Bụi Tinh Tú" },
            3: { id: 220, amount: 30, name: "Bụi Tinh Tú" },
            4: { id: 220, amount: 50, name: "Bụi Tinh Tú" },
            5: { id: 220, amount: 80, name: "Bụi Tinh Tú" },
            6: { id: 220, amount: 120, name: "Bụi Tinh Tú" },
            7: { id: 221, amount: 10, name: "Tinh Chất Ngân Hà" },
            8: { id: 221, amount: 25, name: "Tinh Chất Ngân Hà" },
            9: { id: 221, amount: 50, name: "Tinh Chất Ngân Hà" }
        };
        
        if (level >= 10) {
            tooltip += `-------------------\n✨ [CẢNH GIỚI TỐI ĐA]\nLõi Sao đã thức tỉnh hoàn toàn!`;
            // Cập nhật luôn chữ LÕI SAO thành LÕI TỐI THƯỢNG cho ngầu
            core.innerHTML = `
                <span style="font-size: 28px; filter: drop-shadow(0 0 15px #ff00ff);">🌌</span>
                <span style="color: #ffaa00; font-size: 14px; text-shadow: 0 0 10px #ff0000; margin-top: 3px; font-weight: bold;">LÕI TỐI THƯỢNG</span>
            `;
        } else {
            tooltip += `-------------------\nCần khảm đủ 4 viên Đá Rune Lv.${level}`;
        }

        core.setAttribute('data-tooltip', tooltip.trim());
    };

    // ==========================================
    // TOOLTIP RIÊNG CHO LÕI SAO (ASTRO-CORE)
    // ==========================================
    window.setupAstroCoreTooltip = function () {
        const coreEl = document.getElementById('astro-core');
        if (!coreEl) return;

        let tooltipEl = document.getElementById('astro-core-custom-tooltip');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'astro-core-custom-tooltip';
            tooltipEl.style.position = 'fixed';
            tooltipEl.style.zIndex = '99999999';
            tooltipEl.style.display = 'none';
            tooltipEl.style.maxWidth = '260px';
            tooltipEl.style.padding = '10px 14px';
            tooltipEl.style.background = 'rgba(10, 15, 25, 0.97)';
            tooltipEl.style.border = '1px solid #00ffff';
            tooltipEl.style.borderRadius = '8px';
            tooltipEl.style.color = '#fff';
            tooltipEl.style.fontSize = '13px';
            tooltipEl.style.fontFamily = 'Arial, sans-serif';
            tooltipEl.style.lineHeight = '1.5';
            tooltipEl.style.whiteSpace = 'pre-line';
            tooltipEl.style.boxShadow = '0 0 15px rgba(0,255,255,0.4)';
            tooltipEl.style.pointerEvents = 'none';
            document.body.appendChild(tooltipEl);
        }

        function showCoreTooltip() {
            const text = coreEl.getAttribute('data-tooltip');
            if (!text) return;
            tooltipEl.textContent = text;
            tooltipEl.style.display = 'block';
            positionCoreTooltip();
        }

        function hideCoreTooltip() {
            tooltipEl.style.display = 'none';
        }

        function positionCoreTooltip() {
            const coreRect = coreEl.getBoundingClientRect();
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const margin = 12;

            // HIỂN THỊ PHÍA TRÊN LÕI SAO
            let left =
                coreRect.left +
                (coreRect.width / 2) -
                (tooltipRect.width / 2);

            let top =
                coreRect.top -
                tooltipRect.height -
                margin;

            // Nếu bị tràn lên trên thì chuyển xuống dưới
            if (top < margin) {
                top = coreRect.bottom + margin;
            }

            // Không cho tràn trái
            if (left < margin) {
                left = margin;
            }

            // Không cho tràn phải
            if (left + tooltipRect.width > window.innerWidth - margin) {
                left = window.innerWidth - tooltipRect.width - margin;
            }

            tooltipEl.style.left = `${left}px`;
            tooltipEl.style.top = `${top}px`;
        }

        coreEl.addEventListener('mouseenter', showCoreTooltip);
        coreEl.addEventListener('mouseleave', hideCoreTooltip);
        window.addEventListener('resize', () => {
            if (tooltipEl.style.display === 'block') positionCoreTooltip();
        });
    };

    drawRadarChart();
    renderStatsList();
    loadPetsFromServer();
});