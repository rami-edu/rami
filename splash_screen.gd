extends Control

var splash_time = 3.0
var time_elapsed = 0.0

func _process(delta):
	time_elapsed += delta
	if time_elapsed >= splash_time:
		get_tree().change_scene_to_file("res://main.tscn")
