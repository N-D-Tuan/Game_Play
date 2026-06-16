-- ==========================================
-- BẢNG 1: DANH MỤC TRANG BỊ GỐC (MASTER DATA)
-- ==========================================
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    
    type ENUM('head', 'chest', 'legs', 'weapon', 'accessory', 'shoes') NOT NULL,
    
    rarity ENUM('F', 'E', 'D', 'C', 'B', 'A', 'S') NOT NULL DEFAULT 'F',

    hp INT DEFAULT 0,
    hp_regen INT DEFAULT 0,
    atk INT DEFAULT 0,
    dodge INT DEFAULT 0,
    
    icon VARCHAR(255) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Thêm 4 cột chỉ số mới vào bảng items
ALTER TABLE items
ADD COLUMN crit_rate INT DEFAULT 0,
ADD COLUMN crit_damage INT DEFAULT 0,
ADD COLUMN lifesteal INT DEFAULT 0,
ADD COLUMN speed INT DEFAULT 0;

-- 2. Tự động cập nhật dữ liệu dựa trên BẬC và LOẠI trang bị
SET SQL_SAFE_UPDATES = 0;
-- Tốc chạy (Chỉ Giày mới có nhiều)
UPDATE items SET speed = CASE 
    WHEN type = 'shoes' THEN (CASE rarity WHEN 'S' THEN 80 WHEN 'A' THEN 60 WHEN 'B' THEN 40 WHEN 'C' THEN 30 WHEN 'D' THEN 20 WHEN 'E' THEN 10 ELSE 5 END) 
    ELSE (CASE rarity WHEN 'S' THEN 5 ELSE 0 END) 
END;

-- Tỉ lệ Chí mạng (Mũ, Vũ khí, Phụ kiện)
UPDATE items SET crit_rate = CASE 
    WHEN type IN ('weapon', 'head', 'accessory') THEN (CASE rarity WHEN 'S' THEN 15 WHEN 'A' THEN 10 WHEN 'B' THEN 7 WHEN 'C' THEN 5 WHEN 'D' THEN 3 WHEN 'E' THEN 1 ELSE 0 END)
    ELSE 0 
END;

-- Sát thương Chí mạng (Vũ khí, Phụ kiện)
UPDATE items SET crit_damage = CASE 
    WHEN type IN ('weapon', 'accessory') THEN (CASE rarity WHEN 'S' THEN 50 WHEN 'A' THEN 30 WHEN 'B' THEN 20 WHEN 'C' THEN 10 WHEN 'D' THEN 5 ELSE 0 END)
    ELSE 0 
END;

-- Hút máu (Vũ khí, Áo)
UPDATE items SET lifesteal = CASE 
    WHEN type IN ('weapon', 'chest') THEN (CASE rarity WHEN 'S' THEN 10 WHEN 'A' THEN 7 WHEN 'B' THEN 5 WHEN 'C' THEN 3 WHEN 'D' THEN 1 ELSE 0 END)
    ELSE 0 
END;
SET SQL_SAFE_UPDATES = 1;

-- Cập nhật bảng items để cho phép chứa Nguyên liệu (Mảnh trứng, Trứng)
ALTER TABLE items 
MODIFY COLUMN type ENUM('head', 'chest', 'legs', 'weapon', 'accessory', 'shoes', 'material') NOT NULL;

-- Thêm Mảnh Trứng và Trứng Thú Cưng vào bảng items
-- ID 212: Mảnh Trứng, ID 213: Trứng Thú Cưng
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES 
(212, 'Mảnh Trứng Thú Cưng', 'material', 'S', 0, 0, 0, 0, 'egg_piece.png'),
(213, 'Trứng Thú Cưng', 'material', 'S', 0, 0, 0, 0, 'egg.png');

-- ==========================================
-- BẢNG 2: TÚI ĐỒ CỦA NGƯỜI CHƠI (INVENTORY)
-- ==========================================
CREATE TABLE player_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL DEFAULT 1, -- Gắn cứng ID người chơi là 1
    item_id INT NOT NULL,
    is_equipped TINYINT(1) DEFAULT 0, -- 0: Nằm trong Balo, 1: Đang mặc trên người
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ==========================================
-- BẢNG 3: PET
-- ==========================================
CREATE TABLE pets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_code VARCHAR(50) UNIQUE NOT NULL, -- Mã nhận diện (VD: ngoc_long)
    name VARCHAR(100) NOT NULL,
    
    -- CHỈ SỐ GỐC (Ở Cấp 1)
    base_hp INT DEFAULT 0,
    base_hp_regen INT DEFAULT 0,
    base_atk INT DEFAULT 0,
    base_dodge INT DEFAULT 0,
    base_crit_rate INT DEFAULT 0,
    base_crit_damage INT DEFAULT 0,
    base_lifesteal INT DEFAULT 0,
    base_speed INT DEFAULT 0,
    
    -- CHỈ SỐ TĂNG TRƯỞNG (Cộng thêm mỗi khi lên 1 cấp)
    -- Dùng FLOAT cho các chỉ số phần trăm vì nó có thể tăng lẻ (VD: +0.2% Chí mạng/cấp)
    growth_hp INT DEFAULT 0,
    growth_hp_regen INT DEFAULT 0,
    growth_atk INT DEFAULT 0,
    growth_dodge FLOAT DEFAULT 0,
    growth_crit_rate FLOAT DEFAULT 0,
    growth_crit_damage INT DEFAULT 0,
    growth_lifesteal FLOAT DEFAULT 0,
    growth_speed FLOAT DEFAULT 0,
    
    -- HÌNH ẢNH 3 GIAI ĐOẠN TIẾN HÓA
    icon_non VARCHAR(255) NOT NULL,
    icon_thieu_nien VARCHAR(255) NOT NULL,
    icon_truong_thanh VARCHAR(255) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- BẢNG 4: TÚI ĐỒ CỦA NGƯỜI CHƠI (PET)
