set -e
DOCKER_URL=harbor.bj.keyayun.com/xinghunm/ops-next-builder
make builder-image
commit=`git describe --dirty --abbrev=8 --tags --always`
docker tag ${DOCKER_URL} ${DOCKER_URL}:${commit}
docker push ${DOCKER_URL}:${commit}
echo build image success: ${DOCKER_URL}:${commit}