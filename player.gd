extends CharacterBody2D

@export var speed = 200

# Safety constraints: no free-text chat
var emojis = ["💡", "👍", "👏", "👋"]

func _enter_tree():
	set_multiplayer_authority(str(name).to_int())

	if is_multiplayer_authority():
		$NameLabel.text = UserManager.get_username()
		rpc("set_username", UserManager.get_username())

func _physics_process(delta):
	if not is_multiplayer_authority(): return

	var dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	velocity = dir * speed
	move_and_slide()

@rpc("any_peer", "call_local")
func set_username(u_name):
	if multiplayer.get_remote_sender_id() != str(name).to_int(): return
	$NameLabel.text = u_name

# Emotes/Pings replacing chat
func _input(event):
	if not is_multiplayer_authority(): return

	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_1:
			rpc("show_emoji", emojis[0])
		elif event.keycode == KEY_2:
			rpc("show_emoji", emojis[1])
		elif event.keycode == KEY_3:
			rpc("show_emoji", emojis[2])
		elif event.keycode == KEY_4:
			rpc("show_emoji", emojis[3])

@rpc("any_peer", "call_local")
func show_emoji(emoji):
	$EmojiLabel.text = emoji
	$EmojiTimer.start()

func _on_EmojiTimer_timeout():
	$EmojiLabel.text = ""
