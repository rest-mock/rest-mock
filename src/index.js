RESTMock = function(){}

// If we're on a node env, we include the dependecies. Otherwise, they should be global.
if( exports ){
    var _ = require('underscore');
}

RESTMock.prototype.init = function(data){
    var self = this;
    self.data = data;

    // utility function form underscore
    function compact(array){
        var compacted = [];

        array.forEach(function(val){
            if( val ){
                compacted.push(val);
            }
        });

        return compacted;
    }

    function convertToRegexp(string){
        var matches = string.match(/^\/(.+)\/([a-z]+)?$/i);
        var regexp = '', flags = '';

        if( matches ){
            regexp = matches[1];
            flags = matches && matches[2] || '';
        }

        return new RegExp(regexp, flags);
    }

    function matchServicePath(service, value){
        var pattern = service.path;
        var patternParams = service.params;

        if( pattern === value ){
            return true;
        }
        
        // It we dont have at least one colon in the value, it means that it's
        // a path without params, so a match will not exists. Thus, we return false now
        if( pattern.indexOf(':') === -1 ){
            return false;
        }

        // If we do have a colon, we need to figure out whether or not the path matchs the pattern
        // colors/orange
        // colors/:colorId
        
        /*
            We'll break the pattern and the value in segments, delimited by slashes.
            If the pattern segment doesn't start with a :, we'll try an exact match
            If the pattern segment does start with a :, we'll check what kind of value we're expecting (string, number, regexp)
            and try to match it.
            If everything matches, we found our service
         */
        
        var patternSegments = compact(pattern.split('/'));
        var valueSegments = compact(value.split('/'));

        if( patternSegments.length !== valueSegments.length ){
            return false;
        }

        var matching = true;
        patternSegments.forEach(function(patternSegment, index){
            if( !matching ){ return; }
            var valueSegment = valueSegments[index];

            // If the pattern segment doesn't start with a colon (it's a explicit value) and doesn't match the value segment
            // the paths are different
            if( patternSegment.indexOf(":") === -1 &&  patternSegment !== valueSegment  ){
                matching = false;
                return;
            }

            if( patternSegment.indexOf(":") === -1 ){
                // if the pattern doesn't start with a colon we don't need to do more checking
                // in this iteration.
                return;
            }

            //TODO: Hanle the case then the pattern type is not specifid
            var patternType = _.findWhere(patternParams, {type: patternSegment.replace(':', '')}).type;
            var patternRegexp;
            switch(patternType){
                case 'numeric':
                    patternRegexp = /^\d+$/;
                    break;
                case 'letter':
                    patternRegexp = /^[a-zA-Z]+$/;
                    break;
                case 'alpha':
                    patternRegexp = /^[a-zA-Z0-9]+$/;
                    break;
                default: 
                    patternRegexp = convertToRegexp(patternType);
                    break;
            }

            matching = !!valueSegment.match( patternRegexp );

        });

        return matching;
    }

    function replacePathParams(path, params){
        var replaced = path;
        params.forEach(function(param){
            replaced = replaced.replace(':'+param.key, param.value);
        });

        return replaced;
    }

    // function getServiceBy(field, value){
    //     var service;
    //     self.data.services.forEach(function(_service){
    //         if( service ){ return; }
    //         if( matchService( _service, field, value ) ){
    //             service = _service;
    //         }
    //     });

    //     if(!service){
    //         //TODO: Handle error
    //     }

    //     return service;
    // };

    function getServiceById(serviceId){
        var service;
        self.data.services.forEach(function(_service){
            if( service ){ return; }
            if( _service.id === serviceId ){
                service = _service;
            }
        });

        if(!service){
            //TODO: Handle error
        }

        return service;
    }

    function getAllServices(){
        return self.data.services;
    }

    function getServiceByPath(servicePath){
        var service;
        self.data.services.forEach(function(_service){
            if( service ){ return; }
            if( matchServicePath( _service, servicePath ) ){
                service = _service;
            }
        });

        if(!service){
            //TODO: Handle error
        }

        return service;
    }

    function getAllResponses(service, method){
        if( service.responses[method] ){
            return service.responses[method]
        }

        //TODO: Handle error
    }

    function getResponse(params){
        var service = getServiceByPath(params.path);
        var responses = getAllResponses(service, params.method);
        var response;

        if( service.mode === 'static' ){
            responses.forEach(function(_response){
                if( response ){ return; }
                if( _response.active ){
                    response = JSON.parse(_response.response);
                }
            });

            if( response ){
                return response;
            }

            //TODO: Handle error
        }

        if( service.mode === 'dynamic' ){

            responses.forEach(function(_response){
                if( response ){ return; }
                var generatedPath = replacePathParams(service.path, _response.params);

                //TODO: Normalice paths. We need to make sure we have or haven't trailing slashes in both paths
                if( generatedPath === params.path ){
                    response = JSON.parse(_response.response);
                }
            });

            if( response ){
                return response;
            }

            //TODO: Handle error

        }
    }

    return {
        getAllServices: getAllServices,
        getServiceByPath: getServiceByPath,
        getServiceById: getServiceById,
        getAllResponses: getAllResponses,
        getResponse: getResponse
    };
}

// Make public as node module
if( exports ){
    exports.init = function(data){
        var mockey = new RESTMock;
        return mockey.init(data);
    };
}