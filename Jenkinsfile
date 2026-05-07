pipeline {
    agent { label 'cing-base' }

    environment {
        ESMSUITE_VERSION   = '20260331122234566'
        PLAYWRIGHT_REPO    = 'https://git.rz.bankenit.de/scm/bsinf/esm-performance-test.git'
        TIMESERIES_DB_URL  = 'http://timeseries-db.example.com'
        DEBUG              = true
    }

    parameters {
        booleanParam(name: 'DEPLOY',                defaultValue: false,                  description: 'Deployment laufen lassen')
        string(      name: 'VERSION',               defaultValue: '20260331122234566',    description: 'Welche Version soll deployed werden')
        string(      name: 'TENANT',                defaultValue: '8634',                 description: 'In welche Umgebung soll deployed werden')
        booleanParam(name: 'RUN_REGRESSION_TESTS',  defaultValue: false, description: 'Playwright Regression Tests laufen lassen')
    }

    stages {
        stage('Deploy ESMSuite') {
            agent { label 'cing-python312' }
            when {
                triggeredBy cause: 'UserIdCause'
                expression { params.DEPLOY }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'AUTOMIC_CREDENTIALS', usernameVariable: 'AUTOMIC_USER', passwordVariable: 'AUTOMIC_PASSWORD')]) {
                    sh "python3 src/deploy_esmsuite.py --esm-suite-version ${params.VERSION} --tenant ${params.TENANT}"
                }
            }
        }

        stage('Prepare Environments for Regression Testing') {
            steps {
                echo 'Preparing environments for regression testing...'
                sh "python3 src/prepare_databases.py ${ESMSUITE_VERSION}"
            }
        }

        stage('Run Regression Tests') {
            agent { label 'cing-base-ext' }
            when {
                triggeredBy cause: 'UserIdCause'
            }
            steps {
                echo 'Checking out regression tests repository...'
                dir('playwright-tests') {
                    git url: "${PLAYWRIGHT_REPO}", branch: 'main',
                        credentialsId: 'bsp_scm_credentials'
                }
                dir('playwright-tests/1111') {
                    sh 'npm config set strict-ssl false && npm config set registry https://nexus.rz.bankenit.de/repository/npm-internet-proxy/ && npm install --cache .npm'
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
                                LOGIN_URL=https://login.i${params.TENANT}.sys3.tb.rz.bankenit.de \
                                APPS_URL=https://esm.i${params.TENANT}.sys3.tb.rz.bankenit.de:16613/ \
                                BASEURLESM=https://esm.i${params.TENANT}.sys3.tb.rz.bankenit.de:16613/ \
                                PG_HOST=pgsek555.pka.bankenit.de \
                                PG_PORT=5432 \
                                PG_DB=db_regtest_timeseries \
                                PG_SCHEMA=regtest_timeseries \
                                PERF_VERSION=${ESMSUITE_VERSION} \
                                PERF_ENV=satu \
                                ENV=SATU.${params.TENANT} \
                                BANK_NUMBER=${params.TENANT} \
                                LOGIN_USER_ID=${LOGIN_USER} \
                                USER_PASSWORD=${LOGIN_PASSWORD} \
                                PLAYWRIGHT_BROWSERS_PATH=/home/jenkins/.cache/ms-playwright \
                                BROWSER_CHANNEL=
                            """
                            if (params.RUN_REGRESSION_TESTS) {
                                echo 'Running Playwright regression tests...'
                                sh "${commonEnv} ./node_modules/.bin/playwright test"
                            }
                            echo 'Running Cucumber regression tests...'
                            sh "${commonEnv} ./node_modules/.bin/cucumber-js --config=config/cucumber.js"
                        }
                    }
                    archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'test-results/cucumber-report.html', allowEmptyArchive: true
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
