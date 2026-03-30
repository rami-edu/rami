extends Node

const DATA_FILE = "user://server_data.json"

# Data structure
var db = {
	"parents": {}, # email -> {id, email, is_admin}
	"otps": {},    # email -> {code, expires_at}
	"children": {},# child_id -> {id, parent_id, name}
	"characters": {} # char_id -> {id, child_id, name, type}
}

var next_parent_id = 1
var next_child_id = 1
var next_character_id = 1

func _ready():
	_load_db()

func _save_db():
	var file = FileAccess.open(DATA_FILE, FileAccess.WRITE)
	if file:
		var meta = {
			"next_parent_id": next_parent_id,
			"next_child_id": next_child_id,
			"next_character_id": next_character_id
		}
		var full_data = {"db": db, "meta": meta}
		file.store_string(JSON.stringify(full_data, "\t"))
		file.close()

func _load_db():
	if FileAccess.file_exists(DATA_FILE):
		var file = FileAccess.open(DATA_FILE, FileAccess.READ)
		if file:
			var content = file.get_as_text()
			var json = JSON.new()
			var error = json.parse(content)
			if error == OK:
				var full_data = json.get_data()
				if full_data.has("db"):
					db = full_data["db"]
				if full_data.has("meta"):
					next_parent_id = full_data["meta"]["next_parent_id"]
					next_child_id = full_data["meta"]["next_child_id"]
					next_character_id = full_data["meta"]["next_character_id"]
			file.close()

# --- Authentication Logic ---

func register_email(email: String) -> Dictionary:
	if db["parents"].has(email):
		return {"success": true, "message": "Email already registered."}

	var p_id = next_parent_id
	next_parent_id += 1
	db["parents"][email] = {
		"id": p_id,
		"email": email,
		"is_admin": false
	}
	_save_db()
	return {"success": true, "message": "User registered."}

func request_otp(email: String) -> Dictionary:
	if not db["parents"].has(email):
		return {"success": false, "message": "Email not registered."}

	var code = "%06d" % (randi() % 1000000)
	var expires = Time.get_unix_time_from_system() + 600 # 10 mins

	db["otps"][email] = {
		"code": code,
		"expires_at": expires
	}
	_save_db()

	# Simulate sending email
	print("--- EMAIL SIMULATION ---")
	print("To: ", email)
	print("Your OTP is: ", code)
	print("------------------------")

	return {"success": true, "message": "OTP sent."}

func verify_otp(email: String, otp: String) -> Dictionary:
	if not db["parents"].has(email):
		return {"success": false, "message": "Email not registered."}

	if not db["otps"].has(email):
		return {"success": false, "message": "No OTP requested."}

	var otp_data = db["otps"][email]
	var current_time = Time.get_unix_time_from_system()

	if current_time > otp_data["expires_at"]:
		return {"success": false, "message": "OTP expired."}

	if otp_data["code"] != otp:
		return {"success": false, "message": "Invalid OTP."}

	# Clear OTP
	db["otps"].erase(email)
	_save_db()

	var p_id = db["parents"][email]["id"]
	return {"success": true, "message": "Login successful.", "parent_id": p_id, "token": "simulated_token_" + str(p_id)}

func login_admin(username: String, password: String) -> Dictionary:
	if username == "admin" and password == "admin":
		var email = "admin@rami.com"
		if not db["parents"].has(email):
			var p_id = next_parent_id
			next_parent_id += 1
			db["parents"][email] = {
				"id": p_id,
				"email": email,
				"is_admin": true
			}
			_save_db()

		var p_id = db["parents"][email]["id"]
		return {"success": true, "message": "Admin login successful.", "parent_id": p_id, "token": "simulated_admin_token_" + str(p_id)}
	return {"success": false, "message": "Invalid credentials."}

func login_google(email: String) -> Dictionary:
	# Mock Google Login
	if not db["parents"].has(email):
		register_email(email)

	var p_id = db["parents"][email]["id"]
	return {"success": true, "message": "Google login successful.", "parent_id": p_id, "token": "simulated_google_token_" + str(p_id)}

# --- Profile / Character Logic ---

func create_child_profile(parent_id: int, child_name: String) -> Dictionary:
	var c_id = str(next_child_id)
	next_child_id += 1
	db["children"][c_id] = {
		"id": c_id,
		"parent_id": parent_id,
		"name": child_name
	}
	_save_db()
	return {"success": true, "message": "Profile created.", "child_id": c_id}

func create_character(child_id: String, character_name: String, character_type: String) -> Dictionary:
	if not db["children"].has(child_id):
		return {"success": false, "message": "Child not found."}

	var char_id = str(next_character_id)
	next_character_id += 1
	db["characters"][char_id] = {
		"id": char_id,
		"child_id": child_id,
		"name": character_name,
		"type": character_type
	}
	_save_db()
	return {"success": true, "message": "Character created.", "character_id": char_id}

func get_profiles(parent_id: int) -> Array:
	var profiles = []
	for c_id in db["children"]:
		var child = db["children"][c_id]
		if child["parent_id"] == parent_id:
			var chars = []
			for char_id in db["characters"]:
				var character = db["characters"][char_id]
				if character["child_id"] == c_id:
					chars.append(character)
			profiles.append({
				"id": child["id"],
				"name": child["name"],
				"characters": chars
			})
	return profiles
