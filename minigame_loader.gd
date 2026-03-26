extends Node

signal minigame_loaded(minigame_id)
signal load_progress(progress)

var cache_dir = "user://minigames/"

func _ready():
	DirAccess.make_dir_absolute(cache_dir)

func load_minigame(minigame_id: String, pck_url: String):
	print("Checking cache for minigame: ", minigame_id)
	var local_path = cache_dir + minigame_id + ".pck"

	if FileAccess.file_exists(local_path):
		print("Minigame found in cache, loading PCK...")
		_mount_pck(local_path, minigame_id)
	else:
		print("Minigame not cached, downloading from CDN...")
		_download_pck(minigame_id, pck_url, local_path)

func _mount_pck(path: String, minigame_id: String):
	var success = ProjectSettings.load_resource_pack(path)
	if success:
		print("Successfully loaded PCK: ", path)
		minigame_loaded.emit(minigame_id)
	else:
		print("Failed to load PCK: ", path)

func _download_pck(minigame_id: String, url: String, save_path: String):
	var http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(self._on_download_completed.bind(minigame_id, save_path, http_request))

	var error = http_request.request(url)
	if error != OK:
		print("An error occurred while starting the HTTP request")
		http_request.queue_free()

func _on_download_completed(result, response_code, headers, body, minigame_id: String, save_path: String, request_node: HTTPRequest):
	request_node.queue_free()

	if response_code == 200:
		var file = FileAccess.open(save_path, FileAccess.WRITE)
		file.store_buffer(body)
		print("Downloaded PCK successfully, loading...")
		_mount_pck(save_path, minigame_id)
	else:
		print("Failed to download PCK. HTTP Response Code: ", response_code)
