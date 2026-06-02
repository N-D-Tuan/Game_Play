const statusText = document.getElementById('action-status');

export function updateActionText(actionString) {
    if (actionString) {
        statusText.innerText = actionString;
    } else {
        statusText.innerText = "Đang chờ ấn chú...";
    }
}

export function showNoHandDetected() {
    statusText.innerText = "Không thấy tay pháp sư!";
}