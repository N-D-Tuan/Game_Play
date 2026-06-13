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
        $playerId = $request->input('player_id');
        $materialIds = $request->input('material_ids'); // Mảng 10 ID của PlayerItem

        if (count($materialIds) !== 10) {
            return response()->json(['status' => 'error', 'message' => 'Yêu cầu đúng 10 vật phẩm!'], 400);
        }

        // Lấy 10 món đồ từ DB
        $materials = PlayerItem::with('item')
            ->whereIn('id', $materialIds)
            ->where('player_id', $playerId)
            ->where('is_equipped', 0) // Không cho lấy đồ đang mặc đem đốt
            ->get();

        if ($materials->count() !== 10) {
            return response()->json(['status' => 'error', 'message' => 'Vật phẩm không hợp lệ hoặc đang được mặc!'], 400);
        }

        // Kiểm tra tính đồng nhất (Phải cùng Item ID gốc)
        $firstItemId = $materials->first()->item_id;
        foreach ($materials as $mat) {
            if ($mat->item_id !== $firstItemId) {
                return response()->json(['status' => 'error', 'message' => 'Nguyên liệu không đồng nhất!'], 400);
            }
        }

        // --- BẮT ĐẦU LOGIC GACHA / NÂNG CẤP ---
        $baseItem = $materials->first()->item;
        $currentRarity = $baseItem->rarity;

        // Định nghĩa ID của vật phẩm bậc kế tiếp (Bạn cần cấu hình cái này tùy vào DB của bạn)
        // Ví dụ: Bậc F ID là 1, Bậc E tương ứng ID là 2...
        $nextTierMap = [
            'F' => ['next_id' => $baseItem->id + 1, 'rate' => 100], // 100% lên E
            'E' => ['next_id' => $baseItem->id + 1, 'rate' => 80],  // 80% lên D
            'D' => ['next_id' => $baseItem->id + 1, 'rate' => 50],  // 50% lên C
            'C' => ['next_id' => $baseItem->id + 1, 'rate' => 30],  // 30% lên B
            'B' => ['next_id' => $baseItem->id + 1, 'rate' => 15],  // 15% lên A
            'A' => ['next_id' => $baseItem->id + 1, 'rate' => 5],   // 5% lên S
            'S' => null // Bậc S không thể ghép nữa
        ];

        $upgradeRule = $nextTierMap[$currentRarity];

        if (!$upgradeRule) {
            return response()->json(['status' => 'error', 'message' => 'Trang bị này đã đạt mức tối đa!'], 400);
        }

        // Quay xổ số
        $roll = rand(1, 100);
        $isSuccess = $roll <= $upgradeRule['rate'];

        DB::beginTransaction();
        try {
            if ($isSuccess) {
                // Xóa 10 phôi cũ
                PlayerItem::whereIn('id', $materialIds)->delete();
                
                // Tạo đồ mới
                $newItem = PlayerItem::create([
                    'player_id' => $playerId,
                    'item_id' => $upgradeRule['next_id'],
                    'is_equipped' => 0
                ]);

                // Lấy thông tin đồ mới trả về Frontend
                $newItem->load('item');
                DB::commit();

                return response()->json([
                    'status' => 'success', 
                    'message' => 'Ghép thành công!', 
                    'new_item_id' => $newItem->item_id 
                ]);
            } else {
                // Thất bại: Xóa 9 phôi, trả lại 1
                $idsToDelete = array_slice($materialIds, 0, 9);
                PlayerItem::whereIn('id', $idsToDelete)->delete();
                DB::commit();

                return response()->json([
                    'status' => 'failed', 
                    'message' => 'Ghép thất bại! Mất 9 nguyên liệu.'
                ]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Lỗi hệ thống'], 500);
        }
    }
}
