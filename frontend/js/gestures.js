// ==========================================
// CÁC BIẾN QUẢN LÝ
// ==========================================
const COOLDOWNS = { DODGE: 1000, METEOR: 1000, SWORD: 5000, SHIELD: 5000, HEAL: 8000, LIGHTNING: 6000, EARTH: 5000, ARROWS: 5000, ANCHOR: 5000, DOLL: 12000 };
let lastUsedTimes = { DODGE: 0, METEOR: 0, SWORD: 0, SHIELD: 0, HEAL: 0, LIGHTNING: 0, EARTH: 0, ARROWS: 0, ANCHOR: 0, DOLL: 0 };

let displayState = { text: "MẶC ĐỊNH (Chờ ấn chú...)", expiresAt: 0 };
const DISPLAY_DURATION = 3000; 

let drawingPath = [];   
let isDrawing = false;  

// --- CÁC HÀM BỔ TRỢ ---
function calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

function isFingerOpenStrict(landmarks, tipIndex, pipIndex, wristIndex = 0) {
    const wrist = landmarks[wristIndex];
    return calculateDistance(landmarks[tipIndex], wrist) > calculateDistance(landmarks[pipIndex], wrist);
}

function setDisplayText(text, duration, now) {
    displayState.text = text;
    displayState.expiresAt = now + duration;
}

// ==========================================
// HÀM PHÂN TÍCH HÌNH VẼ
// ==========================================
function analyzeShape(path) {
    if (path.length < 15) return null; 

    const xs = path.map(p => p.x);
    const ys = path.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    
    const cx = minX + width / 2;
    const cy = minY + height / 2;

    const startPoint = path[0];
    const endPoint = path[path.length - 1];
    const distanceStartEnd = calculateDistance(startPoint, endPoint);

    // Thuật toán đếm số lần đảo chiều
    let xDirectionChanges = 0;
    let previousDirection = 0;
    let segmentStartX = path[0].x;

    let yDirectionChanges = 0;
    let previousYDirection = 0;
    let segmentStartY = path[0].y;

    let pointMinY = path[0], pointMaxY = path[0], pointMaxX = path[0];
    let pathLength = 0; // Biến đo tổng lượng mực đã vẽ

    for (let i = 1; i < path.length; i++) {
        let p = path[i];
        
        // Tính tổng độ dài nét vẽ
        pathLength += calculateDistance(path[i-1], p);
        
        // Đảo chiều X (Trái/Phải)
        let dx = p.x - segmentStartX;
        if (Math.abs(dx) > 0.04) {
            let currentDirection = Math.sign(dx);
            if (previousDirection !== 0 && currentDirection !== previousDirection) {
                xDirectionChanges++;
            }
            previousDirection = currentDirection;
            segmentStartX = p.x; 
        }

        // Đảo chiều Y (Lên/Xuống)
        let dy = p.y - segmentStartY;
        if (Math.abs(dy) > 0.04) {
            let currentYDirection = Math.sign(dy);
            if (previousYDirection !== 0 && currentYDirection !== previousYDirection) {
                yDirectionChanges++;
            }
            previousYDirection = currentYDirection;
            segmentStartY = p.y; 
        }

        // Tìm điểm Cực hạn
        if (p.y < pointMinY.y) pointMinY = p; 
        if (p.y > pointMaxY.y) pointMaxY = p; 
        if (p.x > pointMaxX.x) pointMaxX = p; 
    }

    // ==========================================
    // 0. NHẬN DIỆN HÌNH NHÂN (ƯU TIÊN SỐ 1 VÌ PHỨC TẠP NHẤT)
    // ==========================================
    // [SỬA LỖI]: Hình nhân cực kỳ tốn mực (Lớn hơn 2.2 lần chu vi khung) 
    // và có ít nhất 3 lần đảo chiều hướng vẽ.
    if (pathLength > (width + height) * 2.2 && (xDirectionChanges + yDirectionChanges >= 3)) {
        return { name: "🎎 HÌNH NHÂN THẾ MẠNG", key: "DOLL" };
    }

    const isClosed = distanceStartEnd < Math.max(width, height) * 0.3;

    // ==========================================
    // 1. NHẬN DIỆN CÁC HÌNH MỞ
    // ==========================================
    if (!isClosed) {
        if (xDirectionChanges >= 2 && height > 0.15 && width > 0.15) {
            return { name: "⚡ SẤM SÉT (Zic-zac)", key: "LIGHTNING" };
        }

        const isUpArrow = (startPoint.y - pointMinY.y > height * 0.4) && 
                          (endPoint.y - pointMinY.y > height * 0.4) &&
                          (Math.abs(startPoint.x - endPoint.x) > width * 0.3);
        
        if (isUpArrow && height > 0.1 && width > 0.15) {
            return { name: "⛰️ THỔ ĐỘN (Mũi tên hướng lên)", key: "EARTH" };
        }

        const isDownArrow = (pointMaxY.y - startPoint.y > height * 0.4) && 
                            (pointMaxY.y - endPoint.y > height * 0.4) &&
                            (Math.abs(startPoint.x - endPoint.x) > width * 0.3);

        if (isDownArrow && height > 0.1 && width > 0.15) {
            return { name: "⚓ TÀU CHIẾN (Mũi tên hướng xuống)", key: "ANCHOR" };
        }

        const isRightArrow = (pointMaxX.x - startPoint.x > width * 0.4) && 
                             (pointMaxX.x - endPoint.x > width * 0.4) &&
                             (Math.abs(startPoint.y - endPoint.y) > height * 0.3);

        if (isRightArrow && height > 0.15 && width > 0.1) {
            return { name: "🏹 VẠN TIỄN (Mũi tên hướng phải)", key: "ARROWS" };
        }
        
        if (height > 0.2 && height > width * 2) {
            return { name: "⚔️ PHI KIẾM (Đường kiếm dọc)", key: "SWORD" };
        }

        const isTopToBottom = startPoint.y < endPoint.y; 
        const isDiagonalProportion = width > height * 0.4 && height > width * 0.4; 

        if (isTopToBottom && isDiagonalProportion && xDirectionChanges < 2 && width > 0.15 && height > 0.15) {
            return { name: "☄️ THIÊN THẠCH (Đường chéo)", key: "METEOR" };
        }
    }

    // ==========================================
    // 2. NHẬN DIỆN HÌNH KHÉP KÍN (TRÁI TIM, LÁ CHẮN)
    // ==========================================
    if (isClosed && width > 0.1 && height > 0.1) {
        
        const startsTopMiddle = startPoint.y < cy && Math.abs(startPoint.x - cx) < width * 0.25;
        let lowestPoint = path[0];
        for (let p of path) if (p.y > lowestPoint.y) lowestPoint = p; 
        const lowestIsBottomMiddle = Math.abs(lowestPoint.x - cx) < width * 0.25;

        // [SỬA LỖI]: Bắt buộc 2 đỉnh của trái tim phải cao hơn điểm rãnh xuất phát
        const hasLobes = (startPoint.y - pointMinY.y) > height * 0.1;
        
        // [SỬA LỖI]: Trái tim là hình đơn giản, nét mực không được quá dài (Chống nhầm với Hình nhân)
        const isNotTooComplex = pathLength < (width + height) * 2.2;

        if (startsTopMiddle && lowestIsBottomMiddle && hasLobes && isNotTooComplex) {
             return { name: "💚 HỒI MÁU (Trái tim)", key: "HEAL" };
        }

        return { name: "🛡️ LÁ CHẮN (Khép kín)", key: "SHIELD" };
    }

    return null; 
}

