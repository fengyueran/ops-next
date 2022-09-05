
PROJECT="ops-next"
PROJECTPATH=$(shell pwd)
DOCKER_URL=harbor.bj.keyayun.com/xinghunm/ops-next-builder

modules:
	ln -s /cache/node_modules ${PROJECTPATH}/node_modules;

ops-next: modules ;@echo "package-build build ${PROJECT}....."; \
	yarn build

builder-image:
	DOCKER_BUILDKIT=1 docker build --secret id=gitkey,src=${HOME}/.ssh/id_rsa -f docker/builder.dockerfile -t ${DOCKER_URL} .

clean : ;
	rm -rf node_modules


.PHONY: modules package-build builder-image clean
