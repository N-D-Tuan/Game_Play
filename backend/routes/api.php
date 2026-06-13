<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InventoryController;

Route::get('/inventory/{playerId}', [InventoryController::class, 'index']);
Route::post('/equipment/toggle', [InventoryController::class, 'toggleEquip']);
Route::post('/forge/merge', [InventoryController::class, 'forge']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
