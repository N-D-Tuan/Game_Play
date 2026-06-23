<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Player extends Model
{
    // Xác định tên bảng trong cơ sở dữ liệu
    protected $table = 'players';

    // Cho phép Laravel tự động điền dữ liệu vào các cột này
    protected $fillable = [
        'username',
        'gold',
        'talent_points',
        'unlocked_nodes',
        'equipped_skills',
        'awakening_stats'
    ];

    protected $casts = [
        'unlocked_nodes' => 'array',
        'equipped_skills' => 'array',
    ];

    // Vì bảng players của bạn chỉ có cột created_at chứ không có updated_at
    // Nên chúng ta cần báo cho Laravel biết để tránh lỗi thiếu cột
    const UPDATED_AT = null;
}