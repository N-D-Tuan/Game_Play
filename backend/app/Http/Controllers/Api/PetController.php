<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PlayerPet;
use App\Models\Pet;
use App\Models\PlayerItem;
use Illuminate\Support\Facades\DB;

class PetController extends Controller
{
    public function getPlayerPets($playerId)
    {
        $pets = PlayerPet::with('pet')->where('player_id', $playerId)->get();
        return response()->json(['status' => 'success', 'pets' => $pets]);
    }
    
    // ==========================================
    // 1. API: MỞ TRỨNG THÚ CƯNG (GACHA)
    // ==========================================
    public function hatchEgg(Request $request)
    {
        $playerId = $request->player_id;

        return DB::transaction(function () use ($playerId) {
            // 1. Tìm quả "Trứng Thú Cưng" (ID: 213) trong kho
            $egg = PlayerItem::where('player_id', $playerId)->where('item_id', 213)->first();

            if (!$egg) {
                return response()->json(['status' => 'error', 'message' => 'Bạn không có Trứng Thú Cưng!'], 400);
            }

            // 2. Tiêu thụ 1 quả trứng
            $egg->delete();

            // 3. Cơ chế Quay Gacha (Tỉ lệ ra)
            $roll = mt_rand(1, 1000) / 10; // Quay số từ 0.1 đến 100.0

            if ($roll <= 5.0) { // 5% đầu tiên (2.5% Phượng Hoàng, 2.5% Rồng Lửa)
                $petCode = ($roll <= 2.5) ? 'phuong_hoang_bang' : 'rong_lua';
            } else if ($roll <= 40.0) { // 35% tiếp theo (Ngọc Long)
                $petCode = 'ngoc_long';
            } else { // 60% còn lại (Kiến Xanh, Kiến Đỏ)
                $petCode = ($roll <= 70.0) ? 'kien_xanh' : 'kien_do';
            }

            // Lấy ID gốc của con Pet vừa quay trúng từ bảng `pets`
            $petMaster = Pet::where('pet_code', $petCode)->first();

            // 4. Tạo Pet mới cho người chơi bằng pet_id
            $newPet = PlayerPet::create([
                'player_id' => $playerId,
                'pet_id'    => $petMaster->id, // ĐÃ SỬA TỪ pet_code THÀNH pet_id
                'level'     => 1,
                'current_exp' => 0,
                'is_equipped' => 0
            ]);

            // Kéo theo thông tin gốc để Frontend hiển thị luôn ảnh và chỉ số
            $newPet->load('pet');

            return response()->json([
                'status' => 'success',
                'message' => 'Ấp trứng thành công!',
                'pet' => $newPet
            ]);
        });
    }

    // ==========================================
    // 2. API: CHO PET ĂN TRANG BỊ ĐỂ TĂNG EXP
    // ==========================================
    public function feedPet(Request $request)
    {
        $playerId = $request->player_id;
        $petId = $request->pet_id;
        $materialIds = $request->material_ids; // Mảng các ID trang bị trong Balo (player_items.id)

        // Bảng quy đổi EXP theo phẩm chất rác
        $expRates = [
            'F' => 10, 'E' => 30, 'D' => 100, 
            'C' => 500, 'B' => 2000, 'A' => 10000, 'S' => 30000
        ];

        return DB::transaction(function () use ($playerId, $petId, $materialIds, $expRates) {
            $pet = PlayerPet::where('id', $petId)->where('player_id', $playerId)->firstOrFail();
            
            if ($pet->level >= 100) {
                return response()->json(['status' => 'error', 'message' => 'Thú cưng đã đạt cấp độ tối đa!'], 400);
            }

            // Lấy các trang bị được chọn
            $materials = PlayerItem::with('item')
                ->where('player_id', $playerId)
                ->whereIn('id', $materialIds)
                ->get();

            if ($materials->isEmpty()) {
                return response()->json(['status' => 'error', 'message' => 'Không tìm thấy trang bị nguyên liệu!'], 400);
            }

            // Tính tổng EXP nhận được
            $totalExpGained = 0;
            foreach ($materials as $mat) {
                // Không cho ăn trang bị đang mặc hoặc Nguyên liệu (Mảnh trứng)
                if ($mat->is_equipped == 1 || $mat->item->type === 'material') {
                    return response()->json(['status' => 'error', 'message' => 'Không thể cho ăn trang bị đang mặc hoặc nguyên liệu!'], 400);
                }
                $totalExpGained += $expRates[$mat->item->rarity] ?? 0;
            }

            // Xóa trang bị rác
            PlayerItem::whereIn('id', $materialIds)->delete();

            // Tính toán Lên cấp (Công thức: Cấp hiện tại * 100)
            $currentLevel = $pet->level;
            $currentExp = $pet->current_exp + $totalExpGained;

            while ($currentLevel < 100 && $currentExp >= ($currentLevel * 100)) {
                $currentExp -= ($currentLevel * 100);
                $currentLevel++;
            }

            // Nếu lố cấp 100 thì xóa EXP dư
            if ($currentLevel >= 100) {
                $currentLevel = 100;
                $currentExp = 0;
            }

            // Cập nhật Database
            $pet->update([
                'level' => $currentLevel,
                'current_exp' => $currentExp
            ]);

            // Trả về thông tin gốc để Frontend tính toán lại chỉ số vừa được tăng
            $pet->load('pet');

            return response()->json([
                'status' => 'success',
                'message' => 'Cho ăn thành công!',
                'exp_gained' => $totalExpGained,
                'pet' => $pet
            ]);
        });
    }

    // ==========================================
    // 3. API: XUẤT CHIẾN / THU HỒI PET
    // ==========================================
    public function toggleEquipPet(Request $request)
    {
        $playerId = $request->player_id;
        $petId = $request->pet_id;
        $action = $request->action; // 'equip' hoặc 'unequip'

        $targetPet = PlayerPet::where('id', $petId)->where('player_id', $playerId)->firstOrFail();

        if ($action === 'unequip') {
            $targetPet->update(['is_equipped' => 0]);
        } else {
            DB::transaction(function () use ($playerId, $targetPet) {
                // Thu hồi tất cả pet khác đang xuất chiến
                PlayerPet::where('player_id', $playerId)->update(['is_equipped' => 0]);
                // Xuất chiến pet mới
                $targetPet->update(['is_equipped' => 1]);
            });
        }

        return response()->json(['status' => 'success']);
    }

    // ==========================================
    // 4. API: THẢ PET (XÓA BỎ)
    // ==========================================
    public function releasePet(Request $request)
    {
        $playerId = $request->player_id;
        $petId = $request->pet_id;

        $pet = PlayerPet::where('id', $petId)->where('player_id', $playerId)->firstOrFail();
        $pet->delete();

        return response()->json(['status' => 'success', 'message' => 'Đã phóng sinh thú cưng.']);
    }
}