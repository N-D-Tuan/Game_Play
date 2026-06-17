export const PET_SKILL_HOTKEYS = { pet_skill_1: 'O', pet_skill_2: 'P' };

export const PET_SKILL_DATA = {
    'kien_do': {
        1: { name: 'Vỏ Cứng Kháng Hỏa', type: 'passive', desc: 'Bị động: Giảm 5% sát thương nhận vào.' },
        50: { name: 'Phun Lửa', type: 'active', cd: 10000, desc: 'Chủ động (Hồi: 10s): Bắn cầu lửa gây sát thương diện rộng.' },
        100: { name: 'Hỏa Diệm Sơn', type: 'active', cd: 30000, desc: 'Chủ động (Hồi: 30s): Triệu hồi cột lửa thiêu rụi kẻ địch.' }
    },
    'default': {
        1: { name: 'Bản Năng Sinh Tồn', type: 'passive', desc: 'Bị động: Tăng 2% mọi chỉ số.' },
        50: { name: 'Tiếng Gầm Áp Đảo', type: 'active', cd: 12000, desc: 'Chủ động (Hồi: 12s): Đẩy lùi kẻ địch xung quanh.' },
        100: { name: 'Cơn Thịnh Nộ', type: 'active', cd: 40000, desc: 'Chủ động (Hồi: 40s): Cường hóa tối đa sát thương trong 5s.' }
    }
};