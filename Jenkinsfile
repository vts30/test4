pipeline {
    agent { label 'cing-base' }

    environment {
        ESMSUITE_VERSION   = '20260331122345666'
        PLAYWRIGHT_REPO    = 'https://github.com/vts30/test4.git'
        LIGHTHOUSE_SCRIPT  = 'src/run_lighthouse.py'
        TIMESERIES_DB_URL  = 'http://timeseries-db.example.com'
    }

    stages {
        stage('Deploy ESMSuite') {
            steps {
                echo "Deploying ESMSuite version ${ESMSUITE_VERSION}"
                sh 'python3 src/deploy_esmsuite.py ${ESMSUITE_VERSION}'
            }
        }

        stage('Prepare Environments for Regression Testing') {
            steps {
                echo 'Preparing environments for regression testing...'
                sh 'python3 src/prepare_databases.py ${ESMSUITE_VERSION}'
            }
        }

        stage('Checkout Playwright Regression Tests') {
            steps {
                echo 'Checking out Playwright regression tests repository...'
                dir('playwright-tests') {
                    git url: "${PLAYWRIGHT_REPO}", branch: 'main',
                        credentialsId: 'DUMMY_GIT_CREDENTIALS_ID'
                }
            }
        }

        stage('Run Playwright Regression Tests') {
            matrix {
                axes {
                    axis {
                        name 'TEST_ENV'
                        values 'dev', 'staging', 'prod'
                    }
                }
                stages {
                    stage('Test') {
                        steps {
                            echo "Running Playwright regression tests for ${TEST_ENV}..."
                            dir('playwright-tests') {
                                sh 'npm install'
                                sh 'npx playwright install chromium'
                                withCredentials([
                                    usernamePassword(
                                        credentialsId: "DUMMY_ESM_LOGIN_CREDENTIALS_ID_${TEST_ENV}",
                                        usernameVariable: 'LOGIN_USER',
                                        passwordVariable: 'LOGIN_PASSWORD'
                                    ),
                                    usernamePassword(
                                        credentialsId: 'DUMMY_PG_CREDENTIALS_ID',
                                        usernameVariable: 'PG_USER',
                                        passwordVariable: 'PG_PASSWORD'
                                    )
                                ]) {
                                    sh """
                                        TEST_ENV=${TEST_ENV} \
                                        PG_HOST=DUMMY_PG_HOST \
                                        PG_PORT=5432 \
                                        PG_DB=perf_metrics \
                                        PERF_VERSION=${ESMSUITE_VERSION} \
                                        PERF_ENV=${TEST_ENV} \
                                        npx playwright test
                                    """
                                }
                                archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
                            }
                        }
                    }
                }
            }
        }

        stage('Run Performance Tests with Lighthouse') {
            steps {
                echo 'Running Lighthouse performance tests...'
                sh 'python3 src/run_lighthouse.py'
                archiveArtifacts artifacts: 'lighthouse-reports/*.html', allowEmptyArchive: true
            }
        }

        stage('Persist Test Results to Time-Series Database') {
            steps {
                echo 'Persisting test results to time-series database...'
                sh 'python3 src/persist_results.py --db-url ${TIMESERIES_DB_URL}'
            }
        }

        stage('Generate High-Level Reports') {
            steps {
                echo 'Generating high-level reports...'
                sh 'python3 src/generate_reports.py'
                archiveArtifacts artifacts: 'reports/*.pdf', allowEmptyArchive: true
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed. Reports and results are available.'
        }
        failure {
            echo 'Pipeline failed. Please check logs and reports.'
        }
    }
}
