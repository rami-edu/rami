extends Node

# Auto-Namer for minor accounts (COPPA Compliant)
var prefixes = ["Quartz", "Basalt", "Agate", "Emerald", "Ruby", "Sapphire", "Granite", "Moss", "Fern", "Oak"]
var suffixes = ["Dinosaur", "Raccoon", "Owl", "Fox", "Bear", "Wolf", "Hawk", "Badger", "Otter", "Squirrel"]

var local_username: String = ""

func _ready():
	generate_username()

func generate_username():
	randomize()
	var prefix = prefixes[randi() % prefixes.size()]
	var suffix = suffixes[randi() % suffixes.size()]
	local_username = prefix + " " + suffix
	print("Auto-generated username: ", local_username)

func get_username() -> String:
	return local_username
