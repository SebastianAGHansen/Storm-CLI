/**
 * An animation that is automatically progressed by time.
 * @constructor
 */
function TimedAnimation(stage) {
    Animation.call(this, stage);

    var self = this;

    this._delay = 0;

    /**
     * The duration of the animation, in seconds. If -1, the progress value should be set manually.
     * @type {number}
     */
    this._duration = 1;

    this._repeat = 0;
    this._repeatProgress = 0;
    this._repeatDelay = 0;

    /**
     * @access private
     */
    this.delayLeft = 0;

    /**
     * @access private
     */
    this.repeatsLeft = 0;

    /**
     * Automatically calls stop after finish.
     * @type {boolean}
     */
    this._autostop = false;

    this.onStart = new EventType();
    this.onRepeat = new EventType();
    this.onDelayEnd = new EventType();
    this.onProgress = new EventType();
    this.onFinish = new EventType();

    this.onStop = new EventType();
    this.onStopDelayEnd = new EventType();
    this.onStopFinish = new EventType();
    this.onStopContinue = new EventType();

    /**
     * The way that the animation 'stops'.
     * @type {number}
     */
    this._stopMethod = TimedAnimation.STOP_METHODS.FADE;

    /**
     * Advanced options regarding the stop method, such as:
     * - {number} duration
     *   This overrules this animation's duration setting.
     * - {number} delay
     *   If specified, the stop starts delayed.
     * - {Function} timingFunction
     *   This overrules this animation's timing function.
     * @type {object}
     */
    this._stopMethodOptions = {};

    this.stopDelayLeft = 0;

    this.state = TimedAnimation.STATES.IDLE;

    this.stoppingProgressTransition = new Transition(0);

    this.runFinishFunc = null;
    this.runStopFinishFunc = null;

}

Utils.extendClass(TimedAnimation, Animation);

TimedAnimation.prototype.isActive = function() {
    return this.subject && (this.state == TimedAnimation.STATES.PLAYING || this.state == TimedAnimation.STATES.STOPPING);
};

TimedAnimation.prototype.setSubject = function(subject) {
    var prevSubject = this.subject;

    var active = (this.p > 0 || this.state == TimedAnimation.STATES.PLAYING);
    if (!prevSubject && subject && active) {
        // Becomes active.
        this.stage.addActiveAnimation(this);
    }
    Animation.prototype.setSubject.apply(this, arguments);
};

/**
 * Runs this animation once on the subject, stop it and remove it.
 * @param subject
 */
TimedAnimation.prototype.run = function(subject) {
    this.stopNow();

    this.setSubject(subject);

    if (this.runFinishFunc) {
        this.onFinish.removeListener(this.runFinishFunc);
    }
    if (this.runStopFinishFunc) {
        this.onStopFinish.removeListener(this.runStopFinishFunc);
    }

    var self = this;
    this.runFinishFunc = function() {
        self.stop();

        self.runStopFinishFunc = function() {
            self.setSubject(null);
            self.onFinish.removeListener(self.runFinishFunc);
            self.onStopFinish.removeListener(self.runStopFinishFunc);
        };
        self.onStopFinish.listen(self.runStopFinishFunc);
    };

    this.onFinish.listen(this.runFinishFunc);

    this.play();
};

/**
 * Updates the subject components for all animation elements if necessary.
 * @returns {boolean}
 */
TimedAnimation.prototype.updateComponents = function() {
    var n = this.actions.length;
    for (var i = 0; i < n; i++) {
        if (this.actions[i].updateComponents()) {
            return true;
        }
    }
};

TimedAnimation.prototype.progress = function(dt) {
    if (!this.subject) {
        return;
    }

    if (this.state == TimedAnimation.STATES.STOPPING) {
        this.stopProgress(dt);
        return;
    }

    if (this.state != TimedAnimation.STATES.PLAYING) {
        return;
    }

    if (this.delayLeft > 0) {
        this.delayLeft -= dt;

        if (this.delayLeft < 0) {
            dt = -this.delayLeft;
            this.delayLeft = 0;

            if (this.onDelayEnd.hasListeners) {
                this.onDelayEnd.trigger();
            }
        } else {
            return;
        }
    }

    if (this.duration === 0) {
        this.p = 1;
    } else if (this.duration > 0) {
        this.p += dt / this.duration;
    }
    if (this.p >= 1) {
        // Finished!
        if (this.repeat == -1 || this.repeatsLeft > 0) {
            if (this.repeatsLeft > 0) {
                this.repeatsLeft--;
            }
            this.p = this.repeatProgress;

            if (this.repeatDelay) {
                this.delayLeft = this.repeatDelay;
            }

            if (this.onRepeat.hasListeners) {
                this.onRepeat.trigger({repeatsLeft: this.repeatsLeft});
            }
        } else {
            this.p = 1;
            this.state = TimedAnimation.STATES.FINISHED;
            if (this.onFinish.hasListeners) {
                this.onFinish.trigger();
            }
            if (this.autostop) {
                this.stop();
            }
        }
    } else {
        if (this.onProgress.hasListeners) {
            this.onProgress.trigger();
        }
    }
};

