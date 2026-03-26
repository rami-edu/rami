extends Node2D

var rotation_speed = 5.0
var dots_count = 8
var radius = 30.0
var time_passed = 0.0

func _process(delta):
	time_passed += delta * rotation_speed
	queue_redraw()

func _draw():
	var center = Vector2(0, 0)

	for i in range(dots_count):
		var angle = (float(i) / dots_count) * TAU + time_passed
		var pos = center + Vector2(cos(angle), sin(angle)) * radius

		# Give a fading tail effect based on position
		var alpha = 1.0 - (float(i) / dots_count)
		var color = Color(0.4, 0.8, 0.3, alpha) # Greenish nature color

		draw_circle(pos, 5.0, color)
