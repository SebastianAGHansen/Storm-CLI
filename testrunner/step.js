export default (step, reporter) => {
    
    // todo: more / better validations of step
    if('description' in step === false) {
        throw Error('No description supplied for step')
    }

    // setup default validate function if doesn't exist
    if('validate' in step === false) {
        if('params' in step === false) {
            step.params = true
        }
        if('assert' in step === false) {
            step.assert = step.params
        }
        step.validate = (x) => { return x === step.assert }
    }

    return {
        exec() {

            return new Promise((resolve, reject) => {

                if('sleep' in step) {
                    reporter.log('Sleeping for ' + step.sleep + ' seconds')    
                }
    
                setTimeout(() => {

                    reporter.log('Executing ' + step.description)

                    const result = step.test.apply(step, (step.params instanceof Array) ? step.params : [step.params])

                    // asynchronous test function
                    if(result.then && typeof result.then === 'function') {
                        result.then(res => {

                            if(step.validate(res) === true) {
                                return resolve(res)
                            }
                            else {
                                return reject(res)
                            }
                        }).catch(err => {
                            return reject(err)
                        })
                    }
                    // synchronous test function
                    else {
                        if(step.validate(result) === true) {
                            return resolve(result)
                        }
                        else {
                            return reject()
                        }
                    }
                }, step.sleep * 1000 || 500)
                
            })
        }
    }

}
