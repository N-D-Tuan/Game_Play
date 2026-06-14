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

            return [
                'id' => $playerItem->id, // Trả về ID của PlayerItem (ID độc nhất)
                'item_id' => $base->id,
                'name' => $base->name,
                'slot' => $base->type,
                'rarity' => $base->rarity,
                'stats' => $stats,
                'icon' => $base->icon,
                'is_equipped' => $playerItem->is_equipped
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
            'A' => 0.2,  // A lên S: 0.2%
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
}