-- ==========================================
CREATE TABLE player_pets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    pet_id INT NOT NULL,              -- Trỏ tới ID trong bảng pets
    level INT NOT NULL DEFAULT 1,     -- Cấp độ hiện tại (Max 100)
    current_exp INT NOT NULL DEFAULT 0, 
    is_equipped TINYINT(1) DEFAULT 0, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Chèn dữ liệu mới với thông số đã được cân bằng
INSERT INTO pets (
    pet_code, name, 
    base_hp, base_hp_regen, base_atk, base_dodge, base_crit_rate, base_crit_damage, base_lifesteal, base_speed, 
    growth_hp, growth_hp_regen, growth_atk, growth_dodge, growth_crit_rate, growth_crit_damage, growth_lifesteal, growth_speed, 
    icon_non, icon_thieu_nien, icon_truong_thanh
) VALUES 

-- 1. KIẾN XANH: Cộng nhiều máu, dame vừa, có hút máu
('kien_xanh', 'Kiến Xanh', 
 300, 0, 15, 0, 0, 0, 1, 0,            -- Base (Cấp 1)
 30, 0, 3, 0, 0, 0, 0.1, 0,            -- Tăng trưởng (Lv 100: +3270 HP, +312 ATK, +10.9% Hút Máu)
 'kien_xanh_1.png', 'kien_xanh_2.png', 'kien_xanh_3.png'),

-- 2. KIẾN ĐỎ: Dame trung bình cao, tỉ lệ CM, máu vừa, né
('kien_do', 'Kiến Đỏ', 
 150, 0, 25, 2, 2, 0, 0, 0,            -- Base
 15, 0, 5, 0.1, 0.2, 0, 0, 0,          -- Tăng trưởng (Lv 100: +1635 HP, +520 ATK, +11.9% Né, +21.8% Tỉ lệ CM)
 'kien_do_1.png', 'kien_do_2.png', 'kien_do_3.png'),

-- 3. NGỌC LONG: Cộng Máu, hồi máu, hút máu, né (Bình máu di động)
('ngoc_long', 'Ngọc Long', 
 250, 10, 0, 5, 0, 0, 2, 0,            -- Base
 25, 2, 0, 0.2, 0, 0, 0.2, 0,          -- Tăng trưởng (Lv 100: +2725 HP, +208 Hồi/s, +24.8% Né, +21.8% Hút Máu)
 'ngoc_long_1.png', 'ngoc_long_2.png', 'ngoc_long_3.png'),

-- 4. PHƯỢNG HOÀNG BĂNG: Dame cao, máu nhiều, né cao, tỉ lệ CM cao, STCM cao, tốc độ vừa
('phuong_hoang_bang', 'Phượng Hoàng Băng', 
 400, 0, 40, 10, 5, 20, 0, 10,         -- Base
 40, 0, 8, 0.3, 0.5, 3, 0, 1,          -- Tăng trưởng (Lv 100: +4360 HP, +832 ATK, +39.7% Né, +54.5% TLCM, +317% STCM, +109 Tốc)
 'phuong_hoang_1.png', 'phuong_hoang_2.png', 'phuong_hoang_3.png'),

-- 5. RỒNG LỬA: Dame SIÊU cao, máu hơi nhiều, né hơi nhiều, tỉ lệ CM SIÊU cao, STCM SIÊU cao, tốc độ vừa
('rong_lua', 'Rồng Lửa', 
 200, 0, 80, 5, 10, 50, 0, 10,         -- Base
 20, 0, 15, 0.2, 0.8, 6, 0, 1,         -- Tăng trưởng (Lv 100: +2180 HP, +1565 ATK, +24.8% Né, +89.2% TLCM, +644% STCM, +109 Tốc)
 'rong_lua_1.png', 'rong_lua_2.png', 'rong_lua_3.png');

-- 1. Thêm 1 loại vật phẩm mẫu
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (1, 'A-Sắt Gỉ', 'weapon', 'S', 9999, 9999, 9999, 9999, 'weapon_kiemsatgi.png');

INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (2, 'Kiếm Diệt Quỷ', 'weapon', 'S', 200, 25, 900, 20, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (3, 'Kiếm Diệt Quỷ', 'weapon', 'A', 20, 5, 200, 10, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (4, 'Kiếm Diệt Quỷ', 'weapon', 'B', 0, 0, 100, 10, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (5, 'Kiếm Diệt Quỷ', 'weapon', 'C', 0, 0, 70, 8, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (6, 'Kiếm Diệt Quỷ', 'weapon', 'D', 0, 0, 50, 8, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (7, 'Kiếm Diệt Quỷ', 'weapon', 'E', 0, 0, 30, 5, 'weapon_kiem.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (8, 'Kiếm Diệt Quỷ', 'weapon', 'F', 0, 0, 15, 5, 'weapon_kiem.png');

INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (9, 'Dao Ác Xà', 'weapon', 'S', 100, 15, 800, 25, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (10, 'Dao Ác Xà', 'weapon', 'A', 15, 5, 175, 15, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (11, 'Dao Ác Xà', 'weapon', 'B', 0, 0, 80, 10, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (12, 'Dao Ác Xà', 'weapon', 'C', 0, 0, 60, 10, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (13, 'Dao Ác Xà', 'weapon', 'D', 0, 0, 40, 10, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (14, 'Dao Ác Xà', 'weapon', 'E', 0, 0, 25, 10, 'weapon_dao.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (15, 'Dao Ác Xà', 'weapon', 'F', 0, 0, 12, 10, 'weapon_dao.png');

INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (16, 'Lưỡi Hái Linh Hồn', 'weapon', 'S', 100, 45, 850, 10, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (17, 'Lưỡi Hái Linh Hồn', 'weapon', 'A', 15, 12, 190, 5, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (18, 'Lưỡi Hái Linh Hồn', 'weapon', 'B', 0, 5, 95, 5, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (19, 'Lưỡi Hái Linh Hồn', 'weapon', 'C', 0, 2, 65, 2, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (20, 'Lưỡi Hái Linh Hồn', 'weapon', 'D', 0, 0, 45, 2, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (21, 'Lưỡi Hái Linh Hồn', 'weapon', 'E', 0, 0, 28, 0, 'weapon_luoihai.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (22, 'Lưỡi Hái Linh Hồn', 'weapon', 'F', 0, 0, 14, 0, 'weapon_luoihai.png');

INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (23, 'Quyền Trượng Vong Linh', 'weapon', 'S', 500, 15, 750, 5, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (24, 'Quyền Trượng Vong Linh', 'weapon', 'A', 80, 5, 160, 2, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (25, 'Quyền Trượng Vong Linh', 'weapon', 'B', 30, 0, 85, 0, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (26, 'Quyền Trượng Vong Linh', 'weapon', 'C', 15, 0, 55, 0, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (27, 'Quyền Trượng Vong Linh', 'weapon', 'D', 10, 0, 35, 0, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (28, 'Quyền Trượng Vong Linh', 'weapon', 'E', 5, 0, 20, 0, 'weapon_quyentruong.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (29, 'Quyền Trượng Vong Linh', 'weapon', 'F', 0, 0, 10, 0, 'weapon_quyentruong.png');

INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (30, 'Bích Hải Thần Thương', 'weapon', 'S', 250, 20, 880, 18, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (31, 'Bích Hải Thần Thương', 'weapon', 'A', 30, 8, 195, 12, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (32, 'Bích Hải Thần Thương', 'weapon', 'B', 15, 2, 98, 8, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (33, 'Bích Hải Thần Thương', 'weapon', 'C', 0, 0, 68, 8, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (34, 'Bích Hải Thần Thương', 'weapon', 'D', 0, 0, 48, 5, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (35, 'Bích Hải Thần Thương', 'weapon', 'E', 0, 0, 29, 3, 'weapon_dinhba.png');
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) 
VALUES (36, 'Bích Hải Thần Thương', 'weapon', 'F', 0, 0, 13, 2, 'weapon_dinhba.png');

-- ==========================================
-- 1. ACCESSORY (BỔ TRỢ) - ID 37 đến 71
-- ==========================================
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) VALUES
-- Cánh thiên thần sa ngã (Sát thương & Phản xạ)
(37, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'S', 500, 10, 300, 15, 'accessory_canh.png'),
(38, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'A', 350, 7, 210, 10, 'accessory_canh.png'),
(39, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'B', 200, 5, 120, 8, 'accessory_canh.png'),
(40, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'C', 100, 2, 70, 5, 'accessory_canh.png'),
(41, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'D', 50, 0, 40, 2, 'accessory_canh.png'),
(42, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'E', 20, 0, 20, 0, 'accessory_canh.png'),
(43, 'Cánh Thiên Thần Sa Ngã', 'accessory', 'F', 0, 0, 10, 0, 'accessory_canh.png'),

-- Chén thánh (Hồi máu siêu cấp)
(44, 'Chén Thánh', 'accessory', 'S', 1000, 50, 50, 0, 'accessory_chenthanh.png'),
(45, 'Chén Thánh', 'accessory', 'A', 700, 35, 30, 0, 'accessory_chenthanh.png'),
(46, 'Chén Thánh', 'accessory', 'B', 400, 20, 15, 0, 'accessory_chenthanh.png'),
(47, 'Chén Thánh', 'accessory', 'C', 200, 10, 0, 0, 'accessory_chenthanh.png'),
(48, 'Chén Thánh', 'accessory', 'D', 100, 5, 0, 0, 'accessory_chenthanh.png'),
(49, 'Chén Thánh', 'accessory', 'E', 50, 2, 0, 0, 'accessory_chenthanh.png'),
(50, 'Chén Thánh', 'accessory', 'F', 20, 0, 0, 0, 'accessory_chenthanh.png'),

-- Mắt quỷ (Tấn công bạo kích)
(51, 'Mắt Quỷ', 'accessory', 'S', 0, 0, 500, 5, 'accessory_matquy.png'),
(52, 'Mắt Quỷ', 'accessory', 'A', 0, 0, 350, 3, 'accessory_matquy.png'),
(53, 'Mắt Quỷ', 'accessory', 'B', 0, 0, 200, 0, 'accessory_matquy.png'),
(54, 'Mắt Quỷ', 'accessory', 'C', 0, 0, 120, 0, 'accessory_matquy.png'),
(55, 'Mắt Quỷ', 'accessory', 'D', 0, 0, 70, 0, 'accessory_matquy.png'),
(56, 'Mắt Quỷ', 'accessory', 'E', 0, 0, 35, 0, 'accessory_matquy.png'),
(57, 'Mắt Quỷ', 'accessory', 'F', 0, 0, 15, 0, 'accessory_matquy.png'),

-- Máu rồng (Máu tối đa dồi dào)
(58, 'Máu Rồng', 'accessory', 'S', 1500, 30, 150, 0, 'accessory_maurong.png'),
(59, 'Máu Rồng', 'accessory', 'A', 1000, 20, 100, 0, 'accessory_maurong.png'),
(60, 'Máu Rồng', 'accessory', 'B', 600, 12, 60, 0, 'accessory_maurong.png'),
(61, 'Máu Rồng', 'accessory', 'C', 300, 6, 30, 0, 'accessory_maurong.png'),
(62, 'Máu Rồng', 'accessory', 'D', 150, 3, 15, 0, 'accessory_maurong.png'),
(63, 'Máu Rồng', 'accessory', 'E', 80, 0, 0, 0, 'accessory_maurong.png'),
(64, 'Máu Rồng', 'accessory', 'F', 40, 0, 0, 0, 'accessory_maurong.png'),

-- Sách phép (Cân bằng toàn diện)
(65, 'Sách Phép', 'accessory', 'S', 400, 10, 350, 5, 'accessory_sachphep.png'),
(66, 'Sách Phép', 'accessory', 'A', 280, 7, 240, 3, 'accessory_sachphep.png'),
(67, 'Sách Phép', 'accessory', 'B', 160, 4, 140, 2, 'accessory_sachphep.png'),
(68, 'Sách Phép', 'accessory', 'C', 80, 2, 80, 0, 'accessory_sachphep.png'),
(69, 'Sách Phép', 'accessory', 'D', 40, 0, 45, 0, 'accessory_sachphep.png'),
(70, 'Sách Phép', 'accessory', 'E', 20, 0, 25, 0, 'accessory_sachphep.png'),
(71, 'Sách Phép', 'accessory', 'F', 10, 0, 10, 0, 'accessory_sachphep.png');


-- ==========================================
-- 2. CHEST (ÁO GIÁP) - ID 72 đến 106
-- ==========================================
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) VALUES
-- Áo choàng tử thần
(72, 'Áo Choàng Tử Thần', 'chest', 'S', 1200, 0, 100, 20, 'chest_aochoang.png'),
(73, 'Áo Choàng Tử Thần', 'chest', 'A', 840, 0, 70, 14, 'chest_aochoang.png'),
(74, 'Áo Choàng Tử Thần', 'chest', 'B', 480, 0, 40, 8, 'chest_aochoang.png'),
(75, 'Áo Choàng Tử Thần', 'chest', 'C', 240, 0, 20, 4, 'chest_aochoang.png'),
(76, 'Áo Choàng Tử Thần', 'chest', 'D', 120, 0, 10, 2, 'chest_aochoang.png'),
(77, 'Áo Choàng Tử Thần', 'chest', 'E', 60, 0, 5, 1, 'chest_aochoang.png'),
(78, 'Áo Choàng Tử Thần', 'chest', 'F', 30, 0, 0, 0, 'chest_aochoang.png'),

-- Giáp cổ ngữ
(79, 'Giáp Cổ Ngữ', 'chest', 'S', 2000, 20, 0, 0, 'chest_giapcongu.png'),
(80, 'Giáp Cổ Ngữ', 'chest', 'A', 1400, 14, 0, 0, 'chest_giapcongu.png'),
(81, 'Giáp Cổ Ngữ', 'chest', 'B', 800, 8, 0, 0, 'chest_giapcongu.png'),
(82, 'Giáp Cổ Ngữ', 'chest', 'C', 400, 4, 0, 0, 'chest_giapcongu.png'),
(83, 'Giáp Cổ Ngữ', 'chest', 'D', 200, 2, 0, 0, 'chest_giapcongu.png'),
(84, 'Giáp Cổ Ngữ', 'chest', 'E', 100, 0, 0, 0, 'chest_giapcongu.png'),
(85, 'Giáp Cổ Ngữ', 'chest', 'F', 50, 0, 0, 0, 'chest_giapcongu.png'),

-- Giáp rồng
(86, 'Giáp Rồng', 'chest', 'S', 1800, 15, 80, 5, 'chest_giaprong.png'),
(87, 'Giáp Rồng', 'chest', 'A', 1260, 10, 56, 3, 'chest_giaprong.png'),
(88, 'Giáp Rồng', 'chest', 'B', 720, 6, 32, 2, 'chest_giaprong.png'),
(89, 'Giáp Rồng', 'chest', 'C', 360, 3, 16, 0, 'chest_giaprong.png'),
(90, 'Giáp Rồng', 'chest', 'D', 180, 0, 8, 0, 'chest_giaprong.png'),
(91, 'Giáp Rồng', 'chest', 'E', 90, 0, 4, 0, 'chest_giaprong.png'),
(92, 'Giáp Rồng', 'chest', 'F', 45, 0, 0, 0, 'chest_giaprong.png'),

-- Giáp Medusa
(93, 'Giáp Medusa', 'chest', 'S', 1000, 5, 250, 10, 'chest_giapthan.png'),
(94, 'Giáp Medusa', 'chest', 'A', 700, 3, 175, 7, 'chest_giapthan.png'),
(95, 'Giáp Medusa', 'chest', 'B', 400, 2, 100, 4, 'chest_giapthan.png'),
(96, 'Giáp Medusa', 'chest', 'C', 200, 0, 50, 2, 'chest_giapthan.png'),
(97, 'Giáp Medusa', 'chest', 'D', 100, 0, 25, 1, 'chest_giapthan.png'),
(98, 'Giáp Medusa', 'chest', 'E', 50, 0, 12, 0, 'chest_giapthan.png'),
(99, 'Giáp Medusa', 'chest', 'F', 25, 0, 5, 0, 'chest_giapthan.png'),

-- Giáp thánh
(100, 'Giáp Thánh', 'chest', 'S', 1600, 30, 0, 0, 'chest_giapthanh.png'),
(101, 'Giáp Thánh', 'chest', 'A', 1120, 21, 0, 0, 'chest_giapthanh.png'),
(102, 'Giáp Thánh', 'chest', 'B', 640, 12, 0, 0, 'chest_giapthanh.png'),
(103, 'Giáp Thánh', 'chest', 'C', 320, 6, 0, 0, 'chest_giapthanh.png'),
(104, 'Giáp Thánh', 'chest', 'D', 160, 3, 0, 0, 'chest_giapthanh.png'),
(105, 'Giáp Thánh', 'chest', 'E', 80, 0, 0, 0, 'chest_giapthanh.png'),
(106, 'Giáp Thánh', 'chest', 'F', 40, 0, 0, 0, 'chest_giapthanh.png');


-- ==========================================
-- 3. HEAD (MŨ) - ID 107 đến 141
-- ==========================================
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) VALUES
-- Mũ chúa tể
(107, 'Mũ Chúa Tể', 'head', 'S', 800, 10, 150, 5, 'head_lord.png'),
(108, 'Mũ Chúa Tể', 'head', 'A', 560, 7, 105, 3, 'head_lord.png'),
(109, 'Mũ Chúa Tể', 'head', 'B', 320, 4, 60, 2, 'head_lord.png'),
(110, 'Mũ Chúa Tể', 'head', 'C', 160, 2, 30, 0, 'head_lord.png'),
(111, 'Mũ Chúa Tể', 'head', 'D', 80, 0, 15, 0, 'head_lord.png'),
(112, 'Mũ Chúa Tể', 'head', 'E', 40, 0, 7, 0, 'head_lord.png'),
(113, 'Mũ Chúa Tể', 'head', 'F', 20, 0, 3, 0, 'head_lord.png'),

-- Mũ Sparta
(114, 'Mũ Sparta', 'head', 'S', 500, 5, 250, 0, 'head_sparta.png'),
(115, 'Mũ Sparta', 'head', 'A', 350, 3, 175, 0, 'head_sparta.png'),
(116, 'Mũ Sparta', 'head', 'B', 200, 2, 100, 0, 'head_sparta.png'),
(117, 'Mũ Sparta', 'head', 'C', 100, 0, 50, 0, 'head_sparta.png'),
(118, 'Mũ Sparta', 'head', 'D', 50, 0, 25, 0, 'head_sparta.png'),
(119, 'Mũ Sparta', 'head', 'E', 25, 0, 12, 0, 'head_sparta.png'),
(120, 'Mũ Sparta', 'head', 'F', 12, 0, 5, 0, 'head_sparta.png'),

-- Mũ kị sĩ thánh
(121, 'Mũ Kị Sĩ Thánh', 'head', 'S', 1200, 20, 80, 5, 'head_thanh.png'),
(122, 'Mũ Kị Sĩ Thánh', 'head', 'A', 840, 14, 56, 3, 'head_thanh.png'),
(123, 'Mũ Kị Sĩ Thánh', 'head', 'B', 480, 8, 32, 2, 'head_thanh.png'),
(124, 'Mũ Kị Sĩ Thánh', 'head', 'C', 240, 4, 16, 0, 'head_thanh.png'),
(125, 'Mũ Kị Sĩ Thánh', 'head', 'D', 120, 2, 8, 0, 'head_thanh.png'),
(126, 'Mũ Kị Sĩ Thánh', 'head', 'E', 60, 0, 4, 0, 'head_thanh.png'),
(127, 'Mũ Kị Sĩ Thánh', 'head', 'F', 30, 0, 0, 0, 'head_thanh.png'),

-- Nguyệt quế linh hồn
(128, 'Nguyệt Quế Linh Hồn', 'head', 'S', 300, 0, 400, 10, 'head_vuongmien.png'),
(129, 'Nguyệt Quế Linh Hồn', 'head', 'A', 210, 0, 280, 7, 'head_vuongmien.png'),
(130, 'Nguyệt Quế Linh Hồn', 'head', 'B', 120, 0, 160, 4, 'head_vuongmien.png'),
(131, 'Nguyệt Quế Linh Hồn', 'head', 'C', 60, 0, 80, 2, 'head_vuongmien.png'),
(132, 'Nguyệt Quế Linh Hồn', 'head', 'D', 30, 0, 40, 1, 'head_vuongmien.png'),
(133, 'Nguyệt Quế Linh Hồn', 'head', 'E', 15, 0, 20, 0, 'head_vuongmien.png'),
(134, 'Nguyệt Quế Linh Hồn', 'head', 'F', 5, 0, 10, 0, 'head_vuongmien.png'),

-- Đầu lâu rồng
(135, 'Đầu Lâu Rồng', 'head', 'S', 900, 5, 120, 0, 'head_xuongrong.png'),
(136, 'Đầu Lâu Rồng', 'head', 'A', 630, 3, 84, 0, 'head_xuongrong.png'),
(137, 'Đầu Lâu Rồng', 'head', 'B', 360, 2, 48, 0, 'head_xuongrong.png'),
(138, 'Đầu Lâu Rồng', 'head', 'C', 180, 0, 24, 0, 'head_xuongrong.png'),
(139, 'Đầu Lâu Rồng', 'head', 'D', 90, 0, 12, 0, 'head_xuongrong.png'),
(140, 'Đầu Lâu Rồng', 'head', 'E', 45, 0, 6, 0, 'head_xuongrong.png'),
(141, 'Đầu Lâu Rồng', 'head', 'F', 20, 0, 3, 0, 'head_xuongrong.png');


-- ==========================================
-- 4. LEGS (QUẦN) - ID 142 đến 176
-- ==========================================
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) VALUES
-- Quần Giáp Hiệp Sĩ
(142, 'Quần Giáp Hiệp Sĩ', 'legs', 'S', 1200, 10, 0, 0, 'legs_quan1.png'),
(143, 'Quần Giáp Hiệp Sĩ', 'legs', 'A', 840, 7, 0, 0, 'legs_quan1.png'),
(144, 'Quần Giáp Hiệp Sĩ', 'legs', 'B', 480, 4, 0, 0, 'legs_quan1.png'),
(145, 'Quần Giáp Hiệp Sĩ', 'legs', 'C', 240, 2, 0, 0, 'legs_quan1.png'),
(146, 'Quần Giáp Hiệp Sĩ', 'legs', 'D', 120, 0, 0, 0, 'legs_quan1.png'),
(147, 'Quần Giáp Hiệp Sĩ', 'legs', 'E', 60, 0, 0, 0, 'legs_quan1.png'),
(148, 'Quần Giáp Hiệp Sĩ', 'legs', 'F', 30, 0, 0, 0, 'legs_quan1.png'),

-- Quần Thợ Săn Bóng Tối
(149, 'Quần Thợ Săn Bóng Tối', 'legs', 'S', 700, 5, 100, 15, 'legs_quan2.png'),
(150, 'Quần Thợ Săn Bóng Tối', 'legs', 'A', 490, 3, 70, 10, 'legs_quan2.png'),
(151, 'Quần Thợ Săn Bóng Tối', 'legs', 'B', 280, 2, 40, 6, 'legs_quan2.png'),
(152, 'Quần Thợ Săn Bóng Tối', 'legs', 'C', 140, 0, 20, 3, 'legs_quan2.png'),
(153, 'Quần Thợ Săn Bóng Tối', 'legs', 'D', 70, 0, 10, 1, 'legs_quan2.png'),
(154, 'Quần Thợ Săn Bóng Tối', 'legs', 'E', 35, 0, 5, 0, 'legs_quan2.png'),
(155, 'Quần Thợ Săn Bóng Tối', 'legs', 'F', 15, 0, 0, 0, 'legs_quan2.png'),

-- Quần Da Rồng
(156, 'Quần Da Rồng', 'legs', 'S', 1000, 10, 60, 5, 'legs_quan3.png'),
(157, 'Quần Da Rồng', 'legs', 'A', 700, 7, 42, 3, 'legs_quan3.png'),
(158, 'Quần Da Rồng', 'legs', 'B', 400, 4, 24, 2, 'legs_quan3.png'),
(159, 'Quần Da Rồng', 'legs', 'C', 200, 2, 12, 0, 'legs_quan3.png'),
(160, 'Quần Da Rồng', 'legs', 'D', 100, 0, 6, 0, 'legs_quan3.png'),
(161, 'Quần Da Rồng', 'legs', 'E', 50, 0, 3, 0, 'legs_quan3.png'),
(162, 'Quần Da Rồng', 'legs', 'F', 25, 0, 0, 0, 'legs_quan3.png'),

-- Quần Pháp Sư Hắc Ám
(163, 'Quần Pháp Sư Hắc Ám', 'legs', 'S', 500, 2, 200, 10, 'legs_quan4.png'),
(164, 'Quần Pháp Sư Hắc Ám', 'legs', 'A', 350, 1, 140, 7, 'legs_quan4.png'),
(165, 'Quần Pháp Sư Hắc Ám', 'legs', 'B', 200, 0, 80, 4, 'legs_quan4.png'),
(166, 'Quần Pháp Sư Hắc Ám', 'legs', 'C', 100, 0, 40, 2, 'legs_quan4.png'),
(167, 'Quần Pháp Sư Hắc Ám', 'legs', 'D', 50, 0, 20, 1, 'legs_quan4.png'),
(168, 'Quần Pháp Sư Hắc Ám', 'legs', 'E', 25, 0, 10, 0, 'legs_quan4.png'),
(169, 'Quần Pháp Sư Hắc Ám', 'legs', 'F', 12, 0, 5, 0, 'legs_quan4.png'),

-- Quần Chiến Binh Thép
(170, 'Quần Chiến Binh Thép', 'legs', 'S', 1100, 8, 30, 0, 'legs_quan5.png'),
(171, 'Quần Chiến Binh Thép', 'legs', 'A', 770, 5, 21, 0, 'legs_quan5.png'),
(172, 'Quần Chiến Binh Thép', 'legs', 'B', 440, 3, 12, 0, 'legs_quan5.png'),
(173, 'Quần Chiến Binh Thép', 'legs', 'C', 220, 1, 6, 0, 'legs_quan5.png'),
(174, 'Quần Chiến Binh Thép', 'legs', 'D', 110, 0, 3, 0, 'legs_quan5.png'),
(175, 'Quần Chiến Binh Thép', 'legs', 'E', 55, 0, 0, 0, 'legs_quan5.png'),
(176, 'Quần Chiến Binh Thép', 'legs', 'F', 25, 0, 0, 0, 'legs_quan5.png');


-- ==========================================
-- 5. SHOES (GIÀY) - ID 177 đến 211
-- ==========================================
INSERT INTO items (id, name, type, rarity, hp, hp_regen, atk, dodge, icon) VALUES
-- Giày móng rồng
(177, 'Giày Móng Rồng', 'shoes', 'S', 500, 0, 80, 20, 'shoes_chanrong.png'),
(178, 'Giày Móng Rồng', 'shoes', 'A', 350, 0, 56, 14, 'shoes_chanrong.png'),
(179, 'Giày Móng Rồng', 'shoes', 'B', 200, 0, 32, 8, 'shoes_chanrong.png'),
(180, 'Giày Móng Rồng', 'shoes', 'C', 100, 0, 16, 4, 'shoes_chanrong.png'),
(181, 'Giày Móng Rồng', 'shoes', 'D', 50, 0, 8, 2, 'shoes_chanrong.png'),
(182, 'Giày Móng Rồng', 'shoes', 'E', 25, 0, 4, 1, 'shoes_chanrong.png'),
(183, 'Giày Móng Rồng', 'shoes', 'F', 12, 0, 0, 0, 'shoes_chanrong.png'),

-- Giày cơ động
(184, 'Giày Cơ Động', 'shoes', 'S', 300, 0, 0, 35, 'shoes_codong.png'),
(185, 'Giày Cơ Động', 'shoes', 'A', 210, 0, 0, 24, 'shoes_codong.png'),
(186, 'Giày Cơ Động', 'shoes', 'B', 120, 0, 0, 14, 'shoes_codong.png'),
(187, 'Giày Cơ Động', 'shoes', 'C', 60, 0, 0, 7, 'shoes_codong.png'),
(188, 'Giày Cơ Động', 'shoes', 'D', 30, 0, 0, 3, 'shoes_codong.png'),
(189, 'Giày Cơ Động', 'shoes', 'E', 15, 0, 0, 1, 'shoes_codong.png'),
(190, 'Giày Cơ Động', 'shoes', 'F', 5, 0, 0, 0, 'shoes_codong.png'),

-- Giày sắt
(191, 'Giày Sắt', 'shoes', 'S', 1000, 0, 0, 0, 'shoes_giaysat.png'),
(192, 'Giày Sắt', 'shoes', 'A', 700, 0, 0, 0, 'shoes_giaysat.png'),
(193, 'Giày Sắt', 'shoes', 'B', 400, 0, 0, 0, 'shoes_giaysat.png'),
(194, 'Giày Sắt', 'shoes', 'C', 200, 0, 0, 0, 'shoes_giaysat.png'),
(195, 'Giày Sắt', 'shoes', 'D', 100, 0, 0, 0, 'shoes_giaysat.png'),
(196, 'Giày Sắt', 'shoes', 'E', 50, 0, 0, 0, 'shoes_giaysat.png'),
(197, 'Giày Sắt', 'shoes', 'F', 25, 0, 0, 0, 'shoes_giaysat.png'),

-- Giày hoàng gia
(198, 'Giày Hoàng Gia', 'shoes', 'S', 800, 10, 60, 15, 'shoes_hoanggia.png'),
(199, 'Giày Hoàng Gia', 'shoes', 'A', 560, 7, 42, 10, 'shoes_hoanggia.png'),
(200, 'Giày Hoàng Gia', 'shoes', 'B', 320, 4, 24, 6, 'shoes_hoanggia.png'),
(201, 'Giày Hoàng Gia', 'shoes', 'C', 160, 2, 12, 3, 'shoes_hoanggia.png'),
(202, 'Giày Hoàng Gia', 'shoes', 'D', 80, 0, 6, 1, 'shoes_hoanggia.png'),
(203, 'Giày Hoàng Gia', 'shoes', 'E', 40, 0, 3, 0, 'shoes_hoanggia.png'),
(204, 'Giày Hoàng Gia', 'shoes', 'F', 20, 0, 0, 0, 'shoes_hoanggia.png'),

-- Giày xương quỷ
(205, 'Giày Xương Quỷ', 'shoes', 'S', 200, 0, 150, 15, 'shoes_quy.png'),
(206, 'Giày Xương Quỷ', 'shoes', 'A', 140, 0, 105, 10, 'shoes_quy.png'),
(207, 'Giày Xương Quỷ', 'shoes', 'B', 80, 0, 60, 6, 'shoes_quy.png'),
(208, 'Giày Xương Quỷ', 'shoes', 'C', 40, 0, 30, 3, 'shoes_quy.png'),
(209, 'Giày Xương Quỷ', 'shoes', 'D', 20, 0, 15, 1, 'shoes_quy.png'),
(210, 'Giày Xương Quỷ', 'shoes', 'E', 10, 0, 7, 0, 'shoes_quy.png'),
(211, 'Giày Xương Quỷ', 'shoes', 'F', 5, 0, 3, 0, 'shoes_quy.png');

-- 2. Thêm 1 món đồ vào kho người chơi (player_id = 1)
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (1, 1, 1, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (2, 1, 2, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (3, 1, 3, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (4, 1, 4, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (5, 1, 5, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (6, 1, 6, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (7, 1, 7, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (8, 1, 8, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (9, 1, 9, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (10, 1, 10, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (11, 1, 11, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (12, 1, 12, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (13, 1, 13, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (14, 1, 14, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (15, 1, 15, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (16, 1, 16, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (17, 1, 17, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (18, 1, 18, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (19, 1, 19, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (20, 1, 20, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (21, 1, 21, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (22, 1, 22, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (23, 1, 23, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (24, 1, 24, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (25, 1, 25, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (26, 1, 26, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (27, 1, 27, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (28, 1, 28, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (29, 1, 29, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (30, 1, 30, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (31, 1, 31, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (32, 1, 32, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (33, 1, 33, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (34, 1, 34, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (35, 1, 35, 0);
INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES (36, 1, 36, 0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES
(37,1,37,0), (38,1,38,0), (39,1,39,0), (40,1,40,0), (41,1,41,0), (42,1,42,0), (43,1,43,0),
(44,1,44,0), (45,1,45,0), (46,1,46,0), (47,1,47,0), (48,1,48,0), (49,1,49,0), (50,1,50,0),
(51,1,51,0), (52,1,52,0), (53,1,53,0), (54,1,54,0), (55,1,55,0), (56,1,56,0), (57,1,57,0),
(58,1,58,0), (59,1,59,0), (60,1,60,0), (61,1,61,0), (62,1,62,0), (63,1,63,0), (64,1,64,0),
(65,1,65,0), (66,1,66,0), (67,1,67,0), (68,1,68,0), (69,1,69,0), (70,1,70,0), (71,1,71,0),
(72,1,72,0), (73,1,73,0), (74,1,74,0), (75,1,75,0), (76,1,76,0), (77,1,77,0), (78,1,78,0),
(79,1,79,0), (80,1,80,0), (81,1,81,0), (82,1,82,0), (83,1,83,0), (84,1,84,0), (85,1,85,0),
(86,1,86,0), (87,1,87,0), (88,1,88,0), (89,1,89,0), (90,1,90,0), (91,1,91,0), (92,1,92,0),
(93,1,93,0), (94,1,94,0), (95,1,95,0), (96,1,96,0), (97,1,97,0), (98,1,98,0), (99,1,99,0),
(100,1,100,0), (101,1,101,0), (102,1,102,0), (103,1,103,0), (104,1,104,0), (105,1,105,0), (106,1,106,0),
(107,1,107,0), (108,1,108,0), (109,1,109,0), (110,1,110,0), (111,1,111,0), (112,1,112,0), (113,1,113,0),
(114,1,114,0), (115,1,115,0), (116,1,116,0), (117,1,117,0), (118,1,118,0), (119,1,119,0), (120,1,120,0),
(121,1,121,0), (122,1,122,0), (123,1,123,0), (124,1,124,0), (125,1,125,0), (126,1,126,0), (127,1,127,0),
(128,1,128,0), (129,1,129,0), (130,1,130,0), (131,1,131,0), (132,1,132,0), (133,1,133,0), (134,1,134,0),
(135,1,135,0), (136,1,136,0), (137,1,137,0), (138,1,138,0), (139,1,139,0), (140,1,140,0), (141,1,141,0),
(142,1,142,0), (143,1,143,0), (144,1,144,0), (145,1,145,0), (146,1,146,0), (147,1,147,0), (148,1,148,0),
(149,1,149,0), (150,1,150,0), (151,1,151,0), (152,1,152,0), (153,1,153,0), (154,1,154,0), (155,1,155,0),
(156,1,156,0), (157,1,157,0), (158,1,158,0), (159,1,159,0), (160,1,160,0), (161,1,161,0), (162,1,162,0),
(163,1,163,0), (164,1,164,0), (165,1,165,0), (166,1,166,0), (167,1,167,0), (168,1,168,0), (169,1,169,0),
(170,1,170,0), (171,1,171,0), (172,1,172,0), (173,1,173,0), (174,1,174,0), (175,1,175,0), (176,1,176,0),
(177,1,177,0), (178,1,178,0), (179,1,179,0), (180,1,180,0), (181,1,181,0), (182,1,182,0), (183,1,183,0),
(184,1,184,0), (185,1,185,0), (186,1,186,0), (187,1,187,0), (188,1,188,0), (189,1,189,0), (190,1,190,0),
(191,1,191,0), (192,1,192,0), (193,1,193,0), (194,1,194,0), (195,1,195,0), (196,1,196,0), (197,1,197,0),
(198,1,198,0), (199,1,199,0), (200,1,200,0), (201,1,201,0), (202,1,202,0), (203,1,203,0), (204,1,204,0),
(205,1,205,0), (206,1,206,0), (207,1,207,0), (208,1,208,0), (209,1,209,0), (210,1,210,0), (211,1,211,0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES
(212,1,4,0), (213,1,4,0), (214,1,4,0), (215,1,4,0), (216,1,4,0), (217,1,4,0), (218,1,4,0),
(219,1,4,0), (220,1,4,0), (221,1,4,0);

INSERT INTO player_items (id, player_id, item_id, is_equipped) VALUES
(222,1,133,0), (223,1,133,0), (224,1,133,0), (225,1,133,0), (226,1,133,0), (227,1,133,0), (228,1,133,0),
(229,1,133,0), (230,1,133,0), (231,1,133,0);

INSERT INTO player_items (player_id, item_id, is_equipped) VALUES 
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0),
(1, 212, 0);
-- 1 Trứng thú cưng (ID: 213)
INSERT INTO player_items (player_id, item_id, is_equipped) VALUES (1, 213, 0);