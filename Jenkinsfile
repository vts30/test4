pipeline {
    agent { label 'cing-base-ext' }

    parameters {
        choice(
            name: 'TEST_TYPE',
            choices: ['playwright', 'cucumber', 'both'],
            description: 'Select which test suite to run'
        )
    }

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
                    git url: "${PLAYWRIGHT_REPO}", branch: 'master',
                        credentialsId: 'bsp_scm_credentials'
                }
            }
        }

        stage('Run Regression Tests') {
            steps {
                dir('playwright-tests') {
                    sh 'npm config set strict-ssl false && npm config set registry https://nexus.rz.bankenit.de/repository/npm-internet-proxy/ && npm ci --cache .npm'
                    sh 'echo "Using system Chrome at /usr/bin/google-chrome"'
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'ESM_LOGIN_CREDENTIALS_ID',
                            usernameVariable: 'LOGIN_USER',
                            passwordVariable: 'LOGIN_PASSWORD'
                        ),
                        usernamePassword(
                            credentialsId: 'PG_CREDENTIALS_ID',
                            usernameVariable: 'PG_USER',
                            passwordVariable: 'PG_PASSWORD'
                        )
                    ]) {
                        script {
                            def commonEnv = """
                                LOGIN_URL=https://login.i8634.sys3.tb.rz.bankenit.de \
                                APPS_URL=https://esm.i8634.sys3.tb.rz.bankenit.de:16613/ \
                                PG_HOST=pgsek555.pka.bankenit.de \
                                PG_PORT=5432 \
                                PG_DB=db_regtest_timeseries \
                                PG_SCHEMA=regtest_timeseries \
                                PERF_VERSION=${ESMSUITE_VERSION} \
                                PERF_ENV=satu \
                                PLAYWRIGHT_BROWSERS_PATH=/home/jenkins/.cache/ms-playwright \
                                BROWSER_CHANNEL=
                            """
                            if (params.TEST_TYPE == 'playwright' || params.TEST_TYPE == 'both') {
                                echo 'Running Playwright regression tests...'
                                sh "${commonEnv} ./node_modules/.bin/playwright test"
                            }
                            if (params.TEST_TYPE == 'cucumber' || params.TEST_TYPE == 'both') {
                                echo 'Running Cucumber regression tests...'
                                sh "${commonEnv} TS_NODE_PROJECT=tsconfig.cucumber.json ./node_modules/.bin/cucumber-js"
                            }
                        }
                    }
                    archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'cucumber-report.html', allowEmptyArchive: true
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
