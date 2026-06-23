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
            'awakening_stats' => $player->awakening_stats
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
}