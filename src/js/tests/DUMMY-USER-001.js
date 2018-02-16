/** 
 * WPETestFramework dummy test task
 */
/*jslint esnext: true*/

module.exports = {
    'title'         : 'Dummy Test',
    'description'   : 'Testing user input',
    'extends'       : 'DUMMY-SIMPLE-001.js',
    'steps'         : {
        'dummystep1' : {
            'description'   : 'User input step',
            'timeout'       : 360, //seconds
            'user'          : 'Please make test succeed or fail.',
            'assert'        : true
        }
    }
};
