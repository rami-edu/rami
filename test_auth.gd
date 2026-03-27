extends SceneTree

func _init():
	print("Starting AuthManager Tests...")

	# Instantiate and ready the AuthManager manually for script execution
	var auth = preload("res://auth_manager.gd").new()
	auth._ready()

	# Clean slate for test
	auth.db = {"parents": {}, "otps": {}, "children": {}, "characters": {}}
	auth.next_parent_id = 1
	auth.next_child_id = 1
	auth.next_character_id = 1

	print("\n--- Testing Admin Login ---")
	var admin_res = auth.login_admin("admin", "admin")
	assert(admin_res["success"], "Admin login failed")
	print("Admin Login OK")

	print("\n--- Testing Email Registration ---")
	var reg_res = auth.register_email("test@parent.com")
	assert(reg_res["success"], "Registration failed")
	print("Registration OK")

	print("\n--- Testing OTP Flow ---")
	var otp_res = auth.request_otp("test@parent.com")
	assert(otp_res["success"], "OTP request failed")
	var code = auth.db["otps"]["test@parent.com"]["code"]
	var verify_res = auth.verify_otp("test@parent.com", code)
	assert(verify_res["success"], "OTP verification failed")
	var parent_id = verify_res["parent_id"]
	print("OTP Verification OK, Parent ID: ", parent_id)

	print("\n--- Testing Google Login ---")
	var google_res = auth.login_google("google@parent.com")
	assert(google_res["success"], "Google login failed")
	print("Google Login OK")

	print("\n--- Testing Profile & Character Creation ---")
	var child_res = auth.create_child_profile(parent_id, "Alice")
	assert(child_res["success"], "Child profile creation failed")
	var child_id = child_res["child_id"]
	print("Profile Created OK, Child ID: ", child_id)

	var char_res = auth.create_character(child_id, "Alice's Dino", "Quartz Dinosaur")
	assert(char_res["success"], "Character creation failed")
	print("Character Created OK")

	var profiles = auth.get_profiles(parent_id)
	assert(profiles.size() == 1, "Expected 1 profile")
	assert(profiles[0]["name"] == "Alice", "Expected profile name Alice")
	assert(profiles[0]["characters"].size() == 1, "Expected 1 character")
	assert(profiles[0]["characters"][0]["type"] == "Quartz Dinosaur", "Expected char type Quartz Dinosaur")
	print("Get Profiles OK")

	print("\nAll AuthManager Tests Passed!")
	quit()
