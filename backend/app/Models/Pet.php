<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    use HasFactory;

    protected $table = 'pets';
    // Tắt tính năng tự động cập nhật updated_at vì bảng này chỉ chứa dữ liệu tĩnh
    public $timestamps = false; 
    
    protected $guarded = []; // Cho phép lấy tất cả các cột
}