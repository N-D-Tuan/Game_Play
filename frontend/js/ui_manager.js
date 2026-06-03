let lastAction = ""; // Biến lưu vết để chống Spam Event

export function updateActionText(action) {
    // Đưa lệnh tìm thẻ vào trong hàm để đảm bảo HTML đã load xong
    const actionTextElement = document.getElementById('action-text');
    
    if (actionTextElement) {
        actionTextElement.innerText = action;
    }

    // --- CÂY CẦU NỐI AI VỚI GAME ---
    if (action && action !== lastAction) {
        lastAction = action;
        
        // Tạo một sự kiện mang tên 'PlayerAction' gửi sang game.js
        const event = new CustomEvent('PlayerAction', { detail: action });
        window.dispatchEvent(event);
    }
}

export function showNoHandDetected() {
    const actionTextElement = document.getElementById('action-text');
    if (actionTextElement) {
        actionTextElement.innerText = "MẶC ĐỊNH (Chờ ấn chú...)";
    }
}