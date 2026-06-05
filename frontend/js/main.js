document.addEventListener("DOMContentLoaded", () => {
    const homeScreen = document.getElementById('home-screen');
    const gameContainer = document.getElementById('game-container');
    const btnPractice = document.getElementById('btn-practice');
    
    // Nút Tập luyện (Restart Game)
    btnPractice.addEventListener('click', () => {
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            if (typeof game !== 'undefined' && game.scene && game.scene.scenes.length > 0) {
                game.scene.scenes[0].scene.restart();
            }
            window.dispatchEvent(new Event('resize')); 
        }, 1000);
    });

    document.getElementById('btn-campaign').addEventListener('click', () => alert("Chế độ Vượt ải đang phát triển!"));
    document.getElementById('btn-inventory').addEventListener('click', () => alert("Kho đồ đang trống!"));

    // --- LOGIC BẢNG CÀI ĐẶT ---
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    
    // Đóng mở Cài đặt
    btnSettings.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
    closeSettings.addEventListener('click', () => { 
        settingsModal.style.display = 'none'; 
        if (typeof game !== 'undefined' && game.scene && game.scene.scenes.length > 0) {
            game.scene.scenes[0].input.enabled = true; // Bật lại tương tác game
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

    keyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (isWaitingForKey) return; // Nếu đang chờ phím khác thì bỏ qua
            isWaitingForKey = true;
            
            const originalText = btn.textContent;
            btn.textContent = 'ẤN...';
            btn.classList.add('waiting');

            const keydownHandler = (keyEvent) => {
                keyEvent.preventDefault(); // Tránh bị cuộn trang
                let newKey = keyEvent.key === ' ' ? 'SPACE' : keyEvent.key.toUpperCase();
                
                // Cập nhật giao diện HTML
                btn.textContent = newKey;
                btn.classList.remove('waiting');
                
                // Ghi đè vào Cấu hình toàn cục để game.js nhận được
                const type = btn.getAttribute('data-type');
                const keyName = btn.getAttribute('data-key');

                if (type === 'move') {
                    window.MOVE_CONFIG[keyName] = newKey;
                } else if (type === 'skill') {
                    window.SKILL_CONFIG[keyName].hotkey = newKey;
                    // Gọi hàm cập nhật Text số hiển thị trên UI Kỹ năng trong game
                    if (window.refreshSkillHotkeysUI) window.refreshSkillHotkeysUI();
                }

                isWaitingForKey = false;
                document.removeEventListener('keydown', keydownHandler);
            };

            document.addEventListener('keydown', keydownHandler);
        });
    });

    // --- LOGIC ÂM LƯỢNG (Giữ nguyên như cũ) ---
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');
    let lastVolume = 0.5;

    const updateGameVolume = (vol) => { if (typeof bgMusic !== 'undefined' && bgMusic) bgMusic.setVolume(vol); };

    volumeSlider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        if (vol > 0) { muteBtn.textContent = '🔮'; lastVolume = vol; } else { muteBtn.textContent = '💀'; }
        updateGameVolume(vol);
    });

    muteBtn.addEventListener('click', () => {
        if (volumeSlider.value > 0) { 
            muteBtn.textContent = '💀'; volumeSlider.value = 0; updateGameVolume(0);
        } else { 
            muteBtn.textContent = '🔮'; volumeSlider.value = lastVolume === 0 ? 0.5 : lastVolume; updateGameVolume(volumeSlider.value);
        }
    });
});