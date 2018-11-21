/** 
 * WPETestFramework dummy test task
 */

test = {
    'title'         : 'Dummy Test',
    'description'   : 'Testing inheritance, changing the first step',
    'extends'       : 'DUMMY-SIMPLE-001',
    'steps'         : {
        'dummystep1' : {
            'description'   : 'This test is changed by extending it and overwriting it',
            'timeout'       : 10, //seconds
            'test'          : dummy,
            'params'        : 2,
            'assert'        : 2            
        }
    }
};
