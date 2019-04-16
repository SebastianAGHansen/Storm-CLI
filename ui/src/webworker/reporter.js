export default (worker) => {

    return {
        log(message) {
            worker.postMessage({
                type: 'message',
                payload: {
                    message: message,
                }
            })
        },
        pass(description) {
            worker.postMessage({
                type: 'pass',
                payload: {
                    message: 'Step `' + description + '` passed',
                }
            })
        },
        fail(description, err) {
            worker.postMessage({
                type: 'fail',
                payload: {
                    message: 'Step  `' + description,
                    error: err,
                }
            })
        },
        success() {
            worker.postMessage({
                type: 'success',
                payload: {
                    message: 'Success'
                }
            })
        },
        error() {
            worker.postMessage({
                type: 'error',
                payload: {
                    message: 'Error'
                }
            })
        },
    }
}


