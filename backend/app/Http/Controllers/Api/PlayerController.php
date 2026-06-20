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
}