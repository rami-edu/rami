extends Node2D

var world_data_path = "res://world.json"

func _ready():
	load_environment(world_data_path)

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
