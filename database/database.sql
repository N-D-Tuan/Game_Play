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