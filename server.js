var cluster = require('cluster'),
    conf    = require('./conf.json');

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
		if(code && MaxTry){
			MaxTry--;
			console.log('Restarting Worker');
			setTimeout(cluster.fork, ( conf.retryWait || 60 ) * 1000);
		}
	});
}else{
	var fs      = require('fs'),
	    tls     = require('tls'),
	    net     = require('net'),
	    crypto  = require('crypto');

	var noOp = function(){};
	var certCache = {};
	var getCert = function(domain){
		var key, crt, ca;
		if( !conf.site[domain] )	throw new Error('Domain Not Set Exception: Domain: ' + domain);

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
					ca = fs.readFileSync(conf.certPath + '/' + domain + '/.ca');
				}catch(e){}
			}
		}
		if(!key || !crt){
			if(domain != conf.defaultDomain){
				console.log(
					"Cert Not Found: \n"
					+ "\tDomain: " + domain + "\n"
					+ "\tPath:\n"
					+ "\t\t" + (!!conf.site[domain].keyPath ? conf.site[domain].keyPath + ' or ' : '' ) + conf.certPath + '/' + domain + '/.key'
					+ "\t\t" + (!!conf.site[domain].crtPath ? conf.site[domain].crtPath + ' or ' : '' ) + conf.certPath + '/' + domain + '/.crt'
				);
				return getCert(conf.defaultDomain);
			}else{
				throw new Error(
					'Default Cert Not Found Exception: ' + "\n"
					+ (!key ? (!!conf.site[domain].keyPath ? conf.site[domain].keyPath + ' or ' : '' ) + conf.certPath + '/' + domain + '/.key' + "\n" : '')
					+ (!crt ? (!!conf.site[domain].crtPath ? conf.site[domain].crtPath + ' or ' : '' ) + conf.certPath + '/' + domain + '/.crt' + "\n" : '')
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
		options.secureProtocol = 'SSLv23_method';

		var constants = require('constants');

		options.secureOptions = 0;
		for(var i=0; i<conf.sslSecureOptions.length; i++){
			if(!!conf.sslSecureOptions[i].match(/^SSL_OP_/)){
				options.secureOptions |= constants[conf.sslSecureOptions[i]];
			}
		}
		return options;
	})();

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
	}).on('error', function(err){console.error('HTTPS server error:',err)}).listen(conf.httpsPort);

	net.createServer(function(socket){
		socket.on('data', function(msg){
			msg = msg.toString().split('\r\n');
			var host, path = msg[0].split(' ')[1], proto=msg[0].split(' ')[2];
			for(var i=1; i< msg.length && !host; i++){
				var key_val = msg[i].split(':');
				if (key_val[0].search(/^host/i) === 0){
					host = key_val[1].replace(" ", "");
				}
			}
			socket.end(
				proto + ' 301' + "\r\n"
				+ 'Location: https://' + host + path + "\r\n"
				+ "\r\n"
			);
		});
		socket.on('end', noOp);
		socket.on('error', noOp);

	}).on('error', function(err){console.error('HTTP server error:',err)}).listen(conf.httpPort);
}
