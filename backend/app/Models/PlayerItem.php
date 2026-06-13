<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerItem extends Model
{
    protected $table = 'player_items';
    public $timestamps = false;

    protected $fillable = [
        'player_id', 'item_id', 'is_equipped', 'obtained_at'
    ];

    // Tạo relationship N-1 tới bảng Items
    public function item()
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}
