pipeline {
    agent any

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
                sh 'docker build -f docker/Dockerfile -t bookmark-manager:${BUILD_NUMBER} .'
            }
        }
    }

    post {
        always {
            echo "CI pipeline finished: ${currentBuild.currentResult}"
        }
    }
}