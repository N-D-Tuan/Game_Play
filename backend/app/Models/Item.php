<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table = 'items';

    public $timestamps = false; 

    protected $fillable = [
        'name', 'type', 'rarity', 'hp', 'hp_regen', 'atk', 'dodge', 'icon'
    ];
}
