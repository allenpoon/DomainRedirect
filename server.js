var fs      = require('fs'),
    tls     = require('tls'),
    net     = require('net'),
    crypto  = require('crypto'),
    cluster = require('cluster'),
    conf    = require('./conf.json');

var noOp = function(){};
var certCache = {};
var getCert = function(domain){
	var key, crt, ca;
	if(conf.site[domain]){
		if(conf.site[domain].keyPath){
			try{
				key = fs.readFileSync(conf.site[domain].keyPath);
			}catch(e){}
		}
		if(conf.site[domain].crtPath){
			try{
				crt = fs.readFileSync(conf.site[domain].crtPath);
			}catch(e){}
		}
		if(conf.site[domain].caPath){
			try{
				ca = fs.readFileSync(conf.site[domain].caPath);
			}catch(e){}
		}
	}
	if(conf.certPath){
		if(!key){
			try{
				key = fs.readFileSync(conf.certPath + '/' + domain + '/.key');
			}catch(e){}
		}
		if(!crt){
			try{
				crt = fs.readFileSync(conf.certPath + '/' + domain + '/.crt');
			}catch(e){}
		}
		if(!ca){
			try{
				ca = fa.readFileSync(conf.certPath + '/' + domain + '/.ca');
			}catch(e){}
		}
	}
	if(!key || !crt){
		if(domain != conf.defaultDomain){
			console.log(
				"Cert Not Found: \n"
				+ "\tDomain: " + domain + "\n"
				+ "\tPath:\n"
				+ "\t\t" + conf.site[domain].keyPath + ' or ' + conf.certPath + '/' + domain + '/.key'
				+ "\t\t" + conf.site[domain].crtPath + ' or ' + conf.certPath + '/' + domain + '/.crt'
			);
			return getCert(conf.defaultDomain);
		}else{
			throw new Error(
				'Default Cert Not Found Exception: ' + "\n"
				+ (!key ? conf.site[domain].keyPath + ' or ' + conf.certPath + '/' + domain + '/.key' + "\n" : '')
				+ (!crt ? conf.site[domain].crtPath + ' or ' + conf.certPath + '/' + domain + '/.crt' + "\n" : '')
			);
		}
	}
	return {
		key : key,
		cert : crt,
		ca : ca
	};
}
var getCertContext = function(domain){
	if(!certCache[domain]) certCache[domain] = crypto.createCredentials(getCert(domain)).context;
	return certCache[domain];
}

var httpsServerOptions = (function(){
	var options = getCert(conf.defaultDomain);
	options.SNICallback = getCertContext;
	return options;
})();

if(cluster.isMaster){
	var MaxTry = conf.maxTryStart || 100;
	console.log('Master on (PID='+process.pid+')');
	for(var i=0; i<require('os').cpus().length; i++){
		cluster.fork();
	}
	cluster.on('listening', function(worker, address){
		console.log('Worker (PID='+worker.process.pid+') listening at (Address='+address.address+':'+address.port+')');
	});
	cluster.on('exit', function(worker, code, signal){
		console.log('Worker (PID='+worker.process.pid+') Closed' + (code ? ' Unexpectedly (Code='+code+')':''));
		if(code && maxTryStart){
			maxTryStart--;
			console.log('Restarting Worker');
			setTimeout(cluster.fork, ( conf.retryWait || 60 ) * 1000);
		}
	});
}else{
	tls.createServer(httpsServerOptions, function(socket){
		if(conf.site[socket.servername]){
			var remote = (conf.site[socket.servername].https ? tls : net).connect(
				{
					port: conf.site[socket.servername].port,
					host: conf.site[socket.servername].host,
					rejectUnauthorized: false
				},
				function(){
					remote.pipe(socket).pipe(remote);
				}
			);
			socket.on('end'  , noOp);
			socket.on('error', noOp);
			remote.on('error', noOp);
		}else{
			socket.end();
		}
	}).on('error', function(err){console.error('HTTPS server error:',err)}).listen(443);
}
