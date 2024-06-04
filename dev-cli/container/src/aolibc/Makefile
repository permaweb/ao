# Builds a patched libc.a, customized with the override functions found in aostdlib.c

# Path to the Emscripten SDK
EMSDK_PATH ?= $(shell echo $$EMSDK)
LIBC_A_PATH ?= $(shell find $(EMSDK_PATH) -name libc.a)
PATCHED_LIBC_A_PATH ?= $(shell pwd)/libc.ao.a

# Path to your custom stdlib object file
CUSTOM_LIB_OBJ = aostdio.o

.PHONY: build
build: aolibc.a

aolibc.a: $(CUSTOM_LIB_OBJ)
	emar r aolibc.a $(CUSTOM_LIB_OBJ)

CUSTOM_LIB_OBJ: aostdio.c
	emcc -s -c aostdio.c -o aostdio.o

# Default target
install: build-patched update-libc

# Target to update libc.a
build-patched: $(CUSTOM_LIB_OBJ)
	@# Ensure libc.a path is not empty
	@if [ -z "$(LIBC_A_PATH)" ]; then \
		echo "libc.a not found, check your EMSDK_PATH"; \
		exit 1; \
	fi
	@cp $(LIBC_A_PATH) $(PATCHED_LIBC_A_PATH)
	@echo "Updating libc.a at $(PATCHED_LIBC_A_PATH)..."
	@# Extract function names from the custom object file
	$(eval FUNCTIONS_TO_REMOVE=$(shell emnm $(CUSTOM_LIB_OBJ) | grep ' T ' | cut -d' ' -f3 | sed 's/$$/.o/'))
	@echo "Removing functions: $(FUNCTIONS_TO_REMOVE)"
	@# Remove existing function implementations from libc.a
	emar d $(PATCHED_LIBC_A_PATH) $(FUNCTIONS_TO_REMOVE)
	@# Add custom stdlib object file to libc.a
	emar r $(PATCHED_LIBC_A_PATH) $(CUSTOM_LIB_OBJ)
	@echo "libc.a updated successfully."

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -f $(CUSTOM_LIB_OBJ)
	@echo "Clean complete."