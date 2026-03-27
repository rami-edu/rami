extends Node2D

var player_scene = preload("res://player.tscn")

func _ready():
	NetworkManager.player_connected.connect(_spawn_player)
	NetworkManager.player_disconnected.connect(_remove_player)

	if "--server" in OS.get_cmdline_args():
		print("Starting in dedicated server mode...")
		NetworkManager.host_shard()
	else:
		# For local testing convenience
		_setup_network_ui()

func _setup_network_ui():
	var host_btn = Button.new()
	host_btn.text = "Host"
	host_btn.position = Vector2(10, 10)
	host_btn.pressed.connect(NetworkManager.host_shard)
	$CanvasLayer.add_child(host_btn)

	var join_btn = Button.new()
	join_btn.text = "Join"
	join_btn.position = Vector2(60, 10)
	join_btn.pressed.connect(NetworkManager.join_shard)
	$CanvasLayer.add_child(join_btn)

func _spawn_player(id):
	if not multiplayer.is_server(): return
	var player = player_scene.instantiate()
	player.name = str(id)
	player.position = Vector2(640, 360) # Central hub spawn point
	$Players.add_child(player, true) # Force readable name for spawner

func _remove_player(id):
	if not multiplayer.is_server(): return
	var player_node = $Players.get_node_or_null(str(id))
	if player_node:
		player_node.queue_free()
