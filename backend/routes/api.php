<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\PlayerController;

Route::get('/players/{id}', [PlayerController::class, 'show']);

// Shop
Route::post('/shop/sell', [PlayerController::class, 'sellItem']);
Route::post('/shop/get', [PlayerController::class, 'getShopData']);
Route::post('/shop/refresh', [PlayerController::class, 'refreshShop']);
Route::post('/shop/toggle-lock', [PlayerController::class, 'toggleLockItem']);
Route::post('/shop/buy', [PlayerController::class, 'buyItem']);

// Rune
Route::post('/astrolabe/upgrade-core', [PlayerController::class, 'upgradeCore']);
Route::post('/astrolabe/equip', [PlayerController::class, 'equipRune']);
Route::post('/astrolabe/unequip', [PlayerController::class, 'unequipRune']);

// Talents
Route::prefix('talents')->group(function () {
    Route::get('/{playerId}', [PlayerController::class, 'getTalents']);
    Route::post('/unlock', [PlayerController::class, 'unlockTalent']);
    Route::post('/equip', [PlayerController::class, 'equipSkills']);
    Route::post('/roll-awakening', [PlayerController::class, 'rollAwakening']);
    Route::post('/save-awakening-locks', [PlayerController::class, 'saveAwakeningLocks']);
});

// Inventory
Route::get('/inventory/{playerId}', [InventoryController::class, 'index']);
Route::post('/equipment/toggle', [InventoryController::class, 'toggleEquip']);
Route::post('/campaign/save-loot', [InventoryController::class, 'saveLoot']);
Route::post('/forge/merge', [InventoryController::class, 'forge']);
Route::post('/forge/upgrade', [InventoryController::class, 'upgradeItem']);
Route::post('/forge/merge-runes', [InventoryController::class, 'mergeRunes']);
Route::post('/forge/dismantle', [InventoryController::class, 'dismantleItems']);

// Pet
Route::prefix('pets')->group(function () {
    Route::get('/{playerId}', [PetController::class, 'getPlayerPets']);
    Route::post('/hatch', [PetController::class, 'hatchEgg']);
    Route::post('/feed', [PetController::class, 'feedPet']);
    Route::post('/toggle-equip', [PetController::class, 'toggleEquipPet']);
    Route::post('/release', [PetController::class, 'releasePet']);
    Route::post('/merge-pieces', [PetController::class, 'mergeEggPieces']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
