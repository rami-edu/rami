extends Node

signal player_connected(id)
signal player_disconnected(id)
signal server_disconnected

var host_address = "127.0.0.1"
var host_port = 8080
var max_players = 30 # Shard limit

var peer: ENetMultiplayerPeer

func _ready():
	multiplayer.peer_connected.connect(_on_player_connected)
	multiplayer.peer_disconnected.connect(_on_player_disconnected)
	multiplayer.server_disconnected.connect(_on_server_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_ok)

func host_shard():
	peer = ENetMultiplayerPeer.new()
	var error = peer.create_server(host_port, max_players)
	if error != OK:
		print("Error hosting shard: ", error)
		return
	multiplayer.multiplayer_peer = peer
	print("Hosted Shard on port ", host_port)
	player_connected.emit(1) # Host is id 1

func join_shard():
	peer = ENetMultiplayerPeer.new()
	var error = peer.create_client(host_address, host_port)
	if error != OK:
		print("Error joining shard: ", error)
		return
	multiplayer.multiplayer_peer = peer
	print("Joining Shard at ", host_address, ":", host_port)

func _on_player_connected(id):
	print("Player connected: ", id)
	player_connected.emit(id)

func _on_player_disconnected(id):
	print("Player disconnected: ", id)
	player_disconnected.emit(id)

func _on_connected_ok():
	print("Successfully connected to server")
	player_connected.emit(multiplayer.get_unique_id())

func _on_server_disconnected():
	print("Disconnected from server")
	server_disconnected.emit()
