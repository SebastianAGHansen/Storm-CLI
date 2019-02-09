/**
 * WPETestFramework test
 */
/*jslint esnext: true*/

NotApplicable('This test needs to be updated');

test = {
    'disabled'          : 'true',
	'title'             : 'WPEWebkit performance test using performance.html',
    'description'       : 'Loads performance.html test page and calculates FPS',
    'requiredPlugins'   : ['WebKitBrowser'],
    'samples'           : [],
    'minFPS'            : 25, // minimum FPS or this test will fail
    'extends'           : 'WEBKIT-PERFORMANCE-012', // use WEBKIT-PERFORMANCE-012.js as base, extend just the required functions
    'steps'             : {
    	'step5' : {
            'description'   : 'Load the app on WPEWebkit',
            'test'          : function (x, cb) {
                var _url = `http://${test.server}:8080/maf-ui-hzn4/tests/performance.html`;
                setUrl(_url, cb);
            },
            'validate'      : httpResponseSimple
        },
    	'step6' : {
            'sleep'         : 3,
            'description'   : 'Check if app is loaded on WPEWebkit',
            'test'          : getUrl,
            'validate'      : (resp) => {
                if (resp === `http://${test.server}:8080/maf-ui-hzn4/tests/performance.html`)
                    return true;
                
                throw new Error('URL did not load on WPEWebkit');
            }
        },
        'step8' : {
            'description'   : 'Repeat get FPS a couple of times to get samples',
            'goto'          : 'step7',
            'repeat'        : 20,
        }
	}
}
