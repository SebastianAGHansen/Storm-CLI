import contra from 'contra'
import Step from './step'
import executeAsPromise from './lib/executeAsPromise'

export default (test, reporter, device) => {
  const runTest = (test, index) => {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          reporter.init(test)

          contra.series(
            [
              // first run setup of test
              next => {
                shouldRunSetup(index)
                  ? runSetup(test.setup)
                      .then(next)
                      .catch(e => {
                        next(e)
                      })
                  : next()
              },
              // run the steps
              next => {
                runSteps(test.steps)
                  .then(next)
                  .catch(e => {
                    next(e)
                  })
              },
              // after steps run teardown
              next => {
                shouldRunTeardown(test, index)
                  ? runTeardown(test.teardown)
                      .then(next)
                      .catch(e => {
                        next(e)
                      })
                  : next()
              },
            ],
            // done!
            (err, results) => {
              if (err) {
                reporter.error(test, err)
                reject(err)
              } else {
                reporter.success(test)
                resolve()
              }
            }
          )
        },
        // wait for 2 seconds between repeating a test (but not on the first run!)
        Math.min(1, index) * 2000
      )
    })
  }

  const shouldRunSetup = index => {
    // only run on the first repeat
    return index <= 0
  }

  const shouldRunTeardown = (test, index) => {
    // only run on the last repeat
    if (!test.repeat) {
      return true
    }
    return index == test.repeat - 1
  }

  const runSetup = method => {
    if (method && typeof method === 'function') {
      reporter.log('Running Test Setup')
    }
    return executeAsPromise(method)
  }

  const runTeardown = method => {
    if (method && typeof method === 'function') {
      reporter.log('Running Test Teardown')
    }
    return executeAsPromise(method)
  }

  const runSteps = steps => {
    return new Promise((resolve, reject) => {
      contra.each.series(
        steps,
        (step, next) => {
          reporter.step(test, step)

          // make device info available in the step as this.device
          step.device = device

          // repeat steps (defaults to only once)
          contra.each.series(
            Array(step.repeat || 1).fill(step),
            (repeatStep, index, repeat) => {
              runStep(repeatStep, index)
                .then(() => {
                  repeat()
                })
                .catch(err => next(err))
            },
            err => {
              next(err)
            }
          )
        },
        err => {
          err ? reject(err) : resolve()
        }
      )
    })
  }

  const runStep = (step, index) => {
    return new Promise((resolve, reject) => {
      try {
        return Step(step, reporter, index)
          .exec()
          .then(() => {
            reporter.pass(test, step)
            resolve()
          })
          .catch(err => {
            reporter.fail(test, step, err)
            reject(err)
          })
      } catch (e) {
        reject(e)
      }
    })
  }

  return {
    exec() {
      return new Promise((resolve, reject) => {
        contra.each.series(
          Array(test.repeat || 1).fill(test),
          (repeatTest, index, repeat) => {
            runTest(repeatTest, index)
              .then(repeat)
              .catch(e => {
                repeat(e)
              })
          },
          err => {
            reporter.finished(test, err)
            err ? reject(err) : resolve()
          }
        )
      })
    },
  }
}
