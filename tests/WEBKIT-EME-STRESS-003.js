/**
 * Metromatic test
 */
/*jslint esnext: true*/

if (devicetype.slice(0,3) !== 'rpi')
    NotApplicable('Snapshot is only supported on Raspberry PI devices');

const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

module.exports = {
    'title'         : 'Stress test using eme.html test',
    'description'   : 'Loads eme.html test page and runs stress tests by playing a video for 3 hours',
    'port'          : undefined,
    'server'        : undefined,
    'maxSameScreenshot' : 3, // amount of times its okay to have the same screenshot
    'curSameScreenshot' : 0, // counter
    'prevScreenshot': undefined,
    'extends'       : 'WEBKIT-EME-STRESS-001.js', // use WEBKIT-EME-STRESS-001.js as base, extend just the required functions
    'steps'         : {
        'step1' : {
            'description'   : 'Load the app on WebKit',
            'test'          : function (x, cb) {
                var _url = `http://${task.server}:${task.port}/app?type=lg`;
                setUrl(_url, cb);
            },
            'validate'      : httpResponseSimple
        },
        'step2' : {
            'sleep'         : 10,
            'description'   : 'Check if app is loaded on WebKit',
            'test'          : getUrl,
            'validate'      : (resp) => {
                if (resp === `http://${task.server}:${task.port}/app?type=lg`)
                    return true;
                
                throw new Error('URL did not load on WebKit');
            }
        },
    }
};


function readApp(callback){
    fs.readFile('./tests/resources/wpe-tests/eme.html', function(err, data){
        if (err){
            throw err;
        } else {
            callback(undefined, data);
        }
    });
}
