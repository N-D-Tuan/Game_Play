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

    // Hàm tạo hiệu ứng nhảy số (Chạy từ số cũ lên số mới)
    window.animateGoldValue = function(start, end, duration = 800) {
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Hàm easeOutQuad để số chạy chậm dần về cuối
            const easeProgress = progress * (2 - progress); 
            const currentVal = Math.floor(start + (end - start) * easeProgress);
            
            // Format số có dấu phẩy (VD: 50,000)
            goldText.innerText = currentVal.toLocaleString('en-US');
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                goldText.innerText = end.toLocaleString('en-US');
            }
        };
        window.requestAnimationFrame(step);
    };

    // Hàm gọi API lấy thông tin người chơi (Bao gồm Vàng)
    window.fetchPlayerData = async function() {
        let playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        try {
            // Giả sử Backend của bạn có API này để trả về thông tin player
            const response = await fetch(`http://127.0.0.1:8000/api/players/${playerId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                let newGold = data.player.gold;
                // Gọi hiệu ứng nhảy số từ số vàng hiện tại lên số Vàng mới
                window.animateGoldValue(window.currentGold, newGold);
                window.currentGold = newGold; // Cập nhật lại biến lưu trữ
            }
        } catch (error) {
            console.error("Lỗi khi tải thông tin người chơi:", error);
        }
    };

    // Gọi hàm fetch ngay khi load xong game
    window.fetchPlayerData();
    // ==========================================

    const homeScreen = document.getElementById('home-screen');
    const gameContainer = document.getElementById('game-container');
    const btnPractice = document.getElementById('btn-practice');
    const btnCampaign = document.getElementById('btn-campaign');
    
    // Nút Tập luyện (Restart Game)
    btnPractice.addEventListener('click', () => {
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

    btnCampaign.addEventListener('click', () => {
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

    // ==========================================
    // HỆ THỐNG KHO ĐỒ (INVENTORY SYSTEM) - ĐÃ CẬP NHẬT
    // ==========================================
    const btnInventory = document.getElementById('btn-inventory');
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
    const itemsPerPage = 35; // 35 là 5 hàng x 7 cột

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

    if (tabPetBtn) {
        tabPetBtn.addEventListener('click', () => {
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
        currentTab = 'equip';
        tabEquipBtn.classList.add('active');
        tabForgeBtn.classList.remove('active');
        tabPetBtn.classList.remove('active');

        viewEquip.style.display = 'flex'; 
        viewForge.style.display = 'none';
        viewPet.style.display = 'none';

        // KHI CHUYỂN VỀ TAB TRANG BỊ, TRẢ HẾT ĐỒ TRONG LÒ VỀ BALO
        if (forgeItems.length > 0) {
            myInventory.push(...forgeItems);
        }
        forgeItems = [];
        renderForge();    
        renderInventory();
    });

    tabForgeBtn.addEventListener('click', () => {
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
                        rarity: item.rarity,
                        stats: item.stats,
                        icon: item.icon,
                        upgrade_level: item.upgrade_level || 0
                    };

                    if (frontendItem.upgrade_level > 0) {
                        const STAT_MULTIPLIERS = {
                            1: 1.1,   // Cấp +1
                            2: 1.2,   // Cấp +2
                            3: 1.3,   // Cấp +3
                            4: 1.4,   // Cấp +4
                            5: 1.6,   // Cấp +5
                            6: 1.7,   // Cấp +6
                            7: 1.9,   // Cấp +7
                            8: 2.2,   // Cấp +8
                            9: 2.5,   // Cấp +9 
                            10: 3     // Cấp +10
                        };

                        let statMultiplier = STAT_MULTIPLIERS[frontendItem.upgrade_level] || 1;
                        
                        for (let statKey in frontendItem.stats) {
                            let baseValue = frontendItem.stats[statKey];
                            frontendItem.stats[statKey] = Math.round(baseValue * statMultiplier);
                        }
                    }

                    if (item.is_equipped == 1) {
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
                        if(frontendItem.rarity === 'S') slotDiv.style.boxShadow = `0 0 10px #ffffff`;
                    } else {
                        // ==========================================
                        // TÁCH NGUYÊN LIỆU VÀ TRANG BỊ
                        // ==========================================
                        if (frontendItem.slot === 'material') {
                            if (!materialsMap[frontendItem.item_id]) materialsMap[frontendItem.item_id] = [];
                            materialsMap[frontendItem.item_id].push(frontendItem);
                        } else {
                            otherItems.push(frontendItem); 
                        }
                    }
                });

                let groupedMaterials = [];

                for (let itemId in materialsMap) {
                    let itemsOfThisType = materialsMap[itemId];
                    while (itemsOfThisType.length > 0) {
                        let chunk = itemsOfThisType.splice(0, 50); // Cắt 50 phần tử
                        let stackItem = { ...chunk[0] };     // Lấy 1 món làm đại diện hiển thị
                        stackItem.quantity = chunk.length;   // Gắn số lượng (1 đến 50)
                        
                        // Lưu mảng ID gốc để sau này API trừ vật phẩm có thể trừ chính xác
                        stackItem.stacked_ids = chunk.map(i => i.id); 
                        
                        groupedMaterials.push(stackItem);
                    }
                }

                myInventory = [...groupedMaterials, ...otherItems];

                // Cập nhật lại UI
                updateStatsUI();
                renderInventory();
            }
        } catch (error) {
            console.error("Lỗi kết nối Server:", error);
            showDarkFantasyAlert("Mất kết nối đến máy chủ!");
        }
    }

    btnInventory.addEventListener('click', () => { 
        inventoryModal.style.display = 'flex'; 
        loadInventoryFromServer(); 
    });
    closeInventory.addEventListener('click', () => { 
        inventoryModal.style.display = 'none'; 

        // KIỂM TRA VÀ TRẢ LẠI ĐỒ TRONG LÒ RÈN VỀ BALO
        if (typeof forgeItems !== 'undefined') {
            if (forgeItems.length > 0) {
                myInventory.push(...forgeItems); 
            }
            forgeItems = [];       
            renderForge();       
            renderInventory();     
        }
        
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
                // Sau khi server xử lý xong, tải lại kho đồ để cập nhật UI
                await loadInventoryFromServer();
                console.log("Cập nhật trang bị thành công!");
            } else {
                showDarkFantasyAlert("Không thể thao tác trang bị!");
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
        }
    }

    function updateStatsUI() {
        let currentStats = { ...BASE_STATS };
        for (let slot in equippedItems) {
            let item = equippedItems[slot];
            if (item && item.stats) {
                for (let statKey in item.stats) {
                    if(currentStats[statKey] !== undefined) currentStats[statKey] += item.stats[statKey];
                }
            }
        }

        if (window.equippedPet) {
            let pInfo = window.equippedPet.pet;
            let lvl = window.equippedPet.level;
            currentStats.hp += Math.round(pInfo.base_hp + (lvl - 1) * pInfo.growth_hp);
            currentStats.hpRegen += Math.round(pInfo.base_hp_regen + (lvl - 1) * pInfo.growth_hp_regen);
            currentStats.atk += Math.round(pInfo.base_atk + (lvl - 1) * pInfo.growth_atk);
            currentStats.dodge += Math.round(pInfo.base_dodge + (lvl - 1) * pInfo.growth_dodge);
            currentStats.critRate += Math.round(pInfo.base_crit_rate + (lvl - 1) * pInfo.growth_crit_rate);
            currentStats.critDamage += Math.round(pInfo.base_crit_damage + (lvl - 1) * pInfo.growth_crit_damage);
            currentStats.lifesteal += Math.round(pInfo.base_lifesteal + (lvl - 1) * pInfo.growth_lifesteal);
            currentStats.speed += Math.round(pInfo.base_speed + (lvl - 1) * pInfo.growth_speed);

            window.playerStats = { ...currentStats };
            
            // ==========================================
            // ĐỌC BUFF ĐỘNG TỪ TRẬN CHIẾN
            // ==========================================
            // Kiểm tra xem game có đang chạy màn Vượt Ải hay không
            let activeScene = window.game && window.game.scene.isActive('CampaignScene') ? window.game.scene.getScene('CampaignScene') : null;
            
            // Nếu đang trong trận, lấy các buff tạm thời (Máu < 50% hoặc đang bật chiêu O) cộng vào UI
            if (activeScene && activeScene.player) {                
                let dynamicBuffs = getPetDynamicBuffs(activeScene, pInfo.pet_code, lvl);

                //Kiến xanh
                currentStats.lifesteal += (dynamicBuffs.lifesteal || 0);
                currentStats.hpRegen += (dynamicBuffs.hpRegen || 0);

                //Kiến đỏ
                currentStats.atk += Math.round(currentStats.atk * ((dynamicBuffs.atkPercent || 0) / 100)); 
                currentStats.critRate += (dynamicBuffs.critRate || 0);
                currentStats.dodge += (dynamicBuffs.dodge || 0);
            }
        }

        document.getElementById('stat-hp').textContent = currentStats.hp;
        document.getElementById('stat-hpRegen').textContent = currentStats.hpRegen;
        document.getElementById('stat-atk').textContent = currentStats.atk;
        document.getElementById('stat-dodge').textContent = currentStats.dodge + '%';
        if(document.getElementById('stat-critRate')) document.getElementById('stat-critRate').textContent = currentStats.critRate + '%';
        if(document.getElementById('stat-critDamage')) document.getElementById('stat-critDamage').textContent = currentStats.critDamage + '%';
        if(document.getElementById('stat-lifesteal')) document.getElementById('stat-lifesteal').textContent = currentStats.lifesteal + '%';
        if(document.getElementById('stat-speed')) document.getElementById('stat-speed').textContent = currentStats.speed;
    }
    
    updateStatsUI();

    // TẠO TOOLTIP THỐNG NHẤT
    function buildTooltip(item) {
        let upgradeText = (item.upgrade_level && item.upgrade_level > 0) ? ` +${item.upgrade_level}` : '';
        
        let html = `[Bậc ${item.rarity}] ${item.name.toUpperCase()}${upgradeText}\n`;

        let tooltip = `[${RARITY_CONFIG[item.rarity].name}] ${item.name.toUpperCase()}\nPhẩm chất: Bậc ${item.rarity}\n-------------------\n`;
        for(let stat in item.stats) {
            if(STAT_NAMES[stat]) {
                let suffix = (stat === 'dodge') ? '%' : '';
                tooltip += `${STAT_NAMES[stat]}: ${item.stats[stat]}${suffix}\n`;
            }
        }
        return tooltip.trim();
    }

    // CLICK ĐỂ MẶC TRANG BỊ
    async function equipItem(item) {
        if (item.slot === 'material') {
            showDarkFantasyAlert("Không thể mặc nguyên liệu lên người!");
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
                matchFilter = item.slot !== 'material'; // Bỏ qua nguyên liệu
            } else if (filterMode === 'material') {
                matchFilter = item.slot === 'material'; // Chỉ lấy nguyên liệu
            }

            return matchSearch && matchFilter;
        });

        filteredItems.sort((a, b) => {
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
            if(item.rarity === 'S') { div.style.boxShadow = `0 0 10px #ffffff`; }

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
                    if (currentForgeMode === 'merge') {
                        addToForge(item);
                    } else if (currentForgeMode === 'upgrade') {
                        // Logic bỏ vào đe cường hóa
                        if (item.rarity !== 'S' || item.slot === 'material') {
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

                    // Không cho ăn mảnh trứng (212) hoặc trứng (213)
                    if (item.slot === 'material' || item.type === 'material' || item.item_id === 212 || item.item_id === 213){
                        showDarkFantasyAlert("Không thể cho thú cưng ăn vật phẩm này!");
                        return;
                    }

                    if (!currentSelectedPet) {
                        showDarkFantasyAlert("Vui lòng chọn Thú cưng trước!");
                        return;
                    }                   
                    
                    // Bật Popup xác nhận cho ăn
                    document.getElementById('feed-modal').style.display = 'flex';
                    document.getElementById('feed-pet-name').innerText = currentSelectedPet.pet.name;
                    // Xử lý hiệu ứng chữ tỏa sáng cho Bậc S
                    let feedNameEl = document.getElementById('feed-item-name');
                    feedNameEl.innerText = `[Bậc ${item.rarity}] ${item.name}`;
                    feedNameEl.style.color = rankInfo.color;
                    
                    if (item.rarity === 'S') {
                        feedNameEl.style.textShadow = '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 10px #ffffff';
                    } else {
                        feedNameEl.style.textShadow = 'none'; // Reset lại bóng nếu là các bậc khác
                    }
                    
                    let expRates = { 'F': 10, 'E': 30, 'D': 100, 'C': 500, 'B': 2000, 'A': 10000, 'S': 30000 };
                    document.getElementById('feed-exp-amount').innerText = expRates[item.rarity] || 0;
                    
                    window.pendingFeedItemIds = [item.id]; // Lưu lại ID để nạp vào API
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
        if (item.slot === 'material') {
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

        // Kiểm tra tính đồng nhất (Chỉ cho phép ghép đồ CÙNG BẬC)
        if (forgeItems.length > 0) {
            let sampleItem = forgeItems[0];
            if (item.rarity !== sampleItem.rarity) {
                showDarkFantasyAlert("Vật phẩm hiến tế phải có CÙNG BẬC PHẨM CHẤT!");
                return;
            }
        }

        // Đưa vào lò và xóa khỏi Balo
        forgeItems.push(item);
        myInventory = myInventory.filter(invItem => invItem.id !== item.id);
        
        renderForge();
        renderInventory();
    }

    function removeFromForge(index) {
        let item = forgeItems[index];
        if (item) {
            // Trả về balo và xóa khỏi lò
            myInventory.push(item);
            forgeItems.splice(index, 1);
            
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
                if(item.rarity === 'S') slot.style.boxShadow = `0 0 10px #ffffff`; else slot.style.boxShadow = 'none';

                // Click vào ô trong lò để rút đồ ra
                slot.onclick = () => removeFromForge(index);
            } else {
                // Ô trống
                slot.innerHTML = '';
                slot.style.borderColor = '#555';
                slot.style.boxShadow = 'none';
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
            slot.style.boxShadow = `0 0 15px #ffffff`;

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
            slot.innerHTML = '<span class="slot-label" style="opacity: 0.5;">Trống</span>';
            slot.style.borderColor = '#555';
            slot.style.boxShadow = 'none';
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
                    // Cập nhật cho Luyện tập
                    if (window.SKILL_CONFIG && window.SKILL_CONFIG[keyName]) {
                        window.SKILL_CONFIG[keyName].hotkey = newKey;
                    }

                    // [FIX ĐỒNG BỘ VƯỢT ẢI]: Cập nhật thẳng vào biến được Import trực tiếp từ skills.js
                    if (SKILL_CAMPAIGN_CONFIG && SKILL_CAMPAIGN_CONFIG[keyName]) {
                        SKILL_CAMPAIGN_CONFIG[keyName].hotkey = newKey;
                    }

                    // Ép màn hình vẽ lại UI ngay lập tức
                    try { 
                        if (typeof window.refreshSkillHotkeysUI === 'function') window.refreshSkillHotkeysUI(); 
                    } catch (error) {}
                    
                    try { 
                        if (typeof window.refreshCampaignSkillHotkeysUI === 'function') window.refreshCampaignSkillHotkeysUI(); 
                    } catch (error) {}
                } else if (type === 'pet_skill') {
                    window.PET_SKILL_HOTKEYS[keyName] = newKey;
                    // Ép màn hình Vượt Ải vẽ lại chữ trên icon nếu đang mở
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
        btnForgeSubmit.addEventListener('click', async () => {
            // 1. Kiểm tra điều kiện đầu vào
            let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
            if (isCampaignActive) {
                showDarkFantasyAlert("Không thể hiến tế khi đang Vượt Ải!");
                return; 
            }

            if (forgeItems.length < 10) {
                showDarkFantasyAlert("Lò rèn yêu cầu đúng 10 vật phẩm để khởi động!");
                return;
            }

            // 2. Gom 10 cái ID lại thành 1 mảng để gửi lên Server
            const materialIds = forgeItems.map(item => item.id);
            let playerId = localStorage.getItem('playerId') || '1';

            try {
                // Khóa nút và đổi text để tránh người chơi spam click
                btnForgeSubmit.textContent = "Đang rèn...";
                btnForgeSubmit.disabled = true;

                // 3. Gọi API
                const response = await fetch('http://127.0.0.1:8000/api/forge/merge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        player_id: playerId,
                        materials: materialIds
                    })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Làm trống lò rèn ở biến JS (vì đồ đã bị Server xóa)
                    forgeItems = [];
                    
                    // Render lại lò rèn (để xóa hình ảnh 10 nguyên liệu đi)
                    renderForge();

                    // Xử lý giao diện dựa trên nhân phẩm của người chơi
                    if (data.result === 'success') {
                        showDarkFantasyAlert(data.message);
                        displayForgeResult(data.item, 'success');
                    } else if (data.result === 'fail') {
                        showDarkFantasyAlert(data.message);
                        displayForgeResult(data.survived_item, 'fail'); 
                    }                   
                    
                    // Gọi API load lại kho đồ để lấy dữ liệu mới nhất
                    await loadInventoryFromServer();

                } else {
                    showDarkFantasyAlert(data.message || "Có lỗi xảy ra trong lò rèn!");
                }

            } catch (error) {
                console.error("Lỗi Lò rèn:", error);
                showDarkFantasyAlert("Mất kết nối đến Lò rèn!");
            } finally {
                // Trả lại trạng thái bình thường cho nút
                btnForgeSubmit.textContent = "Tiến hành hiến tế";
                btnForgeSubmit.disabled = false;
            }
        });
    }

    // Hàm vẽ món đồ kết quả ra ô trung tâm Lò rèn
    function displayForgeResult(itemData, status) {
        const resultSlot = document.getElementById('forge-result');
        if (!resultSlot) return;

        let rankInfo = RARITY_CONFIG[itemData.rarity];
        let imagePath = `../assets/items/${itemData.icon}`;
        let textShadow = itemData.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';

        // Gắn tooltip cơ bản cho món đồ kết quả
        resultSlot.setAttribute('data-tooltip', `[${rankInfo.name}] ${itemData.name.toUpperCase()}\nPhẩm chất: Bậc ${itemData.rarity}`);

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

        // 1. Quét Balo lấy ra các trang bị Bậc F và E (Không tính đồ đang mặc, không tính trứng)
        let trashItems = myInventory.filter(item => 
            (item.rarity === 'F' || item.rarity === 'E') &&
            item.slot !== 'material' && 
            item.type !== 'material' &&
            item.item_id !== 212 && item.item_id !== 213
        );

        if (trashItems.length === 0) {
            return showDarkFantasyAlert("Không tìm thấy trang bị Bậc F hoặc E nào trong Balo!");
        }

        // 2. Tính toán EXP
        let expRates = { 'F': 10, 'E': 30 };
        let totalExp = trashItems.reduce((sum, item) => sum + (expRates[item.rarity] || 0), 0);

        // 3. Đưa ID các trang bị rác vào biến lưu trữ để API sử dụng
        window.pendingFeedItemIds = trashItems.map(item => item.id);

        // 4. Hiển thị thông số lên Modal và mở Modal
        document.getElementById('fast-feed-count').innerText = trashItems.length;
        document.getElementById('fast-feed-total-exp').innerText = totalExp;
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
    const contentMerge = document.getElementById('forge-merge-content');
    const contentUpgrade = document.getElementById('forge-upgrade-content');

    subtabMerge.addEventListener('click', () => {
        currentForgeMode = 'merge';
        subtabMerge.style.background = 'linear-gradient(90deg, transparent, #8b0000, transparent)';
        subtabMerge.style.borderColor = '#ff0000'; subtabMerge.style.color = '#fff'; subtabMerge.style.boxShadow = '0 0 10px #ff0000';
        subtabUpgrade.style.background = 'transparent'; subtabUpgrade.style.borderColor = '#555'; subtabUpgrade.style.color = '#888'; subtabUpgrade.style.boxShadow = 'none';
        contentMerge.style.display = 'flex'; contentUpgrade.style.display = 'none';
    });

    subtabUpgrade.addEventListener('click', () => {
        currentForgeMode = 'upgrade';
        subtabUpgrade.style.background = 'linear-gradient(90deg, transparent, #0055aa, transparent)';
        subtabUpgrade.style.borderColor = '#00aaff'; subtabUpgrade.style.color = '#fff'; subtabUpgrade.style.boxShadow = '0 0 10px #00aaff';
        subtabMerge.style.background = 'transparent'; subtabMerge.style.borderColor = '#555'; subtabMerge.style.color = '#888'; subtabMerge.style.boxShadow = 'none';
        contentMerge.style.display = 'none'; contentUpgrade.style.display = 'flex';
        renderUpgradeUI();
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

    loadPetsFromServer();
});