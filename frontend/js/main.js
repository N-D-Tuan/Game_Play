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