/**
 * WPETestFramework test base class
 */

/** Device info plugin provides device specific information, such as cpu usage and serial numbers */
class Base {
    constructor() {
        this.host = null;

        this.dummy = this.dummy.bind(this);
        this.sleep = this.sleep.bind(this);
        this.get = this.get.bind(this);
        this.http = this.http.bind(this);
        this.httpResponseSimple = this.httpResponseSimple.bind(this);
        this.httpResponseBody = this.httpResponseBody.bind(this);
        this.jsonParse = this.jsonParse.bind(this);
        this.checkIfObject = this.checkIfObject.bind(this);
        this.startHttpServer = this.startHttpServer.bind(this);
        this.startFileServer = this.startFileServer.bind(this);
        this.matchIpRange = this.matchIpRange.bind(this);
    }

    dummy(x, cb) {
        this.cb(x);
    }

    sleep(x, cb) {
        this.setTimeout(cb, x * 1000);
    }


    get(url, cb) {
        this.http({
            'url' : url,
            'method' : 'GET',
            'body' : null
        }, cb);
    }

    http(options, cb) {
        var url = options.url;
        var method = options.method;
        var body = options.body;

        var xmlHttp = new XMLHttpRequest();
        //console.log(method + ' ' + URL + (body!==null ? '\n' + body : ''));

        // iterate over the headers provided and set them individually. Unfortunately node accepted an object, xmlhttp request individual sets
        if (options.headers) {
            var headerList = Object.keys(options.headers);
            for (var i=0; i<headerList.length; i++) {
                xmlHttp.setRequestHeader(headerList[i], options.headers[ headerList[i] ]);
            }
        }

        xmlHttp.open(method, url, true);
        if (cb) {
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    if (xmlHttp.status >= 200 && xmlHttp.status <= 299) {
                        //console.log('RESP: ', resp);
                        cb({ 'headers' : xmlHttp.getAllResponseHeaders(), 'body' : xmlHttp.responseText, 'status' : xmlHttp.status, 'statusMessage' : xmlHttp.statusText });
                    } else if (xmlHttp.status >= 300) {
                        //console.log('ERR: ' + xmlHttp.responseText);
                        cb({ 'error' : `HTTP Status ${xmlHttp.status}, with message: ${xmlHttp.statusMessage}` });
                    } else if (xmlHttp.status === 0) {
                        //console.log('ERR: connection interrupted');
                        cb({ 'error' : 'Connection interrupted' });
                    }
                }
            };

            xmlHttp.ontimeout = function () {
                cb({ 'error' : 'Connection timed out'});
            };
        }
        if (body !== null)
            xmlHttp.send(body);
        else
            xmlHttp.send();

    }

    httpResponseSimple(x) {
        if (x.error) throw new Error(x.error);
        if (x.status !== undefined && parseInt(x.status) < 400)
            return true;
        else
            throw new Error('Framework returned with a HTTP code > 400');
    }

    httpResponseBody(x) {
        if (x.error) throw new Error(x.error);
        if (x.status !== undefined && parseInt(x.status) < 400 && x.body !== undefined)
            return true;
        else
            throw new Error('Framework returned with a HTTP code > 400 or no body (yet expected)');
    }

    jsonParse(x, cb) {
        try {
            var y = JSON.parse(x);
            cb(y);
        } catch (e) {
            throw new Error('Error parsing json at jsonParse step');
        }
    }

    checkIfObject(x) {
        if (typeof x === 'object')
            return true;
        else
            throw new Error(`${x} is not an Object`);
    }

    loadTest(url, cb) {
        get(url, (resp) => {
            if (resp.error) {
                cb(resp);
                return;
            }

            var test;
            try {
                test = eval(resp.body);
            } catch(e) {
                cb({ 'error' : e.message });
                return;
            }

            cb({ 'test' :  test });
        });
    }

    startHttpServer(requestFunction, cb) {
        throw Error('This is no logner supported in the web version, please point your test to the webserver instead');
    }

    startFileServer(cb) {
        throw Error('This is no longer supported in the web version, please point your test to the webserver instead');
    }

    matchIpRange(ip, cb) {
        throw Error('This is no longer supported in the web version, local server support is disabled. Please update your test');
    }
}

window.plugins = window.plugins || {};
window.plugins.Base = Base;
