import { CampaignScene } from './campaign.js';
import { SKILL_CAMPAIGN_CONFIG } from './skills.js';

document.addEventListener("DOMContentLoaded", () => {
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
                window.game.scene.start('CampaignScene');
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
    const viewEquip = document.getElementById('view-equip');
    const viewForge = document.getElementById('view-forge');

    let currentTab = 'equip';
    let forgeItems = [];

    tabEquipBtn.addEventListener('click', () => {
        currentTab = 'equip';
        tabEquipBtn.classList.add('active');
        tabForgeBtn.classList.remove('active');
        viewEquip.classList.add('active');
        viewForge.classList.remove('active');
    });

    tabForgeBtn.addEventListener('click', () => {
        currentTab = 'forge';
        tabForgeBtn.classList.add('active');
        tabEquipBtn.classList.remove('active');
        viewForge.classList.add('active');
        viewEquip.classList.remove('active');
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

    // Chỉ còn 4 chỉ số theo yêu cầu
    const STAT_NAMES = { hp: '+ Máu tối đa', atk: '+ Tấn công', hpRegen: '+ Hồi máu/s', dodge: '+ Tỉ lệ né (%)' };
    const BASE_STATS = { hp: 1000, hpRegen: 5, atk: 50, dodge: 5 };

    let equippedItems = { head: null, chest: null, legs: null, weapon: null, accessory: null, shoes: null };

    // Dữ liệu mẫu (Lọc bỏ các chỉ số dư thừa)
    let myInventory = [
        { id: 1, name: 'Kiếm Sắt Gỉ', slot: 'weapon', rarity: 'F', stats: { atk: 10 }, icon: '🗡️' },
        { id: 2, name: 'Gươm Ác Quỷ', slot: 'weapon', rarity: 'A', stats: { atk: 250 }, icon: '🩸' },
        { id: 3, name: 'Áo Vải Thô', slot: 'chest', rarity: 'E', stats: { hp: 50 }, icon: '👕' },
        { id: 4, name: 'Giáp Thần Quang', slot: 'chest', rarity: 'S', stats: { hp: 2000, hpRegen: 50 }, icon: '🎽' },
        { id: 5, name: 'Nhẫn Sinh Mệnh', slot: 'accessory', rarity: 'B', stats: { hpRegen: 25 }, icon: '💍' },
        { id: 6, name: 'Hắc Kiếm Thần', slot: 'weapon', rarity: 'B', stats: { atk: 30, dodge: 3 }, icon: '⚔️' },
        { id: 7, name: 'Giày Bóng Đêm', slot: 'shoes', rarity: 'C', stats: { dodge: 15 }, icon: '👢' },
        { id: 8, name: 'Kiếm Sắt Gỉ', slot: 'weapon', rarity: 'S', stats: { atk: 999 }, icon: '🗡️' },
        { id: 9, name: 'Hắc Kiếm Thần', slot: 'weapon', rarity: 'S', stats: { atk: 999, dodge: 10 }, icon: '⚔️' }
    ];
    // Bạn có thể duplicate các item ra để test phân trang
    for(let i=10; i<=100; i++) myInventory.push({ id: i, name: 'Đá Vụn', slot: 'accessory', rarity: 'F', stats: { hp: 1 }, icon: '🪨' });

    btnInventory.addEventListener('click', () => { 
        inventoryModal.style.display = 'flex'; 
        updateStatsUI(); 
        renderInventory(); 
    });
    closeInventory.addEventListener('click', () => { 
        inventoryModal.style.display = 'none'; 
        
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
        window.playerStats = currentStats;

        document.getElementById('stat-hp').textContent = currentStats.hp;
        document.getElementById('stat-hpRegen').textContent = currentStats.hpRegen;
        document.getElementById('stat-atk').textContent = currentStats.atk;
        document.getElementById('stat-dodge').textContent = currentStats.dodge + '%';
    }
    
    updateStatsUI();

    // TẠO TOOLTIP THỐNG NHẤT
    function buildTooltip(item) {
        let tooltip = `[${RARITY_CONFIG[item.rarity].name}] ${item.name.toUpperCase()}\nPhẩm chất: Bậc ${item.rarity}\n-------------------\n`;
        for(let stat in item.stats) {
            if(STAT_NAMES[stat]) {
                let suffix = (stat === 'dodge') ? '%' : '';
                tooltip += `${STAT_NAMES[stat]}: ${item.stats[stat]}${suffix}\n`;
            }
        }
        return tooltip.trim();
    }

    function equipItem(item) {
        let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
        if (isCampaignActive) {
            showDarkFantasyAlert("Không thể mặc trang bị khi đang Vượt Ải!");
            return;
        }

        let oldItem = equippedItems[item.slot];
        if (oldItem) myInventory.push(oldItem);
        
        equippedItems[item.slot] = item;
        myInventory = myInventory.filter(invItem => invItem.id !== item.id);
        
       // Tạo hiệu ứng viền trắng phát sáng độc quyền cho bậc S
        let textShadow = item.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';
        
        // Vẽ đồ lên khe nhân vật và Gắn Tooltip
        let slotDiv = document.getElementById(`slot-${item.slot}`);
        slotDiv.innerHTML = `<span>${item.icon}</span><span class="item-rank" style="color: ${RARITY_CONFIG[item.rarity].color}; ${textShadow}">${item.rarity}</span>`;
        slotDiv.style.borderColor = RARITY_CONFIG[item.rarity].color;
        slotDiv.setAttribute('data-tooltip', buildTooltip(item)); // Hiện thông tin khi di chuột vào người
        
        if(item.rarity === 'S') slotDiv.style.boxShadow = `0 0 10px #ffffff`; else slotDiv.style.boxShadow = 'none';

        updateStatsUI();
        renderInventory();
    }

    // DOUBLE CLICK ĐỂ THÁO TRANG BỊ
    document.querySelectorAll('.equip-slot').forEach(slotDiv => {
        slotDiv.addEventListener('dblclick', () => {
            let isCampaignActive = window.game && window.game.scene.isActive('CampaignScene');
            if (isCampaignActive) {
                showDarkFantasyAlert("Không thể tháo trang bị khi đang Vượt Ải!");
                return;
            }

            let slotName = slotDiv.getAttribute('data-slot');
            let item = equippedItems[slotName];
            if (item) {
                myInventory.push(item); // Vứt về túi
                equippedItems[slotName] = null; // Xóa khỏi người
                
                // Trả ô về trạng thái "Trống" nguyên bản
                const slotLabels = { head: 'Mũ', chest: 'Áo', legs: 'Quần', weapon: 'Vũ khí', accessory: 'Bổ trợ', shoes: 'Giày' };
                slotDiv.innerHTML = `<span class="slot-label" style="opacity: 0.5">${slotLabels[slotName]}</span>`;
                slotDiv.style.borderColor = '#555';
                slotDiv.style.boxShadow = 'none';
                slotDiv.removeAttribute('data-tooltip'); // Xóa Tooltip

                updateStatsUI();
                renderInventory();
            }
        });
    });

    // VẼ BALO & PHÂN TRANG
    function renderInventory() {
        invGrid.innerHTML = ''; 
        let keyword = invSearch.value.toLowerCase();
        let sortMode = invSort.value;

        let filteredItems = myInventory.filter(item => item.name.toLowerCase().includes(keyword));

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
            let textShadow = item.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';
            
            div.innerHTML = `<span>${item.icon}</span><span class="item-rank" style="color: ${rankInfo.color}; ${textShadow}">${item.rarity}</span>`;
            div.setAttribute('data-tooltip', buildTooltip(item));
            div.style.borderColor = rankInfo.color;
            if(item.rarity === 'S') { div.style.boxShadow = `0 0 10px #ffffff`; div.style.borderColor = '#ffffff'; }

            // SỰ KIỆN CLICK ĐỘNG (Dựa theo Tab hiện tại)
            div.addEventListener('click', () => {
                if (currentTab === 'equip') {
                    equipItem(item);
                } else if (currentTab === 'forge') {
                    addToForge(item);
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
    
    // Nút điều khiển Lật trang
    btnPrevPage.addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderInventory(); } });
    btnNextPage.addEventListener('click', () => { currentPage++; renderInventory(); });

    // ==========================================
    // LOGIC LÒ RÈN (BỎ VÀO LÒ & RÚT RA)
    // ==========================================
    function addToForge(item) {
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

        // Kiểm tra tính đồng nhất (Chỉ cho phép ghép đồ CÙNG TÊN và CÙNG BẬC)
        if (forgeItems.length > 0) {
            let sampleItem = forgeItems[0];
            if (item.name !== sampleItem.name || item.rarity !== sampleItem.rarity) {
                showDarkFantasyAlert("Vật phẩm hiến tế phải giống hệt nhau!");
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
                let textShadow = item.rarity === 'S' ? 'text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 8px #fff;' : '';
                
                slot.innerHTML = `<span>${item.icon}</span><span class="item-rank" style="color: ${rankInfo.color}; ${textShadow}">${item.rarity}</span>`;
                slot.style.borderColor = rankInfo.color;
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

        // Reset lại ô ở giữa (Đề phòng trường hợp đang có đồ thành công mà bạn rút bớt nguyên liệu ra)
        document.getElementById('forge-result').innerHTML = '?';
        document.getElementById('forge-result').style.borderColor = '#ffcc00';
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
                
                // [ĐÃ FIX]: Sau khi nhập xong thì khóa lại, tháo hoàn toàn sự kiện lắng nghe bàn phím
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
});