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
                sshagent(['vm101-deploy-ssh']) {
                    sh '''
                        set -eu

                        echo "Deploying image: ${IMAGE_NAME}:${IMAGE_TAG}"

                        scp -o StrictHostKeyChecking=yes \
                          compose.prod.yaml \
                          agung@192.168.50.10:/opt/bookmark-manager/compose.prod.yaml

                        ssh -o StrictHostKeyChecking=yes \
                          agung@192.168.50.10 "
                            set -eu

                            cd /opt/bookmark-manager
                            export IMAGE_TAG=${IMAGE_TAG}

                            echo 'Pulling production images...'
                            docker compose -f compose.prod.yaml pull

                            echo 'Starting PostgreSQL...'
                            docker compose -f compose.prod.yaml up -d postgres

                            echo 'Waiting for PostgreSQL...'
                            for i in \$(seq 1 30); do
                                status=\$(docker inspect -f '{{.State.Health.Status}}' bookmark-postgres 2>/dev/null || true)

                                if [ \"\$status\" = 'healthy' ]; then
                                    break
                                fi

                                sleep 2
                            done

                            status=\$(docker inspect -f '{{.State.Health.Status}}' bookmark-postgres)
                            [ \"\$status\" = 'healthy' ]

                            echo 'Running database migration...'
                            docker compose -f compose.prod.yaml run --rm api npm run migrate

                            echo 'Starting API and Worker...'
                            docker compose -f compose.prod.yaml up -d api worker

                            echo 'Waiting for API...'
                            for i in \$(seq 1 30); do
                                status=\$(docker inspect -f '{{.State.Health.Status}}' bookmark-api 2>/dev/null || true)

                                if [ \"\$status\" = 'healthy' ]; then
                                    break
                                fi

                                sleep 2
                            done

                            status=\$(docker inspect -f '{{.State.Health.Status}}' bookmark-api)
                            [ \"\$status\" = 'healthy' ]

                            echo 'Checking API liveness...'
                            docker exec bookmark-api node -e \"
                                require('http').get(
                                    'http://localhost:3000/health/live',
                                    r => process.exit(r.statusCode === 200 ? 0 : 1)
                                ).on('error', () => process.exit(1))
                            \"

                            echo 'Checking API readiness...'
                            docker exec bookmark-api node -e \"
                                require('http').get(
                                    'http://localhost:3000/health/ready',
                                    r => process.exit(r.statusCode === 200 ? 0 : 1)
                                ).on('error', () => process.exit(1))
                            \"

                            echo 'Deployment successful.'
                            docker compose -f compose.prod.yaml ps
                        "
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