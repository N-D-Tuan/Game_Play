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

    public function sellItem(Request $request)
    {
        $playerId = $request->input('player_id');
        $itemIdsToSell = $request->input('item_ids'); // Nhận một mảng ID các món đồ cần bán
        $quantityToSell = $request->input('quantity'); // Áp dụng cho vật phẩm stackable

        if (!$itemIdsToSell || !is_array($itemIdsToSell) || count($itemIdsToSell) == 0) {
            return response()->json(['status' => 'error', 'message' => 'Lỗi dữ liệu: Không có vật phẩm nào được chọn!']);
        }

        $player = Player::find($playerId);
        if (!$player) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy người chơi!']);
        }

        $firstItemId = $itemIdsToSell[0];
        $playerItem = \Illuminate\Support\Facades\DB::table('player_items')
            ->join('items', 'player_items.item_id', '=', 'items.id')
            ->select('player_items.*', 'items.rarity')
            ->where('player_items.id', $firstItemId)
            ->where('player_items.player_id', $playerId)
            ->first();

        if (!$playerItem) {
            return response()->json(['status' => 'error', 'message' => 'Vật phẩm không tồn tại hoặc không thuộc về bạn!']);
        }

        if ($playerItem->is_equipped) {
            return response()->json(['status' => 'error', 'message' => 'Không thể bán trang bị đang mặc!']);
        }

        // Tính giá trị của 1 vật phẩm (Logic y hệt như Frontend để đồng bộ)
        $basePrices = ['F' => 50, 'E' => 150, 'D' => 500, 'C' => 1500, 'B' => 5000, 'A' => 20000, 'S' => 100000];
        $price = $basePrices[$playerItem->rarity] ?? 10;
        
        if ($playerItem->upgrade_level > 0) {
            $price += $price * ($playerItem->upgrade_level * 0.5);
        }

        // --- BẬC S ---
        if ($playerItem->item_id == 213) $price = 62500; // Trứng pet (Mua 250k)
        if ($playerItem->item_id == 216) $price = 50000; // Thánh hộ phù (Mua 200k)        
        
        // --- BẬC A ---
        if ($playerItem->item_id == 219) $price = 20000; // Tàn tích thần trí (Mua 80k)
        if ($playerItem->item_id == 221) $price = 30000; // Tinh chất ngân hà (Mua 120k)
        if ($playerItem->item_id == 222) $price = 15000; // Tinh thạch đỏ (Mua 60k)
        if ($playerItem->item_id == 223) $price = 15000; // Tinh thạch tím (Mua 60k)
        
        // --- BẬC B ---
        if ($playerItem->item_id == 218) $price = 11250; // Miếng cắn vực thẳm (Mua 45k)
        if ($playerItem->item_id == 224) $price = 8750;  // Tinh thạch lục (Mua 35k)
        if ($playerItem->item_id == 225) $price = 8750;  // Tinh thạch lam (Mua 35k)
        
        // --- BẬC C, D, E, F ---
        if ($playerItem->item_id == 212) $price = 3000;  // Mảnh trứng (Mua 12k)
        if ($playerItem->item_id == 217) $price = 1500;  // Trái cấm (Mua 5k/viên)
        if ($playerItem->item_id == 214) $price = 1000;  // Huyết thạch (Mua 4k/viên)
        if ($playerItem->item_id == 220) $price = 150;   // Bụi tinh tú (Mua 600/viên)
        if ($playerItem->item_id == 215) $price = 1250;  // Hộ thể phù (Mua 5k)

        $price = round($price);
        $totalGoldEarned = $price * count($itemIdsToSell);

        // Tiến hành Xóa các vật phẩm khỏi DB
        \DB::table('player_items')->whereIn('id', $itemIdsToSell)->delete();

        // Cộng vàng cho người chơi
        $player->gold += $totalGoldEarned;
        $player->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Bán thành công!',
            'gold_earned' => $totalGoldEarned,
            'new_gold' => $player->gold
        ]);
    }

    public function getShopData(Request $request)
    {
        $playerId = $request->input('player_id');
        $player = Player::find($playerId);

        if (!$player) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy tài khoản!']);
        }

        $today = date('Y-m-d');
        $needsRefresh = false;

        // KIỂM TRA RESET QUA NGÀY
        if ($player->last_shop_refresh_date !== $today) {
            $player->shop_free_refreshes = 3;
            $player->last_shop_refresh_date = $today;
            if (!$player->is_shop_locked) {
                $needsRefresh = true;
            }
        }

        if (!$player->shop_items || $needsRefresh) {
            $player->shop_items = $this->generateShopItems();
            $player->save();
        }

        return response()->json([
            'status' => 'success',
            'shop_items' => json_decode($player->shop_items),
            'free_refreshes' => $player->shop_free_refreshes,
            'gold' => $player->gold,
            'is_shop_locked' => (bool)$player->is_shop_locked
        ]);
    }

    public function refreshShop(Request $request)
    {
        $playerId = $request->input('player_id');
        $player = Player::find($playerId);

        if ($player->is_shop_locked) {
            return response()->json(['status' => 'error', 'message' => 'Shop đang bị khóa! Phải mở khóa mới được Làm Mới.']);
        }

        $cost = 5000; // Giá làm mới bằng Vàng khi hết lượt Free

        if ($player->shop_free_refreshes > 0) {
            $player->shop_free_refreshes -= 1;
        } else {
            if ($player->gold < $cost) {
                return response()->json(['status' => 'error', 'message' => 'Không đủ 5.000 Vàng để làm mới!']);
            }
            $player->gold -= $cost; // Trừ Vàng
        }

        $player->shop_items = $this->generateShopItems();
        $player->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã làm mới Cửa Hàng!',
            'shop_items' => json_decode($player->shop_items),
            'free_refreshes' => $player->shop_free_refreshes,
            'new_gold' => $player->gold
        ]);
    }

    private function generateShopItems($currentItems = null)
    {
        $items = [];
        for ($i = 0; $i < 9; $i++) {
            $rand = mt_rand(1, 10000); 
            
            if ($rand <= 10) {             $rarity = 'S'; $color = '#ffffff';
            } elseif ($rand <= 50) {       $rarity = 'A'; $color = '#ff0000';
            } elseif ($rand <= 300) {      $rarity = 'B'; $color = '#ffd700';
            } elseif ($rand <= 1000) {     $rarity = 'C'; $color = '#a335ee';
            } elseif ($rand <= 2500) {     $rarity = 'D'; $color = '#00aaff';
            } elseif ($rand <= 5000) {     $rarity = 'E'; $color = '#00ff00';
            } else {                       $rarity = 'F'; $color = '#ffffff'; }

            $pool = $this->getShopPoolByRarity($rarity);
            $selectedItem = $pool[array_rand($pool)]; 
            
            $selectedItem['color'] = $color;
            $selectedItem['index_key'] = $i; 
            $selectedItem['is_bought'] = false;
            
            $items[] = $selectedItem;
        }
        return json_encode($items);
    }

    private function getShopPoolByRarity($rarity)
    {
        $pools = [
            'S' => [
                ['item_id' => 213, 'name' => 'Trứng Thú Cưng', 'icon' => 'egg.png', 'qty' => 1, 'price' => 250000, 'rarity' => 'S', 'slot' => 'material'],
                ['item_id' => 216, 'name' => 'Thánh Hộ Phù', 'icon' => 'charm_holy.png', 'qty' => 1, 'price' => 200000, 'rarity' => 'S', 'slot' => 'material'],           
            ],
            'A' => [
                ['item_id' => 219, 'name' => 'Tàn Tích Thần Trí', 'icon' => 'food3.png', 'qty' => 1, 'price' => 80000, 'rarity' => 'A', 'slot' => 'material'],
                ['item_id' => 221, 'name' => 'Tinh Chất Ngân Hà', 'icon' => 'galaxy_stardust.png', 'qty' => 1, 'price' => 120000, 'rarity' => 'A', 'slot' => 'material'],
                ['item_id' => 222, 'name' => 'Tinh Thạch Đỏ', 'icon' => 'rune_do.png', 'qty' => 1, 'price' => 60000, 'rarity' => 'A', 'slot' => 'rune'],
                ['item_id' => 223, 'name' => 'Tinh Thạch Tím', 'icon' => 'rune_tim.png', 'qty' => 1, 'price' => 60000, 'rarity' => 'A', 'slot' => 'rune'],
            ],
            'B' => [
                ['item_id' => 218, 'name' => 'Miếng Cắn Vực Thẳm', 'icon' => 'food2.png', 'qty' => 1, 'price' => 45000, 'rarity' => 'B', 'slot' => 'material'],
                ['item_id' => 224, 'name' => 'Tinh Thạch Lục', 'icon' => 'rune_luc.png', 'qty' => 1, 'price' => 35000, 'rarity' => 'B', 'slot' => 'rune'],
                ['item_id' => 225, 'name' => 'Tinh Thạch Lam', 'icon' => 'rune_lam.png', 'qty' => 1, 'price' => 35000, 'rarity' => 'B', 'slot' => 'rune'],
            ],
            'C' => [
                ['item_id' => 217, 'name' => 'Trái Cấm Địa Đàn', 'icon' => 'food1.png', 'qty' => 5, 'price' => 25000, 'rarity' => 'C', 'slot' => 'food'],
                ['item_id' => 214, 'name' => 'Huyết Thạch', 'icon' => 'bloodstone.png', 'qty' => 6, 'price' => 24000, 'rarity' => 'C', 'slot' => 'material'],                
                ['item_id' => 215, 'name' => 'Hộ Thể Phù', 'icon' => 'charm_normal.png', 'qty' => 3, 'price' => 15000, 'rarity' => 'C', 'slot' => 'material'],
            ],
            'D' => [
                ['item_id' => 212, 'name' => 'Mảnh Trứng', 'icon' => 'egg_piece.png', 'qty' => 3, 'price' => 36000, 'rarity' => 'D', 'slot' => 'material'],
                ['item_id' => 214, 'name' => 'Huyết Thạch', 'icon' => 'bloodstone.png', 'qty' => 3, 'price' => 12000, 'rarity' => 'D', 'slot' => 'material'],
                ['item_id' => 215, 'name' => 'Hộ Thể Phù', 'icon' => 'charm_normal.png', 'qty' => 1, 'price' => 5000, 'rarity' => 'D', 'slot' => 'material'],
            ],
            'E' => [
                ['item_id' => 220, 'name' => 'Bụi Tinh Tú', 'icon' => 'stardust.png', 'qty' => 30, 'price' => 18000, 'rarity' => 'E', 'slot' => 'material'],
                ['item_id' => 214, 'name' => 'Huyết Thạch', 'icon' => 'bloodstone.png', 'qty' => 1, 'price' => 4000, 'rarity' => 'E', 'slot' => 'material'],
            ],
            'F' => [
                ['item_id' => 220, 'name' => 'Bụi Tinh Tú', 'icon' => 'stardust.png', 'qty' => 10, 'price' => 6000, 'rarity' => 'F', 'slot' => 'material'],
                ['item_id' => 212, 'name' => 'Mảnh Trứng', 'icon' => 'egg_piece.png', 'qty' => 1, 'price' => 12000, 'rarity' => 'F', 'slot' => 'material'],
                ['item_id' => 217, 'name' => 'Trái Cấm Địa Đàn', 'icon' => 'food1.png', 'qty' => 1, 'price' => 5000, 'rarity' => 'F', 'slot' => 'food'],
            ]
        ];
        return $pools[$rarity] ?? $pools['F'];
    }

    public function toggleLockItem(Request $request)
    {
        $playerId = $request->input('player_id');
        $player = Player::find($playerId);
        
        $player->is_shop_locked = !$player->is_shop_locked;
        $player->save();

        $msg = $player->is_shop_locked ? 'Đã KHÓA toàn bộ Cửa Hàng!' : 'Đã MỞ KHÓA Cửa Hàng!';

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'is_shop_locked' => (bool)$player->is_shop_locked
        ]);
    }
}