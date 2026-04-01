import os
import sys

# Add backend/ to sys.path so tests can import auth, database, models, etc.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
