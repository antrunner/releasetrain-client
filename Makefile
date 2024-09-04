all:
	@echo all

.PHONY: package
package:
	DOCKER_BUILDKIT=1 docker build \
		--tag releasetrain-client:latest .

.PHONY: run-container
run-container: package
	docker run --rm -it --name releasetrain-client -p 8080:8080 releasetrain-client:latest
