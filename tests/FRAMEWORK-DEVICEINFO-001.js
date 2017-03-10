/**
 * WPETestFramework test
 */
/*jslint esnext: true*/

module.exports = {
    'title'         : 'Framework Device Info test',
    'description'   : 'Validates functionality of the Device Info plugin',
    'plugin'        : '', //place holder to store selected plugin value
    'steps'         : {
        'init0'  : {
            'description'   : 'Check if DeviceInfo Plugin is present',
            'test'          : getPlugin,
            'params'        : 'DeviceInfo',
            'validate'      : (resp) => {
                if (resp.status !== 400)
                    return true;

                NotApplicable('Build does not support DeviceInfo');
            }
        },
        'step1' : {
            'description'   : 'Stop DeviceInfo plugin',
            'timeout'       : 60, //seconds
            'test'          : stopPlugin,
            'params'        : 'DeviceInfo',
            'validate'      : httpResponseSimple,
        },
        'step2' : {
            'description'   : 'Check if DeviceInfo plugin is stopped',
            'sleep'         : 20,
            'timeout'       : 60,
            'test'          : getPluginState,
            'params'        : 'DeviceInfo',
            'assert'        : 'deactivated'
        },
        'step3' : {
            'description'   : 'Start DeviceInfo plugin',
            'timeout'       : 10, //seconds
            'test'          : startPlugin,
            'params'        : 'DeviceInfo',
            'validate'        : httpResponseSimple
        },
        'step4' : {
            'description'   : 'Check if DeviceInfo plugin is started',
            'sleep'         : 20,
            'timeout'       : 60,
            'test'          : getPluginState,
            'params'        : 'DeviceInfo',
            'assert'        : 'activated'
        },
        'step5' : {
            'description'   : 'Get DeviceInfo data',
            'timeout'       : 10, //seconds
            'test'          : getPlugin,
            'params'        : 'DeviceInfo',
            'validate'      : (response) => {
                var d = JSON.parse(response.body);

                if (d.addresses !== undefined && d.addresses.length !== 0) {
                    for (var i=0; i<d.addresses.length; i++) {
                        var interface = d.addresses[i];

                        if (interface.name === undefined ||
                            interface.mac  === undefined)
                            throw new Error('Error reading interface name or mac on interface idx: ' + i);
                    }
                } else {
                    throw new Error('Error reading addresses object from DeviceInfo');
                }

                if (d.systeminfo === undefined               ||
                    d.systeminfo.version === undefined       ||
                    d.systeminfo.uptime === undefined        ||
                    d.systeminfo.totalram === undefined      ||
                    d.systeminfo.freeram === undefined       ||
                    d.systeminfo.devicename === undefined    ||
                    d.systeminfo.cpuload === undefined       ||
                    d.systeminfo.totalgpuram === undefined   ||
                    d.systeminfo.freegpuram === undefined    ||
                    d.systeminfo.serialnumber === undefined  ||
                    d.systeminfo.deviceid === undefined      ||
                    d.systeminfo.time === undefined
                 )
                    throw new Error('Error reading systeminfo object from DeviceInfo');
                else
                    return true;
            }
        },
    },
    'cleanup'       : restartFramework
};
