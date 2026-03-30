#!/bin/bash

# This script launches the Godot project in headless mode as a dedicated server.
# It assumes the 'godot' executable is in your PATH. If you use a specific
# version, replace 'godot' with the path to your executable (e.g., 'godot4').

echo "Starting Project Rami Dedicated Server..."

# Run Godot with the --headless flag to avoid spawning a graphical window,
# and pass --server to trigger the server startup logic in main.gd.
godot --headless --server