TimedAnimation.prototype.stopProgress = function(dt) {
    var duration = this.stopMethodOptions.duration === undefined ? this.duration : this.stopMethodOptions.duration;

    if (this.delayLeft > 0) {
        // TimedAnimation wasn't even started yet: directly finish!
        this.state = TimedAnimation.STATES.STOPPED;
        if (this.onStopFinish.hasListeners) {
            this.onStopFinish.trigger();
        }
    }

    if (this.stopDelayLeft > 0) {
        this.stopDelayLeft -= dt;

        if (this.stopDelayLeft < 0) {
            dt = -this.stopDelayLeft;
            this.stopDelayLeft = 0;

            if (this.onStopDelayEnd.hasListeners) {
                this.onStopDelayEnd.trigger();
            }
        } else {
            return;
        }
    }
    if (this.stopMethod == TimedAnimation.STOP_METHODS.IMMEDIATE) {
        this.state = TimedAnimation.STATES.STOPPED;
        if (this.onStop.hasListeners) {
            this.onStop.trigger();
        }
        if (this.onStopFinish.hasListeners) {
            this.onStopFinish.trigger();
        }
    } else if (this.stopMethod ==TimedAnimation.STOP_METHODS.REVERSE) {
        if (duration === 0) {
            this.p = 0;
        } else if (duration > 0) {
            this.p -= dt / duration;
        }

        if (this.p <= 0) {
            this.p = 0;
            this.state = TimedAnimation.STATES.STOPPED;
            if (this.onStopFinish.hasListeners) {
                this.onStopFinish.trigger();
            }
        }
    } else if (this.stopMethod == TimedAnimation.STOP_METHODS.FADE) {
        this.stoppingProgressTransition.progress(dt);
        if (this.stoppingProgressTransition.p >= 1) {
            this.state = TimedAnimation.STATES.STOPPED;
            if (this.onStopFinish.hasListeners) {
                this.onStopFinish.trigger();
            }
        }
    } else if (this.stopMethod == TimedAnimation.STOP_METHODS.ONETOTWO) {
        if (this.p < 2) {
            if (duration === 0) {
                this.p = 2;
            } else if (duration > 0) {
                if (this.p < 1) {
                    this.p += dt / this.duration;
                } else {
                    this.p += dt / duration;
                }
            }
            if (this.p >= 2) {
                this.p = 2;
                this.state = TimedAnimation.STATES.STOPPED;
                if (this.onStopFinish.hasListeners) {
                    this.onStopFinish.trigger();
                }
            } else {
                if (this.onProgress.hasListeners) {
                    this.onProgress.trigger();
                }
            }
        }
    } else {
        if (this.p < 1) {
            if (duration == 0) {
                this.p = 1;
            } else {
                this.p += dt / duration;
            }
            if (this.p >= 1) {
                if (this.stopMethod == TimedAnimation.STOP_METHODS.FORWARD) {
                    this.p = 1;
                    this.state = TimedAnimation.STATES.STOPPED;
                    if (this.onStopFinish.hasListeners) {
                        this.onStopFinish.trigger();
                    }
                } else {
                    if (this.repeatsLeft > 0) {
                        this.repeatsLeft--;
                        this.p = 0;
                        if (this.onRepeat.hasListeners) {
                            this.onRepeat.trigger({repeatsLeft: this.repeatsLeft});
                        }
                    } else {
                        this.p = 1;
                        this.state = TimedAnimation.STATES.STOPPED;
                        if (this.onStopFinish.hasListeners) {
                            this.onStopFinish.trigger();
                        }
                    }
                }
            } else {
                if (this.onProgress.hasListeners) {
                    this.onProgress.trigger();
                }
            }
        }
    }
};

TimedAnimation.prototype.setSetting = function(name, value) {
    if (this[name] === undefined) {
        throw new TypeError('Unknown property:' + name);
    }
    this[name] = value;
};

TimedAnimation.prototype.start = function() {
    this.p = 0;
    this.delayLeft = this.delay;
    this.repeatsLeft = this.repeat;
    this.state = TimedAnimation.STATES.PLAYING;
    this.onStart.trigger(null);

    if (this.subject) {
        this.stage.addActiveAnimation(this);
    }
};

TimedAnimation.prototype.fastForward = function() {
    if (this.state === TimedAnimation.STATES.PLAYING) {
        this.delayLeft = 0;
        this.p = 1;
    } else if (this.state === TimedAnimation.STATES.STOPPING) {
        this.stopDelayLeft = 0;
        this.p = 0;
    }
};

TimedAnimation.prototype.play = function() {
    if (this.state == TimedAnimation.STATES.STOPPING && this.stopMethod == TimedAnimation.STOP_METHODS.REVERSE) {
        // Continue.
        this.state = TimedAnimation.STATES.PLAYING;
        this.onStopContinue.trigger();
    } else if (this.state != TimedAnimation.STATES.PLAYING && this.state != TimedAnimation.STATES.FINISHED) {
        // Restart.
        this.start();
    }
};

