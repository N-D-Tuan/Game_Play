// ==========================================
// FILE: js/skills.js
// ==========================================

// Cấu hình Kỹ năng cho chế độ Vượt ải
export const SKILL_CAMPAIGN_CONFIG = {
    'meteor':   { name: "☄️ THIÊN THẠCH", icon: 'fireball',   cd: 3000,     currentCd: 0, level: 0, ui: null, hotkey: '1' },
    'swords':   { name: "⚔️ PHI KIẾM",    icon: 'sword',      cd: 5000,     currentCd: 0, level: 0, ui: null, hotkey: '2' },
    'lightning':{ name: "⚡ SẤM SÉT",     icon: 'lightning1', cd: 7000,     currentCd: 0, level: 0, ui: null, hotkey: '3' },
    'shield':   { name: "🛡️ LÁ CHẮN",     icon: 'shield',     cd: 12000,    currentCd: 0, level: 0, ui: null, hotkey: '4' },
    'heal':     { name: "💚 HỒI MÁU",     icon: 'heal',       cd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '5' },
    'earth':    { name: "⛰️ THỔ ĐỘN",     icon: 'earth2',     cd: 10000,    currentCd: 0, level: 0, ui: null, hotkey: '6' },
    'arrows':   { name: "🏹 VẠN TIỄN",    icon: 'arrows',     cd: 8000,     currentCd: 0, level: 0, ui: null, hotkey: '7' },
    'anchor':   { name: "⚓ TÀU CHIẾN",   icon: 'anchor',     cd: 15000,    currentCd: 0, level: 0, ui: null, hotkey: '8' },
    'doll':     { name: "🎎 HÌNH NHÂN",   icon: 'doll',       cd: 20000,    currentCd: 0, level: 0, ui: null, hotkey: '9' },
};

// Định nghĩa màu sắc viền theo cấp độ Tiến hóa
const EVO_COLORS = [
    0x00ffff, // Level 0: Mặc định (Xanh lục/Cyan như ảnh gốc)
    0x9b59b6, // Level 1: Tiến hóa lần 1 (Tím Dark Fantasy)
    0xffd700  // Level 2: Tiến hóa lần 2 (Vàng Kim/Gold)
];

// Hàm Nâng cấp (Tiến hóa) kỹ năng
export function evolveSkill(skillKey) {
    let skill = SKILL_CAMPAIGN_CONFIG[skillKey];
    if (skill.level < 2) {
        skill.level += 1; // Tăng cấp
        
        // Cập nhật sức mạnh (Giảm hồi chiêu hoặc tăng sát thương tùy ý)
        skill.cd = skill.cd * 0.8; // Ví dụ: Giảm 20% thời gian hồi chiêu mỗi lần tiến hóa
        
        // Đổi màu viền UI ngay lập tức
        if (skill.ui && skill.ui.glow) {
            skill.ui.glow.clear();
            skill.ui.glow.lineStyle(3, EVO_COLORS[skill.level], 1);
            skill.ui.glow.strokeCircle(skill.posX, skill.startY, 29);
        }
        console.log(`Tiến hóa: ${skill.name} lên cấp ${skill.level}`);
    }
}

// Hàm Xử lý sát thương tùy theo Cấp độ (Ví dụ với chiêu Thiên thạch)
export function castMeteorEvo(scene, player, target) {
    
}