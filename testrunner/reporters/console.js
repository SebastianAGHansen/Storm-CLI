module.exports = {
    log(msg) {
        console.log('➡️  ' + msg)
    },
    pass(description) {
        console.log('✅  Step `' + description + '` passed')
    },
    fail(description, err) {
        console.log('❌  Step  `' + description + '` failed', err)
    },
    success() {
        console.log('👍  Success')
    },
    error() {
        console.log('😭  Error')
    },
}