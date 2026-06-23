<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\PlayerController;

Route::get('/players/{id}', [PlayerController::class, 'show']);

Route::prefix('talents')->group(function () {
    Route::get('/{playerId}', [PlayerController::class, 'getTalents']);
    Route::post('/unlock', [PlayerController::class, 'unlockTalent']);
    Route::post('/equip', [PlayerController::class, 'equipSkills']);
    Route::post('/roll-awakening', [PlayerController::class, 'rollAwakening']);
    Route::post('/save-awakening-locks', [PlayerController::class, 'saveAwakeningLocks']);
});

Route::get('/inventory/{playerId}', [InventoryController::class, 'index']);
Route::post('/equipment/toggle', [InventoryController::class, 'toggleEquip']);
Route::post('/forge/merge', [InventoryController::class, 'forge']);
Route::post('/campaign/save-loot', [InventoryController::class, 'saveLoot']);
Route::post('/forge/upgrade', [InventoryController::class, 'upgradeItem']);

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
