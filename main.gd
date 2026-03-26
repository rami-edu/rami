extends Node2D

var world_data_path = "res://world.json"
var player_scene = preload("res://player.tscn")

func _ready():
	load_environment(world_data_path)

	NetworkManager.player_connected.connect(_spawn_player)
	NetworkManager.player_disconnected.connect(_remove_player)

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
	var player = player_scene.instantiate()
	player.name = str(id)
	player.position = Vector2(640, 360) # Central hub spawn point
	$Players.add_child(player)

	if id == multiplayer.get_unique_id() and id != 1:
		rpc_id(1, "request_initial_state")

@rpc("any_peer")
func request_initial_state():
	if multiplayer.is_server():
		var caller_id = multiplayer.get_remote_sender_id()
		for player_node in $Players.get_children():
			var p_id = str(player_node.name).to_int()
			if p_id != caller_id:
				rpc_id(caller_id, "spawn_existing_player", p_id, player_node.position, player_node.get_node("NameLabel").text)

@rpc("authority")
func spawn_existing_player(id, pos, u_name):
	if $Players.has_node(str(id)): return
	var player = player_scene.instantiate()
	player.name = str(id)
	player.position = pos
	$Players.add_child(player)
	player.get_node("NameLabel").text = u_name

func _remove_player(id):
	var player_node = $Players.get_node_or_null(str(id))
	if player_node:
		player_node.queue_free()

func load_environment(file_path: String):
	if not FileAccess.file_exists(file_path):
		print("World data file not found at: ", file_path)
		return

	var file = FileAccess.open(file_path, FileAccess.READ)
	var content = file.get_as_text()
	var json = JSON.new()
	var error = json.parse(content)

	if error != OK:
		print("JSON Parse Error: ", json.get_error_message(), " in ", content, " at line ", json.get_error_line())
		return

	var data = json.get_data()

	if data.has("nodes"):
		for node_data in data["nodes"]:
			instantiate_node(node_data)

	if data.has("portals"):
		for portal_data in data["portals"]:
			instantiate_portal(portal_data)

func instantiate_node(data: Dictionary):
	var node = Sprite2D.new()
	# Just a placeholder visual for now
	# A real implementation would load a specific texture based on data["type"]
	node.name = data.get("id", "UnknownNode")
	node.position = Vector2(data.get("x", 0), data.get("y", 0))

	var label = Label.new()
	label.text = data.get("type", "Node")
	label.position = Vector2(-20, -20)
	node.add_child(label)

	$Environment.add_child(node)
	print("Instantiated node: ", node.name, " at ", node.position)

func instantiate_portal(data: Dictionary):
	var portal = Sprite2D.new()
	# Just a placeholder visual for now
	portal.name = data.get("id", "UnknownPortal")
	portal.position = Vector2(data.get("x", 0), data.get("y", 0))

	# Setting color using modulate to differentiate from normal nodes
	portal.modulate = Color(0.2, 0.8, 1.0)

	var label = Label.new()
	label.text = data.get("minigame", "UnknownMinigame")
	label.position = Vector2(-30, -30)
	portal.add_child(label)

	$Environment.add_child(portal)
	print("Instantiated portal: ", portal.name, " for minigame ", data.get("minigame"), " at ", portal.position)
