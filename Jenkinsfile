pipeline {
    agent any

    environment {
        IMAGE_NAME = 'ghcr.io/agungadisaputra04/bookmark-manager-devops'
        IMAGE_TAG  = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                      -f docker/Dockerfile \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} .
                '''
            }
        }

        stage('Push to GHCR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr-credentials',
                        usernameVariable: 'GHCR_USER',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {
                    sh '''
                        echo "$GHCR_TOKEN" | docker login ghcr.io \
                          -u "$GHCR_USER" \
                          --password-stdin

                        docker push ${IMAGE_NAME}:${IMAGE_TAG}

                        docker logout ghcr.io
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'vm101-deploy-ssh',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "Deploying image: ${IMAGE_NAME}:${IMAGE_TAG}"

                        echo "Copying production Compose file..."

                        scp -i "$SSH_KEY" \
                          -o StrictHostKeyChecking=yes \
                          compose.prod.yaml \
                          "$SSH_USER@192.168.50.10:/opt/bookmark-manager/compose.prod.yaml"

                        echo "Connecting to deployment target..."

                        ssh -i "$SSH_KEY" \
                          -o StrictHostKeyChecking=yes \
                          "$SSH_USER@192.168.50.10" \
                          "IMAGE_TAG=${IMAGE_TAG} bash -s" <<'REMOTE_SCRIPT'

set -eu

cd /opt/bookmark-manager

echo "Deployment target: $(hostname)"
echo "Image tag: ${IMAGE_TAG}"

echo "Pulling production images..."

IMAGE_TAG="$IMAGE_TAG" docker compose \
    -f compose.prod.yaml \
    pull

echo "Starting PostgreSQL..."

IMAGE_TAG="$IMAGE_TAG" docker compose \
    -f compose.prod.yaml \
    up -d postgres

echo "Waiting for PostgreSQL..."

for i in $(seq 1 30); do
    status=$(docker inspect \
        -f '{{.State.Health.Status}}' \
        bookmark-postgres 2>/dev/null || true)

    if [ "$status" = "healthy" ]; then
        echo "PostgreSQL is healthy."
        break
    fi

    echo "PostgreSQL status: ${status:-not-created} (attempt $i/30)"
    sleep 2
done

status=$(docker inspect \
    -f '{{.State.Health.Status}}' \
    bookmark-postgres)

if [ "$status" != "healthy" ]; then
    echo "ERROR: PostgreSQL is not healthy."
    exit 1
fi

echo "Running database migration..."

IMAGE_TAG="$IMAGE_TAG" docker compose \
    -f compose.prod.yaml \
    run --rm -T api npm run migrate </dev/null

echo "Starting API, Worker, and Nginx..."

IMAGE_TAG="$IMAGE_TAG" docker compose \
    -f compose.prod.yaml \
    up -d api worker nginx

echo "Waiting for API..."

for i in $(seq 1 30); do
    status=$(docker inspect \
        -f '{{.State.Health.Status}}' \
        bookmark-api 2>/dev/null || true)

    if [ "$status" = "healthy" ]; then
        echo "API is healthy."
        break
    fi

    echo "API status: ${status:-not-created} (attempt $i/30)"
    sleep 2
done

status=$(docker inspect \
    -f '{{.State.Health.Status}}' \
    bookmark-api)

if [ "$status" != "healthy" ]; then
    echo "ERROR: API is not healthy."
    docker logs --tail 50 bookmark-api || true
    exit 1
fi

echo "Checking API liveness..."

docker exec bookmark-api node -e "
    require('http').get(
        'http://localhost:3000/health/live',
        r => process.exit(r.statusCode === 200 ? 0 : 1)
    ).on('error', () => process.exit(1))
"

echo "API liveness check passed."

echo "Checking API readiness..."

docker exec bookmark-api node -e "
    require('http').get(
        'http://localhost:3000/health/ready',
        r => process.exit(r.statusCode === 200 ? 0 : 1)
    ).on('error', () => process.exit(1))
"

echo "API readiness check passed."

echo "Checking API through Nginx..."

curl -f http://localhost/health/live

echo "Nginx liveness proxy check passed."

echo "Checking readiness through Nginx..."

curl -f http://localhost/health/ready

echo "Nginx readiness proxy check passed."

echo "Checking Worker..."

worker_status=$(docker inspect \
    -f '{{.State.Status}}' \
    bookmark-worker 2>/dev/null || true)

if [ "$worker_status" != "running" ]; then
    echo "ERROR: Worker is not running."
    docker logs --tail 50 bookmark-worker || true
    exit 1
fi

echo "Worker is running."

echo "Checking Nginx..."

nginx_status=$(docker inspect \
    -f '{{.State.Status}}' \
    bookmark-nginx 2>/dev/null || true)

if [ "$nginx_status" != "running" ]; then
    echo "ERROR: Nginx is not running."
    docker logs --tail 50 bookmark-nginx || true
    exit 1
fi

echo "Nginx is running."

echo "Verifying deployed images..."

docker inspect bookmark-api \
    --format 'API image: {{.Config.Image}}'

docker inspect bookmark-worker \
    --format 'Worker image: {{.Config.Image}}'

echo "Final container status:"

IMAGE_TAG="$IMAGE_TAG" docker compose \
    -f compose.prod.yaml \
    ps

echo "Deployment successful."

REMOTE_SCRIPT
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "CI/CD pipeline finished: ${currentBuild.currentResult}"
        }
    }
}