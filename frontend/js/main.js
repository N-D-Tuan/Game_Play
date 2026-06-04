import { analyzeHandGestures, getDrawingPath } from './gestures.js';
import { updateActionText, showNoHandDetected } from './ui_manager.js';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

canvasElement.width = 640;
canvasElement.height = 480;

// Hàm xử lý mỗi khung hình AI trả về
function onResults(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Vẽ khung xương tay
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 1});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
        }

        // 1. Gửi dữ liệu cho AI phân tích
        const action = analyzeHandGestures(results.multiHandLandmarks);
        updateActionText(action);

        // 2. VẼ HIỆU ỨNG ĐƯỜNG PHÉP THUẬT (DRAWING PATH)
        const path = getDrawingPath();
        if (path && path.length > 1) {
            canvasCtx.beginPath();
            // Tùy chỉnh màu sắc nét vẽ (Ví dụ: màu neon xanh dương)
            canvasCtx.strokeStyle = "rgba(0, 255, 255, 0.8)"; 
            canvasCtx.lineWidth = 6;
            canvasCtx.lineCap = "round";
            canvasCtx.lineJoin = "round";

            // Mediapipe trả tọa độ từ 0 đến 1. Phải nhân với kích thước Canvas để ra điểm ảnh thật.
            canvasCtx.moveTo(path[0].x * canvasElement.width, path[0].y * canvasElement.height);
            
            for (let i = 1; i < path.length; i++) {
                canvasCtx.lineTo(path[i].x * canvasElement.width, path[i].y * canvasElement.height);
            }
            canvasCtx.stroke();
        }

    } else {
        showNoHandDetected();
    }
}

// ==========================================
// PHẦN BỊ THIẾU: KHỞI TẠO AI VÀ BẬT CAMERA
// ==========================================

// Khởi tạo Model Mediapipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2, // Quét tối đa 2 tay
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// Lắng nghe kết quả và gọi hàm onResults ở trên
hands.onResults(onResults);

// Khởi chạy Camera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start();

document.addEventListener("DOMContentLoaded", () => {
    const homeScreen = document.getElementById('home-screen');
    const gameContainer = document.getElementById('game-container');
    const btnPractice = document.getElementById('btn-practice');
    
    // Xử lý sự kiện click nút TẬP LUYỆN
    btnPractice.addEventListener('click', () => {
        // 1. Làm mờ trang chủ (Nhờ CSS transition opacity đã cài ở trên)
        homeScreen.style.opacity = '0';
        
        // 2. Chờ 1 giây cho mờ hẳn rồi mới tắt và bật game lên
        setTimeout(() => {
            homeScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            
            // Fix lỗi UI bị lệch khi thẻ div chuyển từ display:none sang block
            window.dispatchEvent(new Event('resize')); 
        }, 1000);
    });

    // Xử lý các nút khác (Ví dụ)
    document.getElementById('btn-campaign').addEventListener('click', () => alert("Chế độ Vượt ải đang phát triển!"));
    document.getElementById('btn-inventory').addEventListener('click', () => alert("Kho đồ đang trống!"));

    // --- KHỞI TẠO LOGIC CHO BẢNG CÀI ĐẶT ---
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const tabAudio = document.getElementById('tab-audio');
    const tabControls = document.getElementById('tab-controls');
    const audioSettings = document.getElementById('audio-settings');
    const controlsSettings = document.getElementById('controls-settings');
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');

    let lastVolume = 0.5; // Lưu lại âm lượng cũ để khi bật lại loa không bị mất

    // Mở / Đóng bảng Cài đặt
    btnSettings.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
    closeSettings.addEventListener('click', () => { 
        settingsModal.style.display = 'none'; 
        
        // [MỚI THÊM]: Bật lại cảm ứng/click cho Game khi đóng bảng Cài đặt
        if (typeof game !== 'undefined' && game.scene && game.scene.scenes.length > 0) {
            game.scene.scenes[0].input.enabled = true;
        }
    });

    const blockEvents = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'click'];
    
    blockEvents.forEach(evt => {
        settingsModal.addEventListener(evt, (e) => {
            // Ngăn chặn sự kiện chuột truyền xuống lớp dưới cùng
            e.stopPropagation(); 
        });
    });

    // Chuyển Tab Âm lượng / Điều chỉnh
    tabAudio.addEventListener('click', () => {
        tabAudio.classList.add('active'); tabControls.classList.remove('active');
        audioSettings.style.display = 'block'; controlsSettings.style.display = 'none';
    });
    tabControls.addEventListener('click', () => {
        tabControls.classList.add('active'); tabAudio.classList.remove('active');
        controlsSettings.style.display = 'block'; audioSettings.style.display = 'none';
    });

    // Hàm cập nhật âm lượng vào Game Phaser
    const updateGameVolume = (vol) => {
        if (typeof bgMusic !== 'undefined' && bgMusic) {
            bgMusic.setVolume(vol);
        }
    };

    // Khi người dùng kéo thanh âm lượng
    volumeSlider.addEventListener('input', (e) => {
        let vol = parseFloat(e.target.value);
        if (vol > 0) {
            muteBtn.textContent = '🔮';
            lastVolume = vol; // Lưu lại mức này
        } else {
            muteBtn.textContent = '💀';
        }
        updateGameVolume(vol);
    });

    // Khi người dùng bấm vào icon Loa (Mute/Unmute)
    muteBtn.addEventListener('click', () => {
        if (volumeSlider.value > 0) { // Đang có tiếng -> Tắt tiếng
            muteBtn.textContent = '💀';
            volumeSlider.value = 0;
            updateGameVolume(0);
        } else { // Đang tắt tiếng -> Bật lại tiếng
            muteBtn.textContent = '🔮';
            volumeSlider.value = lastVolume === 0 ? 0.5 : lastVolume; // Trả về mức cũ hoặc 0.5
            updateGameVolume(volumeSlider.value);
        }
    });
});