TimedAnimation.prototype.replay = function() {
    if (this.state == TimedAnimation.STATES.FINISHED) {
        this.start();
    } else {
        this.play();
    }
};

TimedAnimation.prototype.isPlaying = function() {
    return this.state === TimedAnimation.STATES.PLAYING;
};

TimedAnimation.prototype.skipDelay = function() {
    this.delayLeft = 0;
    this.stopDelayLeft = 0;
};

TimedAnimation.prototype.stop = function() {
    if (this.state === TimedAnimation.STATES.STOPPED || this.state === TimedAnimation.STATES.IDLE) return;

    if (this.subject) {
        this.stage.addActiveAnimation(this);
    }

    this.stopDelayLeft = this.stopMethodOptions.delay || 0;

    if ((this.stopMethod == TimedAnimation.STOP_METHODS.IMMEDIATE && !this.stopDelayLeft) || this.delayLeft > 0) {
        // Stop upon next progress.
        this.state = TimedAnimation.STATES.STOPPING;
        this.onStop.trigger();
    } else {
        if (this.stopMethod == TimedAnimation.STOP_METHODS.FADE) {
            if (this.stopMethodOptions.duration) {
                this.stoppingProgressTransition.duration = this.stopMethodOptions.duration;
            }
            if (this.stopMethodOptions.timingFunction) {
                this.stoppingProgressTransition.timingFunction = this.stopMethodOptions.timingFunction;
            }
            this.stoppingProgressTransition.reset(0, 1, 0);
        }

        this.state = TimedAnimation.STATES.STOPPING;
        this.onStop.trigger();
    }

};

TimedAnimation.prototype.stopNow = function() {
    if (this.state !== TimedAnimation.STATES.STOPPED || this.state !== TimedAnimation.STATES.IDLE) {
        this.state = TimedAnimation.STATES.STOPPING;
        this.p = 0;
        this.onStop.trigger();
        this.resetTransforms();
        this.state = TimedAnimation.STATES.STOPPED;
        this.onStopFinish.trigger();
    }
};


TimedAnimation.prototype.applyTransforms = function() {
    if (this.state == TimedAnimation.STATES.STOPPED) {
        // After being stopped, reset all values to their start positions.
        var n = this.actions.length;
        for (var i = 0; i < n; i++) {
            this.actions[i].resetTransforms(this.amplitude);
        }
    } else {
        // Apply possible fade out effect.
        var factor = 1;
        if (this.state == TimedAnimation.STATES.STOPPING && this.stopMethod == TimedAnimation.STOP_METHODS.FADE) {
            factor = (1 - this.stoppingProgressTransition.getProgress());
        }

        var p = this.progressFunction(this.p);

        var n = this.actions.length;
        for (var i = 0; i < n; i++) {
            this.actions[i].applyTransforms(p, this.getFrameForProgress(p), this.amplitude, factor);
        }
    }
};

Object.defineProperty(TimedAnimation.prototype, 'delay', {
    get: function() { return this._delay; },
    set: function(v) {
        if (!Utils.isNumber(v)) {
            throw new TypeError('delay must be a number');
        }
        this._delay = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'repeatDelay', {
    get: function() { return this._repeatDelay; },
    set: function(v) {
        if (!Utils.isNumber(v)) {
            throw new TypeError('repeatDelay must be a number');
        }
        this._repeatDelay = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'duration', {
    get: function() { return this._duration; },
    set: function(v) {
        if (!Utils.isNumber(v)) {
            throw new TypeError('duration must be a number');
        }
        this._duration = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'repeat', {
    get: function() { return this._repeat; },
    set: function(v) {
        if (!Utils.isInteger(v) || v < -1) {
            throw new TypeError('repeat must be a positive integer, 0 or -1');
        }
        this._repeat = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'repeatProgress', {
    get: function() { return this._repeatProgress; },
    set: function(v) {
        if (!Utils.isNumber(v) || v < 0) {
            throw new TypeError('repeatProgress must be a positive number');
        }
        this._repeatProgress = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'stopMethod', {
    get: function() { return this._stopMethod; },
    set: function(v) {
        if (!Utils.isInteger(v) || v < 0 || v > 4) {
            throw new TypeError('stopMethod unknown');
        }
        this._stopMethod = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'autostop', {
    get: function() { return this._autostop; },
    set: function(v) {
        if (!Utils.isBoolean(v)) {
            throw new TypeError('autostop must be a boolean');
        }
        this._autostop = v;
    }
});

Object.defineProperty(TimedAnimation.prototype, 'stopMethodOptions', {
    get: function() { return this._stopMethodOptions; },
    set: function(v) {
        if (!Utils.isObject(v)) {
            throw new TypeError('stopMethodOptions must be an object');
        }
        this._stopMethodOptions = v;
    }
});

TimedAnimation.STATES = {
    IDLE: 0,
    PLAYING: 1,
    STOPPING: 2,
    STOPPED: 3,
    FINISHED: 4
};

TimedAnimation.STOP_METHODS = {
    FADE: 0,
    REVERSE: 1,
    FORWARD: 2,
    IMMEDIATE: 3,
    ONETOTWO: 4
};

