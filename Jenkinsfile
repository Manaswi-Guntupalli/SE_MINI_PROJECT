pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    parameters {
        booleanParam(name: 'VERIFY_FAILURE_PATH', defaultValue: false,
            description: 'Run a genuinely failing test and propagate its failure to this build. Reset to false for normal builds.')
    }

    triggers { pollSCM('H/5 * * * *') }

    stages {
        stage('Checkout configured branch') {
            steps {
                deleteDir()
                checkout scm
            }
        }
        stage('Verify toolchain and commit') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs preflight' }
                    else { bat 'node scripts/ci.mjs preflight' }
                }
            }
        }
        stage('Install locked dependencies') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs install' }
                    else { bat 'node scripts/ci.mjs install' }
                }
            }
        }
        stage('Build and lint application') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs build' }
                    else { bat 'node scripts/ci.mjs build' }
                }
            }
        }
        stage('Run backend and frontend suites') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs test' }
                    else { bat 'node scripts/ci.mjs test' }
                }
            }
        }
        stage('Prove failing tests are detected') {
            steps {
                script {
                    def command = params.VERIFY_FAILURE_PATH
                        ? 'node scripts/ci.mjs verify-failure-propagate'
                        : 'node scripts/ci.mjs verify-failure'
                    if (isUnix()) { sh command }
                    else { bat command }
                }
            }
        }
        stage('Record release acceptance diagnostics') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs acceptance-report' }
                    else { bat 'node scripts/ci.mjs acceptance-report' }
                }
            }
        }
        stage('Validate and record evidence') {
            steps {
                script {
                    if (isUnix()) { sh 'node scripts/ci.mjs evidence' }
                    else { bat 'node scripts/ci.mjs evidence' }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts: 'client/reports/**,server/reports/**,client/coverage/**,server/coverage/**,client/dist/**,ci-evidence/**',
                allowEmptyArchive: true,
                fingerprint: true
            )
        }
    }
}
