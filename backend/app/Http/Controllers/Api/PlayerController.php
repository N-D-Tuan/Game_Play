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
            'equipped_skills' => $player->equipped_skills
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
}