<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PetController;

Route::get('/inventory/{playerId}', [InventoryController::class, 'index']);
Route::post('/equipment/toggle', [InventoryController::class, 'toggleEquip']);
Route::post('/forge/merge', [InventoryController::class, 'forge']);
Route::post('/campaign/save-loot', [InventoryController::class, 'saveLoot']);

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
