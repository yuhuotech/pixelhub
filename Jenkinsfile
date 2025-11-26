pipeline {
    agent any

    environment {
        // --- Configuration: Please Update These Values ---
        REGISTRY_URL = 'your-registry-url.com'      // e.g., registry.cn-hangzhou.aliyuncs.com
        IMAGE_NAME   = 'pixelhubx'                  // Image name
        TAG          = "v${BUILD_NUMBER}"           // Image tag (using build number)
        
        // Remote Server Config
        REMOTE_USER  = 'root'                       // SSH User
        REMOTE_HOST  = '192.168.1.100'              // SSH Host IP
        REMOTE_DIR   = '/data/www/pixelhubx'        // Deployment directory on server
        CONTAINER_NAME = 'pixelhubx-app'            // Docker container name
        PORT         = '3003'                       // Application port
        
        // Credentials IDs (Configure these in Jenkins)
        DOCKER_CREDS_ID = 'docker-registry-creds'   // ID for Docker Registry credentials
        SSH_CREDS_ID    = 'ssh-server-creds'        // ID for SSH credentials
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker Image..."
                    sh "docker build -t ${REGISTRY_URL}/${IMAGE_NAME}:${TAG} ."
                    sh "docker tag ${REGISTRY_URL}/${IMAGE_NAME}:${TAG} ${REGISTRY_URL}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    echo "Pushing Docker Image..."
                    withCredentials([usernamePassword(credentialsId: DOCKER_CREDS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "docker login -u ${DOCKER_USER} -p ${DOCKER_PASS} ${REGISTRY_URL}"
                        sh "docker push ${REGISTRY_URL}/${IMAGE_NAME}:${TAG}"
                        sh "docker push ${REGISTRY_URL}/${IMAGE_NAME}:latest"
                    }
                }
            }
        }

        stage('Deploy to Server') {
            steps {
                script {
                    echo "Deploying to Remote Server..."
                    sshagent([SSH_CREDS_ID]) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} '
                                # 1. Pull latest image
                                docker pull ${REGISTRY_URL}/${IMAGE_NAME}:latest
                                
                                # 2. Stop and remove old container
                                docker stop ${CONTAINER_NAME} || true
                                docker rm ${CONTAINER_NAME} || true
                                
                                # 3. Run new container
                                # Note: Ensure .env file exists on the server in REMOTE_DIR
                                docker run -d \\
                                    --name ${CONTAINER_NAME} \\
                                    --restart unless-stopped \\
                                    -p ${PORT}:3003 \\
                                    -v ${REMOTE_DIR}/.env:/app/.env \\
                                    -v ${REMOTE_DIR}/uploads:/app/uploads \\
                                    -v ${REMOTE_DIR}/prisma/dev.db:/app/prisma/dev.db \\
                                    ${REGISTRY_URL}/${IMAGE_NAME}:latest
                                    
                                # 4. Cleanup unused images
                                docker image prune -f
                            '
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful!'
        }
        failure {
            echo 'Deployment Failed!'
        }
    }
}
