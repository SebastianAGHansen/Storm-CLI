/**
 * Metromatic test
 */
/*jslint esnext: true*/

NotApplicable('This test needs to be updated');

const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

test = {
    'disabled'          : 'true',
    'title'             : 'Stress test using eme.html test',
    'description'       : 'Loads eme.html test page and runs stress tests by changing channels',
    'requiredPlugins'   : ['WebKitBrowser', 'Snapshot'],
    'port'              : undefined,
    'server'            : undefined,
    'maxSameScreenshot' : 3, // amount of times its okay to have the same screenshot
    'curSameScreenshot' : 0, // counter
    'prevScreenshot'    : undefined,
    'extends'           : 'WEBKIT-EME-STRESS-001', // use WEBKIT-EME-STRESS-001.js as base, extend just the required functions
    'steps'         : {
        'step1' : {
            'description'   : 'Load the app on WebKit',
            'test'          : function (x, cb) {
                var _url = `http://${test.server}:${test.port}/app?type=lg`;
                setUrl(_url, cb);
            },
            'validate'      : httpResponseSimple
        },
        'step2' : {
            'sleep'         : 10,
            'description'   : 'Check if app is loaded on WebKit',
            'test'          : getUrl,
            'validate'      : (resp) => {
                if (resp === `http://${test.server}:${test.port}/app?type=lg`)
                    return true;
                
                throw new Error('URL did not load on WebKit');
            }
        },
        'step4' : {
            'sleep'         : 10,
            'description'   : 'Check if screen still updates',
            'test'          : screenshot,
            'validate'      : (res) => {
                // check if we got an empty response
                if (res !== undefined && res.length > 0) {
                    if ( (test.previousSceenshot === undefined) ||
                         (test.previousSceenshot !== undefined && test.previousSceenshot.equals(res) === false)
                       ) {

                        // screen updated, save it and reset stuck counter
                        test.previousSceenshot = res;
                        test.curSameScreenshot = 0;
                        return true;
                    } else {
                        // screen is stuck
                        // check if we have reached the max threshold
                        if (test.curSameScreenshot >= test.maxSameScreenshot)
                            throw new Error('Screen is stuck, new screenshot is the same as previous screenshot for ' + test.curSameScreenshot + ' times.');

                        // update counter and go again
                        test.curSameScreenshot++;
                        return true;
                    }
                } else {
                    // empty response is an annoying bug in the Snapshot module. Trying to be a little more graceful about it by allowing webbridge to return an empty screenshot from time to time
                    if (test.curSameScreenshot >= test.maxSameScreenshot)
                        throw new Error('Error screenshot returned is empty for ' + test.curSameScreenshot + ' times.');

                    // update counter and go again
                    test.curSameScreenshot++;
                    return true;
                }
            }
        },
        'step5' : {
            'sleep'         : 10,
            'description'   : 'Send down key to change channel',
            'test'          : key,
            'params'        : down,
            'validate'      : httpResponseSimple
        },
        'step6' : {
            'sleep'         : 10,
            'description'   : 'Repeat 30 times',
            'goto'          : 'step3',
            'repeat'        : 30,
        },
        'step7' : {
            'description'   : 'Cleanup the test',
            'test'          : setUrl,
            'params'        : 'about:blank'
        }
    }
};


function readApp(callback){
    fs.readFile('./tests/resources/wpe-test-metrological/eme.html', function(err, data){
        if (err){
            throw err;
        } else {
            callback(undefined, data);
        }
    });
}
