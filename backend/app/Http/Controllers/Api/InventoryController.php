<?php

namespace App\Http\Controllers\Api;

use App\Models\PlayerItem; 
use App\Models\Item;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * 1. LẤY TOÀN BỘ KHO ĐỒ
     */
    public function index($playerId)
    {
        // Dùng Eager Loading (with) để lấy luôn thông tin gốc của món đồ
        $inventory = PlayerItem::with('item')
            ->where('player_id', $playerId)
            ->get();

        // Format lại data cho giống chuẩn Frontend đang dùng trong main.js
        $formattedItems = $inventory->map(function ($playerItem) {
            $base = $playerItem->item;

            if (!$base) return null;
            
            // Lọc ra các stats lớn hơn 0 để đẩy vào object 'stats'
            $stats = [];
            if ($base->hp > 0) $stats['hp'] = $base->hp;
            if ($base->hp_regen > 0) $stats['hpRegen'] = $base->hp_regen;
            if ($base->atk > 0) $stats['atk'] = $base->atk;
            if ($base->dodge > 0) $stats['dodge'] = $base->dodge;
            if ($base->crit_rate > 0) $stats['critRate'] = $base->crit_rate;
            if ($base->crit_damage > 0) $stats['critDamage'] = $base->crit_damage;
            if ($base->lifesteal > 0) $stats['lifesteal'] = $base->lifesteal;
            if ($base->speed > 0) $stats['speed'] = $base->speed;

            return [
                'id' => $playerItem->id, // Trả về ID của PlayerItem (ID độc nhất)
                'item_id' => $base->id,
                'name' => $base->name,
                'slot' => $base->type,
                'type' => $base->type,
                'rarity' => $base->rarity,
                'stats' => $stats,
                'icon' => $base->icon,
                'is_equipped' => $playerItem->is_equipped,
                'upgrade_level' => $playerItem->upgrade_level
            ];
        })->filter();

        return response()->json([
            'status' => 'success',
            'items' => $formattedItems
        ]);
    }

    /**
     * 2. MẶC / THÁO TRANG BỊ
     */
    public function toggleEquip(Request $request)
    {
        $playerId = $request->input('player_id');
        $playerItemId = $request->input('player_item_id');
        $action = $request->input('action'); // 'equip' hoặc 'unequip'

        $targetItem = PlayerItem::with('item')->where('id', $playerItemId)->where('player_id', $playerId)->firstOrFail();

        if ($action === 'unequip') {
            $targetItem->update(['is_equipped' => 0]);
        } else {
            // Dùng Transaction để đảm bảo tính toàn vẹn dữ liệu
            DB::transaction(function () use ($playerId, $targetItem) {
                // 1. Tháo món đồ cũ cùng slot (type) xuống
                $itemType = $targetItem->item->type;
                
                $currentlyEquipped = PlayerItem::where('player_id', $playerId)
                    ->where('is_equipped', 1)
                    ->whereHas('item', function ($query) use ($itemType) {
                        $query->where('type', $itemType);
                    })->get();

                foreach ($currentlyEquipped as $equipped) {
                    $equipped->update(['is_equipped' => 0]);
                }

                // 2. Mặc món mới lên
                $targetItem->update(['is_equipped' => 1]);
            });
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * 3. LÒ RÈN: GHÉP 10 MÓN
     */
    public function forge(Request $request)
    {
        // 1. Valid dữ liệu đầu vào
        $request->validate([
            'player_id' => 'required|integer',
            'materials' => 'required|array|size:10', // Bắt buộc truyền lên đúng 10 ID vật phẩm
        ]);

        $playerId = $request->player_id;
        $materialIds = $request->materials;

        // Cấu hình tỉ lệ thành công của từng bậc nguyên liệu khi lên bậc tiếp theo
        $forgeRates = [
            'F' => 90, // Nguyên liệu F lên E: 90%
            'E' => 80, // E lên D: 80%
            'D' => 50, // D lên C: 50%
            'C' => 30, // C lên B: 30%
            'B' => 10, // B lên A: 10%
            'A' => 1,  // A lên S: 1%
        ];

        // Thứ tự các bậc để tiến hóa
        $rarityOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

        // Dùng Database Transaction để đảm bảo an toàn dữ liệu, lỗi là rollback ngay
        return DB::transaction(function () use ($playerId, $materialIds, $forgeRates, $rarityOrder) {
            
            // 2. Lấy thông tin 10 món đồ hiến tế từ DB kèm thông tin gốc
            $materials = PlayerItem::with('item')
                ->where('player_id', $playerId)
                ->whereIn('id', $materialIds)
                ->get();

            // Kiểm tra xem có đủ 10 món hợp lệ trong DB không
            if ($materials->count() !== 10) {
                return response()->json(['status' => 'error', 'message' => 'Danh sách vật phẩm hiến tế không hợp lệ hoặc không đủ 10 món!'], 400);
            }

            // Kiểm tra xem có món nào đang được mặc trên người không
            if ($materials->where('is_equipped', 1)->count() > 0) {
                return response()->json(['status' => 'error', 'message' => 'Không thể hiến tế trang bị đang mặc trên người!'], 400);
            }

            // Kiểm tra tính đồng nhất về bậc (Rarity)
            $firstRarity = $materials->first()->item->rarity;
            foreach ($materials as $mat) {
                if ($mat->item->rarity !== $firstRarity) {
                    return response()->json(['status' => 'error', 'message' => 'Tất cả vật phẩm hiến tế phải cùng bậc phẩm chất!'], 400);
                }
            }

            // Nếu là bậc S thì không thể nâng cấp được nữa
            if ($firstRarity === 'S') {
                return response()->json(['status' => 'error', 'message' => 'Vật phẩm bậc S đã đạt cấp tối đa, không thể hiến tế!'], 400);
            }

            // 3. TẦNG 1: XÁC SUẤT CHỦNG LOẠI (Dùng array_rand chọn ra 1 phôi đại diện)
            // Lấy ngẫu nhiên 1 ID từ mảng 10 ID truyền lên. 
            // Món nào xuất hiện nhiều hơn sẽ có cơ hội được chọn trúng cao hơn!
            $chosenMaterialId = $materialIds[array_rand($materialIds)];
            $chosenMaterial = $materials->firstWhere('id', $chosenMaterialId);
            $targetSlot = $chosenMaterial->item->type; // Ví dụ: 'weapon', 'chest',...

            // Xác định bậc tiếp theo
            $currentRarityIndex = array_search($firstRarity, $rarityOrder);
            $nextRarity = $rarityOrder[$currentRarityIndex + 1];

            // Tìm một món đồ ngẫu nhiên ở bậc tiếp theo có cùng Loại (Vũ khí/Giáp...) với phôi đại diện
            $rewardItem = Item::where('type', $targetSlot)
                ->where('rarity', $nextRarity)
                ->inRandomOrder()
                ->first();

            // Phòng trường hợp DB chưa có món nào thuộc loại đó ở bậc tiếp theo, lấy đại 1 món bậc tiếp theo
            if (!$rewardItem) {
                $rewardItem = Item::where('rarity', $nextRarity)->inRandomOrder()->first();
            }

            // 4. TẦNG 2: XÚC XẮC THÀNH CÔNG / THẤT BẠI
            $successRate = $forgeRates[$firstRarity] ?? 0;
            $diceRoll = rand(1, 100);

            if ($diceRoll <= $successRate) {
                // === KỊCH BẢN THÀNH CÔNG ===
                // Xóa sạch cả 10 món nguyên liệu
                PlayerItem::whereIn('id', $materialIds)->delete();

                // Tạo món đồ mới bậc cao hơn cho người chơi
                $newItem = PlayerItem::create([
                    'player_id' => $playerId,
                    'item_id' => $rewardItem->id,
                    'is_equipped' => 0
                ]);

                return response()->json([
                    'status' => 'success',
                    'result' => 'success',
                    'message' => 'Rèn trang bị thành công!',
                    'item' => [
                        'id' => $newItem->id,
                        'name' => $rewardItem->name,
                        'rarity' => $rewardItem->rarity,
                        'icon' => $rewardItem->icon
                    ]
                ]);
            } else {
                // === KỊCH BẢN THẤT BẠI ===
                // Dùng array_rand chọn ra 1 ID duy nhất để GIỮ LẠI (Cứu vớt theo tỉ lệ đóng góp)
                $survivedPlayerItemId = $materialIds[array_rand($materialIds)];
                $survivedItem = $materials->firstWhere('id', $survivedPlayerItemId);

                // Loại bỏ ID giữ lại ra khỏi danh sách xóa, 9 món còn lại sẽ bị hủy diệt
                $itemsToDelete = array_diff($materialIds, [$survivedPlayerItemId]);
                PlayerItem::whereIn('id', $itemsToDelete)->delete();

                return response()->json([
                    'status' => 'success', // Request xử lý thành công
                    'result' => 'fail',    // Kết quả đập đồ thất bại
                    'message' => 'Lò rèn phát nổ! Trang bị hiến tế đã bị phá hủy.',
                    'survived_item' => [
                        'id' => $survivedItem->id,
                        'name' => $survivedItem->item->name,
                        'rarity' => $survivedItem->item->rarity,
                        'icon' => $survivedItem->item->icon
                    ]
                ]);
            }
        });
    }

    public function saveLoot(Request $request)
    {
        // 1. Kiểm tra dữ liệu gửi lên
        $request->validate([
            'player_id' => 'required|integer',
            'rarities'  => 'required|array', // Mảng chứa các bậc phẩm chất, VD: ['A', 'B', 'C']
        ]);

        $playerId = $request->player_id;
        $rarities = $request->rarities;
        $savedItemsCount = 0;
        $savedItemsList = [];

        // Dùng Transaction để đảm bảo an toàn, nếu lỗi thì hủy toàn bộ
        DB::transaction(function () use ($playerId, $rarities, &$savedItemsCount, &$savedItemsList) {
            foreach ($rarities as $rarity) {
                // 2. Với mỗi Bậc (VD: 'A'), tìm ngẫu nhiên 1 món đồ trong bảng `items` có bậc đó
                $randomItem = Item::where('rarity', $rarity)
                                  ->inRandomOrder()
                                  ->first();

                // 3. Nếu tìm thấy, nhét nó vào kho đồ của người chơi
                if ($randomItem) {
                    PlayerItem::create([
                        'player_id'   => $playerId,
                        'item_id'     => $randomItem->id,
                        'is_equipped' => 0 // Đồ mới nhặt mặc định nằm trong balo
                    ]);
                    $savedItemsCount++;

                    $savedItemsList[] = [
                        'name' => $randomItem->name,
                        'rarity' => $randomItem->rarity,
                        'icon' => $randomItem->icon
                    ];
                }
            }
        });

        // 4. Trả về kết quả cho Frontend
        return response()->json([
            'status'  => 'success',
            'message' => "Đã chuyển thành công {$savedItemsCount} chiến lợi phẩm vào Kho đồ!",
            'items'   => $savedItemsList
        ]);
    }

    public function upgradeItem(Request $request)
    {
        $playerId = $request->player_id;
        $playerItemId = $request->player_item_id;
        $useNormalCharm = $request->use_normal_charm;
        $useHolyCharm = $request->use_holy_charm;

        $UPGRADE_RATES = [100, 95, 90, 80, 60, 40, 30, 20, 10, 5];
        $UPGRADE_COSTS = [
            ['gold' => 1000, 'blood' => 1],     // Lên +1
            ['gold' => 2500, 'blood' => 2],     // Lên +2
            ['gold' => 5000, 'blood' => 3],     // Lên +3
            ['gold' => 10000, 'blood' => 5],    // Lên +4
            ['gold' => 20000, 'blood' => 8],    // Lên +5 (Rủi ro -1)
            ['gold' => 35000, 'blood' => 12],   // Lên +6 (Rủi ro -1)
            ['gold' => 55000, 'blood' => 15],   // Lên +7 (Rủi ro -1)
            ['gold' => 100000, 'blood' => 20],  // Lên +8 (Tụt về 0)
            ['gold' => 250000, 'blood' => 30],  // Lên +9 (Tụt về 0)
            ['gold' => 500000, 'blood' => 50]   // Lên +10 (Tụt về 0)
        ];

        try {
            // Khởi tạo Transaction (Bảo vệ dữ liệu)
            DB::beginTransaction();

            // 1. Kiểm tra Người chơi
            $player = DB::table('players')->where('id', $playerId)->first();
            if (!$player) return response()->json(['status' => 'error', 'message' => 'Người chơi không tồn tại!']);

            // 2. Kiểm tra Trang bị
            $playerItem = PlayerItem::with('item')->where('id', $playerItemId)->where('player_id', $playerId)->first();
            if (!$playerItem || !$playerItem->item || $playerItem->item->rarity !== 'S') {
                 return response()->json(['status' => 'error', 'message' => 'Trang bị không hợp lệ hoặc không phải Bậc S!']);
            }

            $currentLevel = $playerItem->upgrade_level ?? 0;
            if ($currentLevel >= 10) {
                 return response()->json(['status' => 'error', 'message' => 'Trang bị đã đạt Cấp Tối Thượng (+10)!']);
            }

            $cost = $UPGRADE_COSTS[$currentLevel];
            
            // 3. Kiểm tra Vàng
            if ($player->gold < $cost['gold']) {
                 return response()->json(['status' => 'error', 'message' => 'Không đủ Vàng để cường hóa!']);
            }

            // 4. Kiểm tra Huyết Thạch
            $bloodstoneIds = PlayerItem::where('player_id', $playerId)->where('item_id', 214)->limit($cost['blood'])->pluck('id');
            if (count($bloodstoneIds) < $cost['blood']) {
                return response()->json(['status' => 'error', 'message' => 'Không đủ Huyết Thạch!']);
            }

            // 5. Kiểm tra logic Bùa
            if ($useNormalCharm && $currentLevel >= 7) return response()->json(['status' => 'error', 'message' => 'Hộ Thể Phù chỉ dùng cho trang bị dưới +7!']);
            if ($useHolyCharm && $currentLevel < 7) return response()->json(['status' => 'error', 'message' => 'Thánh Hộ Phù chỉ dùng cho trang bị từ +7 trở lên!']);

            $normalCharmId = null;
            if ($useNormalCharm) {
                $normalCharmId = PlayerItem::where('player_id', $playerId)->where('item_id', 215)->value('id');
                if (!$normalCharmId) return response()->json(['status' => 'error', 'message' => 'Không có Hộ Thể Phù trong túi!']);
            }

            $holyCharmId = null;
            if ($useHolyCharm) {
                $holyCharmId = PlayerItem::where('player_id', $playerId)->where('item_id', 216)->value('id');
                if (!$holyCharmId) return response()->json(['status' => 'error', 'message' => 'Không có Thánh Hộ Phù trong túi!']);
            }

            // ==========================================
            // BƯỚC THU PHÍ (TRỪ NGUYÊN LIỆU TRƯỚC KHI QUAY SỐ)
            // ==========================================
            DB::table('players')->where('id', $playerId)->decrement('gold', $cost['gold']); // Trừ vàng
            PlayerItem::whereIn('id', $bloodstoneIds)->delete(); // Trừ Huyết Thạch
            
            if ($normalCharmId) PlayerItem::where('id', $normalCharmId)->delete(); // Trừ Bùa
            if ($holyCharmId) PlayerItem::where('id', $holyCharmId)->delete(); // Trừ Thánh bùa

            // ==========================================
            // VẬN MỆNH CƯỜNG HÓA (RNG)
            // ==========================================
            $rate = $UPGRADE_RATES[$currentLevel];
            $rand = rand(1, 100);
            $success = $rand <= $rate;

            $message = "";
            $statusStr = "success";

            if ($success) {
                $playerItem->upgrade_level = $currentLevel + 1;
                $playerItem->save();
                $message = "Tuyệt vời! Cường hóa THÀNH CÔNG lên +" . ($currentLevel + 1) . "!";
            } else {
                $statusStr = "failed"; 
                if ($useNormalCharm || $useHolyCharm) {
                    $message = "Cường hóa thất bại! Nhờ có Bùa bảo hộ, trang bị không bị rớt cấp.";
                } else {
                    if ($currentLevel >= 7) {
                        $playerItem->upgrade_level = 0;
                        $playerItem->save();
                        $message = "Thảm họa! Cường hóa XỊT. Trang bị đã TỤT THẲNG VỀ +0!";
                    } elseif ($currentLevel >= 5) {
                        $playerItem->upgrade_level = $currentLevel - 1;
                        $playerItem->save();
                        $message = "Cường hóa thất bại! Trang bị đã bị TỤT 1 CẤP xuống +" . ($currentLevel - 1) . "!";
                    } else {
                        $message = "Cường hóa thất bại! May mắn đây là vùng an toàn nên không rớt cấp.";
                    }
                }
            }

            // Lưu toàn bộ thay đổi vào Database
            DB::commit();

            return response()->json([
                'status' => $statusStr,
                'message' => $message
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Lỗi máy chủ: ' . $e->getMessage()]);
        }
    }

    /**
     * 4. DUNG HỢP TINH THẠCH (ĐÁ RUNE)
     */
    public function mergeRunes(Request $request)
    {
        $request->validate([
            'player_id' => 'required|integer',
            'materials' => 'required|array|size:3', // Ép buộc phải đúng 3 viên
        ]);

        $playerId = $request->player_id;
        $materialIds = $request->materials;

        return DB::transaction(function () use ($playerId, $materialIds) {
            $materials = PlayerItem::with('item')
                ->where('player_id', $playerId)
                ->whereIn('id', $materialIds)
                ->get();

            if ($materials->count() !== 3) {
                return response()->json(['status' => 'error', 'message' => 'Vật phẩm không hợp lệ!']);
            }

            // Lấy viên đầu tiên làm chuẩn để kiểm tra
            $firstRune = $materials->first();

            // Kiểm tra xem có đúng là Rune không
            if ($firstRune->item->type !== 'rune') {
                return response()->json(['status' => 'error', 'message' => 'Chỉ có thể dung hợp Tinh Thạch!']);
            }

            // Kiểm tra tính đồng nhất (Cùng ID gốc - tức là cùng màu, và Cùng Cấp độ)
            foreach ($materials as $rune) {
                if ($rune->item_id !== $firstRune->item_id) {
                    return response()->json(['status' => 'error', 'message' => '3 viên Tinh Thạch phải có CÙNG LOẠI (Cùng màu)!']);
                }
                if ($rune->upgrade_level !== $firstRune->upgrade_level) {
                    return response()->json(['status' => 'error', 'message' => '3 viên Tinh Thạch phải có CÙNG CẤP ĐỘ!']);
                }
            }

            // Xóa 3 viên cũ
            PlayerItem::whereIn('id', $materialIds)->delete();

            // Tạo 1 viên mới với Cấp độ + 1
            $newLevel = $firstRune->upgrade_level + 1;
            $newRune = PlayerItem::create([
                'player_id' => $playerId,
                'item_id' => $firstRune->item_id,
                'is_equipped' => 0,
                'upgrade_level' => $newLevel
            ]);

            return response()->json([
                'status' => 'success',
                'result' => 'success',
                'message' => 'Dung hợp Tinh Thạch thành công lên Lv.' . $newLevel . '!',
                'item' => [
                    'id' => $newRune->id,
                    'name' => $firstRune->item->name,
                    'rarity' => $firstRune->item->rarity,
                    'icon' => $firstRune->item->icon,
                    'upgrade_level' => $newLevel
                ]
            ]);
        });
    }

    /**
     * 5. PHÂN GIẢI TRANG BỊ RÁC (LẤY BỤI TINH TÚ)
     */
    public function dismantleItems(Request $request)
    {
        $request->validate([
            'player_id' => 'required|integer',
            'materials' => 'required|array|min:1|max:10', // Phân giải từ 1 đến 10 món cùng lúc
        ]);

        $playerId = $request->player_id;
        $materialIds = $request->materials;

        return DB::transaction(function () use ($playerId, $materialIds) {
            $items = PlayerItem::with('item')
                ->where('player_id', $playerId)
                ->whereIn('id', $materialIds)
                ->get();

            $stardustCount = 0; // ID 220 (Bụi Tinh Tú)
            $galaxyCount = 0;   // ID 221 (Tinh Chất Ngân Hà)

            foreach ($items as $item) {
                // Chặn phân giải các đồ không phải trang bị (Mảnh trứng, Thức ăn, Đá Rune...)
                if (in_array($item->item->type, ['material', 'food', 'rune'])) {
                    return response()->json(['status' => 'error', 'message' => 'Không thể phân giải Nguyên liệu, Thức ăn hoặc Tinh Thạch!']);
                }
                if ($item->is_equipped == 1) {
                    return response()->json(['status' => 'error', 'message' => 'Không thể phân giải trang bị đang mặc trên người!']);
                }

                // Quy đổi độ hiếm ra số lượng Bụi
                $rarity = $item->item->rarity;
                if ($rarity === 'F') $stardustCount += 1;
                elseif ($rarity === 'E') $stardustCount += 2;
                elseif ($rarity === 'D') $stardustCount += 5;
                elseif ($rarity === 'C') $stardustCount += 15;
                elseif ($rarity === 'B') $stardustCount += 30;
                elseif ($rarity === 'A') $galaxyCount += 3;
                elseif ($rarity === 'S') $galaxyCount += 10;
            }

            // Xóa các trang bị rác
            PlayerItem::whereIn('id', $materialIds)->delete();

            // Insert Bụi Tinh Tú vào kho
            $insertData = [];
            $now = \Carbon\Carbon::now();
            
            for ($i = 0; $i < $stardustCount; $i++) {
                $insertData[] = ['player_id' => $playerId, 'item_id' => 220, 'is_equipped' => 0, 'upgrade_level' => 0];
            }
            for ($i = 0; $i < $galaxyCount; $i++) {
                $insertData[] = ['player_id' => $playerId, 'item_id' => 221, 'is_equipped' => 0, 'upgrade_level' => 0];
            }

            if (!empty($insertData)) {
                PlayerItem::insert($insertData);
            }

            return response()->json([
                'status' => 'success',
                'result' => 'dismantle',
                'message' => "Phân giải thành công! Thu được: {$stardustCount} Bụi Tinh Tú, {$galaxyCount} Tinh Chất Ngân Hà.",
                'stardust' => $stardustCount,
                'galaxy' => $galaxyCount
            ]);
        });
    }
}
