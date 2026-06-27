<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Player;
use Illuminate\Support\Facades\DB;

class PlayerController extends Controller
{
    public function show($id)
    {
        $player = Player::find($id);

        if ($player) {
            return response()->json([
                'status' => 'success',
                'player' => $player
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Không tìm thấy người chơi'
        ], 404);
    }

    public function getTalents($id)
    {
        $player = Player::find($id);

        if (!$player) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người chơi'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'talent_points' => $player->talent_points ?? 0,
            'unlocked_nodes' => $player->unlocked_nodes,
            'equipped_skills' => $player->equipped_skills,
            'awakening_stats' => $player->awakening_stats,
            'awakening_locks' => $player->awakening_locks
        ]);
    }

    public function unlockTalent(Request $request)
    {
        $playerId = $request->input('player_id');
        $node = $request->input('node');

        $player = Player::find($playerId);

        if (!$player) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người chơi'
            ], 404);
        }

        $costs = [
            'earth' => 1, 'meteor' => 2, 'lightning' => 5,
            'arrows' => 1, 'doll' => 2, 'swords' => 5,
            'heal' => 1, 'shield' => 2, 'anchor' => 5
        ];
        
        $cost = $costs[$node] ?? 1;

        if ($player->talent_points < $cost) {
            return response()->json([
                'status' => 'error', 
                'message' => "Không đủ điểm! Cần $cost điểm."
            ], 400);
        }

        // Xử lý mảng các Node đã mở (Giải mã JSON nếu lưu dưới dạng chuỗi trong DB)
        $unlockedNodes = is_string($player->unlocked_nodes) 
            ? json_decode($player->unlocked_nodes, true) 
            : ($player->unlocked_nodes ?? []);

        if (!$unlockedNodes) {
            $unlockedNodes = [];
        }

        // Kiểm tra xem đã mở khóa node này chưa để tránh spam trừ điểm
        if (in_array($node, $unlockedNodes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kỹ năng này đã được mở khóa!'
            ], 400);
        }

        // Thêm node mới, trừ 1 điểm và lưu lại
        $unlockedNodes[] = $node;
        $player->talent_points -= $cost;
        
        // Lưu lại vào database dạng JSON chuỗi
        $player->unlocked_nodes = json_encode($unlockedNodes);
        $player->save();

        return response()->json([
            'status' => 'success',
            'talent_points' => $player->talent_points,
            'unlocked_nodes' => $player->unlocked_nodes
        ]);
    }

    public function equipSkills(Request $request)
    {
        $playerId = $request->input('player_id');
        $equippedSkills = $request->input('equipped_skills');

        $player = Player::find($playerId);

        if (!$player) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người chơi'
            ], 404);
        }

        // Kiểm tra đầu vào phải là mảng
        if (!is_array($equippedSkills)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dữ liệu không hợp lệ'
            ], 400);
        }

        // Lưu trực tiếp mảng (sau khi mã hóa JSON) vào DB
        $player->equipped_skills = json_encode($equippedSkills);
        $player->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Lưu kỹ năng xuất chiến thành công'
        ]);
    }

    public function rollAwakening(Request $request)
    {
        $playerId = $request->input('player_id');
        $lockedIndexes = $request->input('locked_indexes', []);

        // 1. TÍNH CHI PHÍ ROLL
        $lockedCount = count(array_filter($lockedIndexes));
        $cost = 1;
        if ($lockedCount == 1) $cost = 2;
        elseif ($lockedCount == 2) $cost = 5;
        elseif ($lockedCount == 3) $cost = 10;
        elseif ($lockedCount >= 4 && $lockedCount <= 6) $cost = 50;
        elseif ($lockedCount == 7) $cost = 100;

        // 2. KIỂM TRA ĐIỀU KIỆN
        $player = \Illuminate\Support\Facades\DB::table('players')->where('id', $playerId)->first();
        if (!$player) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy người chơi!']);
        }

        if ($player->talent_points < $cost) {
            return response()->json(['status' => 'error', 'message' => "Không đủ Điểm Thiên Phú! Cần $cost điểm."]);
        }

        $currentStats = json_decode($player->awakening_stats, true);
        if (!$currentStats || count($currentStats) < 8) {
            $currentStats = array_fill(0, 8, null);
        }

        // 3. BẢNG CẤU HÌNH CHỈ SỐ CHI TIẾT
        $statConfig = [
            0 => ['id' => 'hp', 'name' => 'HP', 'group' => 1, 'tiers' => [
                'white'  => ['flat' => [100, 300],   'pct' => [1.0, 3.0]],
                'green'  => ['flat' => [301, 600],   'pct' => [4.0, 6.0]],
                'blue'   => ['flat' => [601, 1000],  'pct' => [7.0, 10.0]],
                'purple' => ['flat' => [1001, 1500], 'pct' => [11.0, 15.0]],
                'gold'   => ['flat' => [1501, 2000], 'pct' => [16.0, 20.0]],
                'red'    => ['flat' => [2001, 3000], 'pct' => [21.0, 30.0]],
            ]],
            1 => ['id' => 'atk', 'name' => 'ATK', 'group' => 1, 'tiers' => [
                'white'  => ['flat' => [10, 30],   'pct' => [1.0, 2.0]],
                'green'  => ['flat' => [31, 80],   'pct' => [3.0, 5.0]],
                'blue'   => ['flat' => [81, 150],  'pct' => [6.0, 8.0]],
                'purple' => ['flat' => [151, 250], 'pct' => [9.0, 12.0]],
                'gold'   => ['flat' => [251, 400], 'pct' => [13.0, 15.0]],
                'red'    => ['flat' => [401, 600], 'pct' => [16.0, 20.0]],
            ]],
            2 => ['id' => 'hpRegen', 'name' => 'Hồi Máu', 'group' => 1, 'tiers' => [
                'white'  => ['flat' => [1, 3],   'pct' => [1.0, 2.0]],
                'green'  => ['flat' => [4, 8],   'pct' => [3.0, 4.0]],
                'blue'   => ['flat' => [9, 15],  'pct' => [5.0, 6.0]],
                'purple' => ['flat' => [16, 30], 'pct' => [7.0, 8.0]],
                'gold'   => ['flat' => [31, 50], 'pct' => [9.0, 10.0]],
                'red'    => ['flat' => [51, 100], 'pct' => [11.0, 15.0]],
            ]],
            3 => ['id' => 'speed', 'name' => 'Tốc Độ', 'group' => 1, 'tiers' => [
                'white'  => ['flat' => [5, 10],   'pct' => [1.0, 2.0]],
                'green'  => ['flat' => [11, 20],  'pct' => [3.0, 5.0]],
                'blue'   => ['flat' => [21, 35],  'pct' => [6.0, 8.0]],
                'purple' => ['flat' => [36, 50],  'pct' => [9.0, 12.0]],
                'gold'   => ['flat' => [51, 70],  'pct' => [13.0, 16.0]],
                'red'    => ['flat' => [71, 100], 'pct' => [17.0, 25.0]],
            ]],
            4 => ['id' => 'critRate', 'name' => 'Tỉ lệ CM', 'group' => 2, 'tiers' => [
                'white'  => ['pct' => [0.1, 0.5]], 'green'  => ['pct' => [0.6, 1.5]],
                'blue'   => ['pct' => [1.6, 3.0]], 'purple' => ['pct' => [3.1, 5.0]],
                'gold'   => ['pct' => [5.1, 8.0]], 'red'    => ['pct' => [8.1, 12.0]],
            ]],
            5 => ['id' => 'critDmg', 'name' => 'ST CM', 'group' => 2, 'tiers' => [
                'white'  => ['pct' => [1.0, 5.0]], 'green'  => ['pct' => [6.0, 12.0]],
                'blue'   => ['pct' => [13.0, 20.0]],'purple' => ['pct' => [21.0, 30.0]],
                'gold'   => ['pct' => [31.0, 45.0]],'red'    => ['pct' => [46.0, 60.0]],
            ]],
            6 => ['id' => 'dodge', 'name' => 'Né', 'group' => 2, 'tiers' => [
                'white'  => ['pct' => [0.1, 0.5]], 'green'  => ['pct' => [0.6, 1.2]],
                'blue'   => ['pct' => [1.3, 2.5]], 'purple' => ['pct' => [2.6, 4.0]],
                'gold'   => ['pct' => [4.1, 6.0]], 'red'    => ['pct' => [6.1, 10.0]],
            ]],
            7 => ['id' => 'lifesteal', 'name' => 'Hút Máu', 'group' => 2, 'tiers' => [
                'white'  => ['pct' => [0.1, 0.5]], 'green'  => ['pct' => [0.6, 1.0]],
                'blue'   => ['pct' => [1.1, 2.0]], 'purple' => ['pct' => [2.1, 3.5]],
                'gold'   => ['pct' => [3.6, 5.0]], 'red'    => ['pct' => [5.1, 8.0]],
            ]],
        ];

        // 4. TRỌNG SỐ GACHA MÀU SẮC
        $rarities = [
            ['name' => 'white',  'color' => '#ffffff', 'chance' => 50.0],
            ['name' => 'green',  'color' => '#00ff00', 'chance' => 25.0],
            ['name' => 'blue',   'color' => '#00aaff', 'chance' => 15.0],
            ['name' => 'purple', 'color' => '#a335ee', 'chance' => 7.5],
            ['name' => 'gold',   'color' => '#ffd700', 'chance' => 2.0],
            ['name' => 'red',    'color' => '#ff0000', 'chance' => 0.5] 
        ];

        $newStats = [];

        // 5. THỰC THI THUẬT TOÁN ĐỔ XÚC XẮC CHO TỪNG Ô
        for ($i = 0; $i < 8; $i++) {
            if (isset($lockedIndexes[$i]) && $lockedIndexes[$i] == true && $currentStats[$i] != null) {
                $newStats[$i] = $currentStats[$i];
                continue; // Ô bị khóa thì bỏ qua
            }

            $cfg = $statConfig[$i];
            
            // Quay độ hiếm (Màu sắc)
            $rollColor = mt_rand(0, 1000) / 10; 
            $currentSum = 0;
            $selectedRarity = $rarities[0];
            
            foreach ($rarities as $r) {
                $currentSum += $r['chance'];
                if ($rollColor <= $currentSum) {
                    $selectedRarity = $r;
                    break;
                }
            }
            $tierName = $selectedRarity['name'];

            // Xác định xem sẽ roll ra Flat hay Pct
            $isFlat = false;
            if ($cfg['group'] == 1) {
                $isFlat = (mt_rand(0, 1) == 0); // Tỉ lệ 50-50 cho Nhóm 1
            } // Nhóm 2 mặc định false (Chỉ có % pct)

            // Lấy khoảng Min - Max theo đúng mốc bạn thiết kế
            $typeKey = $isFlat ? 'flat' : 'pct';
            $minVal = $cfg['tiers'][$tierName][$typeKey][0];
            $maxVal = $cfg['tiers'][$tierName][$typeKey][1];

            // ÁP DỤNG THUẬT TOÁN PHI TUYẾN TÍNH (Non-linear distribution)
            // Lũy thừa 3 giúp tỉ lệ rớt ra số nhỏ lớn hơn cực kỳ nhiều so với rớt ra số Max
            $randomSeed = mt_rand(0, 10000) / 10000.0;
            $weightedCurve = pow($randomSeed, 3); 
            
            // Tính toán giá trị cuối cùng
            $finalValue = $minVal + ($maxVal - $minVal) * $weightedCurve;

            // Làm tròn số: Cộng thẳng thì không có số thập phân, phần trăm thì có 1 số sau dấu phẩy
            if ($isFlat) {
                $finalValue = round($finalValue);
                $valueString = '+' . $finalValue;
            } else {
                $finalValue = round($finalValue, 1);
                $valueString = '+' . $finalValue . '%';
            }

            // TÍNH TOÁN RATIO ĐỂ VẼ BIỂU ĐỒ RADAR TRÊN FRONTEND (Quy chiếu theo mốc Đỏ Max)
            $absoluteRedMax = $cfg['tiers']['red'][$typeKey][1]; 
            $chartRatio = $finalValue / $absoluteRedMax;

            $newStats[$i] = [
                'id' => $cfg['id'],
                'name' => $cfg['name'],
                'value' => $finalValue,
                'is_flat' => $isFlat,
                'value_str' => $valueString,
                'color' => $selectedRarity['color'],
                'ratio' => round($chartRatio, 3) 
            ];
        }

        // 6. LƯU KẾT QUẢ VÀ TRỪ ĐIỂM
        $newPoints = $player->talent_points - $cost;
        \Illuminate\Support\Facades\DB::table('players')->where('id', $playerId)->update([
            'talent_points' => $newPoints,
            'awakening_stats' => json_encode($newStats)
        ]);

        return response()->json([
            'status' => 'success',
            'talent_points' => $newPoints,
            'stats' => $newStats,
            'message' => 'Tế Hồn thành công!'
        ]);
    }

    public function saveAwakeningLocks(Request $request)
    {
        $playerId = $request->input('player_id');
        $locks = $request->input('locks');

        if (is_array($locks)) {
            \Illuminate\Support\Facades\DB::table('players')
                ->where('id', $playerId)
                ->update(['awakening_locks' => json_encode($locks)]);
        }

        return response()->json(['status' => 'success']);
    }

    public function upgradeCore(Request $request)
    {
        $playerId = $request->input('player_id');

        return DB::transaction(function () use ($playerId) {
            $player = DB::table('players')->where('id', $playerId)->lockForUpdate()->first();
            
            if (!$player) return response()->json(['status' => 'error', 'message' => 'Player không tồn tại!'], 404);
            if ($player->level_star >= 10) return response()->json(['status' => 'error', 'message' => 'Đã đạt cấp tối đa!']);

            // Không có cột equipped_slot trong DB, nên ta lấy rune đang khảm
            // dựa theo item_id của 4 màu Tinh Thạch cố định (đỏ/tím/lục/lam).
            $runeItemIds = [222, 223, 224, 225]; // Đỏ, Tím, Lục, Lam

            $runes = DB::table('player_items')
                ->join('items', 'player_items.item_id', '=', 'items.id')
                ->where('player_items.player_id', $playerId)
                ->where('player_items.is_equipped', 1)
                ->whereIn('player_items.item_id', $runeItemIds)
                ->select('player_items.*', 'items.hp', 'items.hp_regen', 'items.atk', 'items.dodge',
                          'items.crit_rate', 'items.crit_damage', 'items.lifesteal', 'items.speed')
                ->get();

            if ($runes->count() < 4) {
                return response()->json(['status' => 'error', 'message' => 'Cần khảm đủ 4 rãnh!']);
            }

            if ($runes->contains(fn($r) => $r->upgrade_level != $player->level_star)) {
                return response()->json(['status' => 'error', 'message' => "Cần 4 viên Tinh Thạch Lv.{$player->level_star}!"]);
            }

            $upgradeCosts = [
                1 => ['id' => 220, 'amount' => 10],
                2 => ['id' => 220, 'amount' => 20],
                3 => ['id' => 220, 'amount' => 30],
                4 => ['id' => 220, 'amount' => 50],
                5 => ['id' => 220, 'amount' => 80],
                6 => ['id' => 220, 'amount' => 120],
                7 => ['id' => 221, 'amount' => 10],
                8 => ['id' => 221, 'amount' => 25],
                9 => ['id' => 221, 'amount' => 50],
            ];

            $cost = $upgradeCosts[$player->level_star];
            
            // Dựa theo database.sql của bạn, các nguyên liệu đang lưu mỗi item 1 dòng
            $materials = DB::table('player_items')
                ->where('player_id', $playerId)
                ->where('item_id', $cost['id'])
                ->where('is_equipped', 0)
                ->limit($cost['amount'])
                ->get();

            if ($materials->count() < $cost['amount']) {
                $materialName = $cost['id'] == 220 ? 'Bụi Tinh Tú' : 'Tinh Chất Ngân Hà';
                return response()->json([
                    'status' => 'error', 
                    'message' => "Không đủ {$cost['amount']} {$materialName} để Đột phá!"
                ]);
            }

            // Tiến hành XÓA nguyên liệu
            DB::table('player_items')->whereIn('id', $materials->pluck('id'))->delete();
            // ==========================================

            $currentStats = json_decode($player->astrolabe_stats ?? '{}', true);
            
            $multipliers = [1 => 1.0, 2 => 1.5, 3 => 2.0, 4 => 2.6, 5 => 3.3, 6 => 4.1, 7 => 5.0, 8 => 6.0, 9 => 7.2, 10 => 8.5];
            $multiplier = $multipliers[$player->level_star] ?? 1.0;

            // Map cột DB của items -> tên field stat dùng ở frontend
            $statColumnMap = [
                'hp' => 'hp',
                'hp_regen' => 'hpRegen',
                'atk' => 'atk',
                'dodge' => 'dodge',
                'crit_rate' => 'critRate',
                'crit_damage' => 'critDamage',
                'lifesteal' => 'lifesteal',
                'speed' => 'speed',
            ];

            foreach ($runes as $rune) {
                foreach ($statColumnMap as $column => $statKey) {
                    $baseValue = $rune->$column ?? 0;
                    if ($baseValue == 0) continue;

                    $actualValue = round($baseValue * $multiplier);
                    $currentStats[$statKey] = ($currentStats[$statKey] ?? 0) + $actualValue;
                }
            }

            DB::table('players')->where('id', $playerId)->update([
                'level_star' => $player->level_star + 1,
                'astrolabe_stats' => json_encode($currentStats)
            ]);

            DB::table('player_items')->whereIn('id', $runes->pluck('id'))->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Đột phá thành công!',
                'new_level' => $player->level_star + 1
            ]);
        });
    }

    public function equipRune(Request $request)
    {
        $playerId = $request->input('player_id');
        $runeId = $request->input('item_id');
        $slot = $request->input('slot'); // "red" | "blue" | "green" | "purple" (chỉ dùng để validate, không lưu DB)

        if (!$playerId || !$runeId || !$slot) {
            return response()->json(['status' => 'error', 'message' => 'Thiếu dữ liệu gửi lên!'], 400);
        }

        // Vì DB không có cột equipped_slot, ta dùng item_id để suy ra màu/rãnh
        // (mỗi item_id rune ứng với đúng 1 màu cố định, nên màu = rãnh).
        $slotColorToItemId = [
            'red'    => 222, // Tinh Thạch Đỏ
            'purple' => 223, // Tinh Thạch Tím
            'green'  => 224, // Tinh Thạch Lục
            'blue'   => 225, // Tinh Thạch Lam
        ];

        $normalizedSlot = str_replace('astro_', '', $slot); // chấp nhận cả "red" và "astro_red"

        if (!isset($slotColorToItemId[$normalizedSlot])) {
            return response()->json(['status' => 'error', 'message' => 'Rãnh khảm không hợp lệ!'], 400);
        }

        $expectedItemId = $slotColorToItemId[$normalizedSlot];

        return DB::transaction(function () use ($playerId, $runeId, $normalizedSlot, $expectedItemId) {
            // 0. Lấy level_star hiện tại của Lõi Sao (Tháp Tinh Tú)
            $player = DB::table('players')->where('id', $playerId)->first();

            if (!$player) {
                return response()->json(['status' => 'error', 'message' => 'Không tìm thấy người chơi!'], 404);
            }

            // 1. Kiểm tra viên đá muốn khảm
            $rune = DB::table('player_items')
                ->join('items', 'player_items.item_id', '=', 'items.id')
                ->where('player_items.id', $runeId)
                ->where('player_items.player_id', $playerId)
                ->select('player_items.*', 'items.type', 'items.rarity',
                          'items.hp', 'items.hp_regen', 'items.atk', 'items.dodge',
                          'items.crit_rate', 'items.crit_damage', 'items.lifesteal', 'items.speed')
                ->first();

            if (!$rune) {
                return response()->json(['status' => 'error', 'message' => 'Không tìm thấy Tinh Thạch!']);
            }

            if ($rune->type !== 'rune') {
                return response()->json(['status' => 'error', 'message' => 'Vật phẩm này không phải Tinh Thạch!']);
            }

            // 1b. CHỈ cho khảm rune có upgrade_level KHỚP ĐÚNG với level_star hiện tại của Lõi Sao
            if ((int) $rune->upgrade_level !== (int) $player->level_star) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Lõi Sao Lv.{$player->level_star} chỉ nhận Tinh Thạch Lv.{$player->level_star}!"
                ]);
            }

            // 2. Đối chiếu màu rune với rãnh người chơi chọn (vì rãnh = màu cố định theo item_id)
            if ((int) $rune->item_id !== $expectedItemId) {
                return response()->json(['status' => 'error', 'message' => 'Tinh Thạch này không khớp với rãnh này!']);
            }

            if ($rune->is_equipped == 1) {
                return response()->json(['status' => 'error', 'message' => 'Tinh Thạch này đang được khảm rồi!']);
            }

            // 3. Kiểm tra rãnh (cùng màu = cùng item_id) đã có viên khác đang khảm chưa
            $existingRune = DB::table('player_items')
                ->where('player_id', $playerId)
                ->where('item_id', $expectedItemId)
                ->where('is_equipped', 1)
                ->first();

            if ($existingRune) {
                return response()->json(['status' => 'error', 'message' => 'Rãnh đã có Tinh Thạch! Hãy tháo ra trước.']);
            }

            // 4. Thực hiện khảm (chỉ cập nhật cột is_equipped đã có sẵn, không đụng schema)
            DB::table('player_items')->where('id', $runeId)->update([
                'is_equipped' => 1
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Khảm Tinh Thạch thành công!'
            ]);
        });
    }

    public function unequipRune(Request $request)
    {
        $playerId = $request->input('player_id');
        $runeId = $request->input('item_id'); // id của player_items (dòng rune đang khảm)

        if (!$playerId || !$runeId) {
            return response()->json(['status' => 'error', 'message' => 'Thiếu dữ liệu gửi lên!'], 400);
        }

        $rune = DB::table('player_items')
            ->where('id', $runeId)
            ->where('player_id', $playerId)
            ->first();

        if (!$rune) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy Tinh Thạch!'], 404);
        }

        if ($rune->is_equipped != 1) {
            return response()->json(['status' => 'error', 'message' => 'Tinh Thạch này chưa được khảm!'], 400);
        }

        DB::table('player_items')->where('id', $runeId)->update([
            'is_equipped' => 0
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã tháo Tinh Thạch!'
        ]);
    }
}