export function getDrawingPath() {
    return drawingPath;
}

// ==========================================
// HÀM XỬ LÝ LOGIC CHÍNH
// ==========================================
export function analyzeHandGestures(multiHandLandmarks) {
    const now = Date.now();

    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
        if (now < displayState.expiresAt) return displayState.text;
        if (isDrawing) return "✨ Tạm mất dấu tay... (Giơ lại vào cam để vẽ tiếp)"; 
        return "MẶC ĐỊNH (Chờ ấn chú...)";
    }

    const landmarks = multiHandLandmarks[0];
    const indexTip = landmarks[8]; 
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    const isThumbOpen  = isFingerOpenStrict(landmarks, 4, 2, 0); 
    const isIndexOpen  = isFingerOpenStrict(landmarks, 8, 6, 0); 
    const isMiddleOpen = isFingerOpenStrict(landmarks, 12, 10, 0); 
    const isRingOpen   = isFingerOpenStrict(landmarks, 16, 14, 0); 
    const isPinkyOpen  = isFingerOpenStrict(landmarks, 20, 18, 0); 

    const isHoldingPen = isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen; 
    const isFist = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen; 
    const isOpenHand = isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen; 

    const leanDistance = middleMCP.x - wrist.x;

    if (isOpenHand && Math.abs(leanDistance) > 0.15) {
        if (isDrawing) {
            isDrawing = false;
            drawingPath = [];
        }

        const cooldownTime = COOLDOWNS.DODGE;
        const timeSinceLastUse = now - lastUsedTimes.DODGE;

        if (timeSinceLastUse > cooldownTime) {
            lastUsedTimes.DODGE = now;
            // NHỚ SỬA SỐ Ở DÒNG NÀY NỮA NHÉ:
            let dodgeText = leanDistance > 0.15 ? "⬅ NÉ TRÁI!" : "NÉ PHẢI! ➡";
            setDisplayText(dodgeText, DISPLAY_DURATION, now);
            return dodgeText;
        } else {
            let timeLeft = Math.ceil((cooldownTime - timeSinceLastUse) / 1000);
            setDisplayText(`⏳ Đang hồi chiêu Né (${timeLeft}s)`, 1000, now);
            return displayState.text;
        }
    }

    if (isHoldingPen) {
        isDrawing = true;
        drawingPath.push({ x: indexTip.x, y: indexTip.y });
        return "✨ Đang vẽ bùa... (Nắm tay để tung chiêu)";
    } 
    else if (isDrawing) {
        if (isFist) {
            isDrawing = false;
            const shapeResult = analyzeShape(drawingPath);
            drawingPath = []; 
            
            if (shapeResult) {
                const cooldownTime = COOLDOWNS[shapeResult.key];
                const timeSinceLastUse = now - lastUsedTimes[shapeResult.key];

                if (timeSinceLastUse > cooldownTime) {
                    lastUsedTimes[shapeResult.key] = now;
                    setDisplayText(shapeResult.name, DISPLAY_DURATION, now);
                } else {
                    let timeLeft = Math.ceil((cooldownTime - timeSinceLastUse) / 1000);
                    setDisplayText(`⏳ Đang hồi chiêu (${timeLeft}s)`, 1000, now);
                }
            } else {
                setDisplayText("❌ Ấn chú thất bại (Không rõ hình)!", 1000, now);
            }
        } 
        else if (isOpenHand) {
            isDrawing = false;
            drawingPath = [];
            setDisplayText("🗑️ Đã hủy ấn chú!", 1000, now);
        }
        else {
            return "✨ Tạm dừng bút... (Nắm tay để chốt, Xòe để hủy)";
        }
    }

    if (now < displayState.expiresAt) return displayState.text;
    return "MẶC ĐỊNH (Giơ ngón trỏ để vẽ)";
}