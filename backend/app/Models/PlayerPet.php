<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlayerPet extends Model
{
    use HasFactory;

    protected $table = 'player_pets';
    protected $fillable = ['player_id', 'pet_id', 'level', 'current_exp', 'is_equipped'];

    public function pet()
    {
        return $this->belongsTo(Pet::class, 'pet_id', 'id');
    }
}