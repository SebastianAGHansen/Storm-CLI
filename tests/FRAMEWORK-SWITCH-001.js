/**
 * WPETestFramework test
 */
/*jslint esnext: true*/

module.exports = {
    'title'         : 'WPEWebkit/YouTube switch robustness test',
    'description'   : 'Switches between YouTube/WPEWebkit and checks if everything is started and suspended correctly',
    'steps'         : {
        'init'  : {
            'description'   : 'Check if Switch Plugin is present',
            'test'          : getPlugin,
            'params'        : 'Switch',
            'validate'      : (resp) => {
                if (resp.status !== 400)
                    return true;

                NotApplicable('Build does not support Switch');
            }
        },
        'init0'  : {
            'description'   : 'Check if Netflix Plugin is present',
            'test'          : getPlugin,
            'params'        : 'Netflix',
            'validate'      : (resp) => {
                if (resp.status !== 400)
                    return true;

                NotApplicable('Build does not support Netflix');
            }
        },
        'init1'  : {
            'description'   : 'Check if YouTube Plugin is present',
            'test'          : getPlugin,
            'params'        : 'YouTube',
            'validate'      : (resp) => {
                if (resp.status !== 400)
                    return true;

                NotApplicable('Build does not support YouTube');
            }
        },
        'init2' : {
            'description'   : 'Stop YouTube Netflix & WPEWebkit',
            'timeout'       : 180, //seconds
            'test'          : stopPlugins,
            'params'        : ['YouTube', 'Netflix', 'WebKitBrowser'],
            'validate'      : httpResponseSimple,
        },
        'init3' : {
            'sleep'         : 10,
            'description'   : 'Check if YouTube is succesfully stopped',
            'timeout'       : 30, //seconds
            'test'          : getPluginState,
            'params'        : 'YouTube',
            'assert'        : 'deactivated',
        },
        /* WPEWebkitcurrently restarts automatically when deactivated
        init4' : {
            'sleep'         : 10,
            'description'   : 'Check if WPEWebkit is succesfully stopped',
            'timeout'       : 30, //seconds
            'test'          : getPluginState,
            'params'        : 'WebKitBrowser',
            'assert'        : 'deactivated'
        },*/
        'init5' : {
            'sleep'         : 10,
            'description'   : 'Check if WPEWebkit is started',
            'timeout'       : 180, //seconds
            'test'          : getPluginState,
            'params'        : 'WebKitBrowser',
            'validate'      : checkResumedOrActivated,
        },
        'step1' : {
            'sleep'         : 10,
            'description'   : 'Switch to YouTube',
            'timeout'       : 180, //seconds
            'test'          : switchPlugin,
            'params'        : 'YouTube',
            'validate'      : httpResponseSimple,
        },
        'step2' : {
            'description'   : 'Set the YouTube url',
            'timeout'       : 180,
            'test'          : setYouTubeUrl,
            'params'        : 'http://www.youtube.com/tv',
            'validate'      : httpResponseSimple,
        },
        'step3' : {
            'sleep'         : 10,
            'description'   : 'Check if YouTube is activated',
            'timeout'       : 180,
            'test'          : getPluginState,
            'params'        : 'YouTube',
            'validate'      : checkResumedOrActivated,
        },
        'step4' : {
            'sleep'         : 10,
            'description'   : 'Check if WPEWebkit is deactivated/suspended',
            'timeout'       : 180,
            'test'          : getPluginState,
            'params'        : 'WebKitBrowser',
            'validate'      : checkSuspendedOrDeactivated,
        },
        'step5' : {
            'sleep'         : 10,
            'description'   : 'Switch to WPEWebkit',
            'timeout'       : 180, //seconds
            'test'          : switchPlugin,
            'params'        : 'WebKitBrowser',
            'validate'      : httpResponseSimple,
        },
        'step6' : {
            'sleep'         : 10,
            'description'   : 'Check if WPEWebkit is started',
            'timeout'       : 180, //seconds
            'test'          : getPluginState,
            'params'        : 'WebKitBrowser',
            'validate'      : checkResumedOrActivated,
        },
        'step7' : {
            'sleep'         : 10,
            'description'   : 'Check if YouTube is deactivated',
            'timeout'       : 30, //seconds
            'test'          : getPluginState,
            'params'        : 'YouTube',
            'assert'        : 'deactivated',
        },
        'step8' : {
            'description'   : 'Repeat',
            'goto'          : 'step1',
            'repeat'        : '30'
        }
    }
};
